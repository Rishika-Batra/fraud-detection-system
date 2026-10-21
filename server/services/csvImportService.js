/**
 * csvImportService.js
 * Service for parsing, validating, deduplicating, and importing transactions from CSV files.
 */

const { parse } = require('csv-parse/sync');
const { Op } = require('sequelize');
const { Transaction } = require('../models');
const { validateTransaction } = require('./transactionValidator');
const transactionService = require('./transactionService');
const { logAction, ACTIONS } = require('./auditLogger');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;

// Canonical fields required for each transaction
const REQUIRED_FIELDS = [
  'account_id',
  'amount',
  'currency',
  'merchant',
  'transaction_type',
  'region',
  'timestamp'
];

// Smart header alias dictionary
const FIELD_ALIASES = {
  account_id: ['account', 'accountid', 'acct', 'accountnumber', 'customerid'],
  amount: ['amt', 'value', 'transactionamount', 'txnamount'],
  currency: ['ccy', 'currencycode'],
  merchant: ['merchantname', 'vendor', 'payee'],
  transaction_type: ['type', 'txntype', 'transactiontype'],
  region: ['country', 'location', 'area'],
  timestamp: ['date', 'datetime', 'time', 'transactiondate', 'txndate', 'createdat']
};

/**
 * Normalizes header string: lowercase, remove non-alphanumeric characters.
 */
function normalizeHeader(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Validates timestamp format. Must be ISO 8601 or 'YYYY-MM-DD HH:mm:ss'.
 */
function isAllowedTimestampFormat(str) {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  // ISO 8601 pattern: e.g. 2026-09-15, 2026-09-15T14:30:00, 2026-09-15T14:30:00Z, 2026-09-15T14:30:00.000Z, 2026-09-15T14:30:00+05:30
  const isoPattern = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
  // YYYY-MM-DD HH:mm:ss pattern: e.g. 2026-09-15 14:30:00 (with optional .SSS)
  const dateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

  return isoPattern.test(trimmed) || dateTimePattern.test(trimmed);
}

/**
 * Normalizes a timestamp string to UTC:
 * - Date-only 'YYYY-MM-DD' becomes 'YYYY-MM-DDT00:00:00.000Z' (UTC midnight)
 * - 'YYYY-MM-DD HH:mm:ss' (with space) becomes 'YYYY-MM-DDTHH:mm:ssZ'
 * - 'YYYY-MM-DDTHH:mm' or 'YYYY-MM-DDTHH:mm:ss' (ISO with T and no offset) becomes '...Z'
 * - Values with existing 'Z' or timezone offset (+HH:mm, -HH:mm) remain unchanged.
 */
function normalizeTimestampToUtc(str) {
  if (typeof str !== 'string') return str;
  const trimmed = str.trim();

  // 1. Date-only: YYYY-MM-DD -> UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  // 2. Space separated: YYYY-MM-DD HH:mm:ss(.SSS)? with no offset
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
    return trimmed.replace(' ', 'T') + 'Z';
  }

  // 3. ISO with T and no offset: YYYY-MM-DDTHH:mm(:ss)?(.SSS)?
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(trimmed)) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00Z`;
    }
    return `${trimmed}Z`;
  }

  // 4. Values that already have Z or an offset (+HH:mm / -HH:mm) remain unchanged
  return trimmed;
}

/**
 * Matches CSV headers to canonical fields using explicit mapping and smart aliases.
 */
function matchHeaders(rawHeaders, customMapping = {}) {
  const matched = {};
  const ignored = [];
  const fieldToColIdx = {};

  // Normalize custom mapping keys and values
  const normalizedCustomMap = {};
  if (customMapping && typeof customMapping === 'object') {
    for (const [key, targetField] of Object.entries(customMapping)) {
      if (REQUIRED_FIELDS.includes(targetField)) {
        normalizedCustomMap[key.trim()] = targetField;
        normalizedCustomMap[normalizeHeader(key)] = targetField;
      }
    }
  }

  rawHeaders.forEach((rawHeader, colIdx) => {
    const trimmed = String(rawHeader || '').trim();
    const normalized = normalizeHeader(trimmed);

    // 1. Check custom mapping override
    let canonical = normalizedCustomMap[trimmed] || normalizedCustomMap[normalized];

    // 2. Check exact canonical match
    if (!canonical && REQUIRED_FIELDS.includes(normalized)) {
      canonical = normalized;
    }

    // 3. Check alias list
    if (!canonical) {
      for (const field of REQUIRED_FIELDS) {
        if (field === normalized || (FIELD_ALIASES[field] && FIELD_ALIASES[field].includes(normalized))) {
          canonical = field;
          break;
        }
      }
    }

    if (canonical && REQUIRED_FIELDS.includes(canonical)) {
      matched[trimmed] = canonical;
      // If not already mapped to an earlier column, record column index
      if (fieldToColIdx[canonical] === undefined) {
        fieldToColIdx[canonical] = colIdx;
      }
    } else {
      ignored.push(trimmed);
    }
  });

  const missing = REQUIRED_FIELDS.filter(field => fieldToColIdx[field] === undefined);

  return {
    columns: { matched, ignored, missing },
    fieldToColIdx,
    missing
  };
}

/**
 * Processes a CSV file buffer.
 *
 * @param {Buffer} buffer - Raw file buffer from multipart upload.
 * @param {Object} options - { mapping: Object|string, dry_run: boolean, fileName: string }
 * @param {number} actorId - The ID of the authenticated user.
 */
async function processCsvBuffer(buffer, options = {}, actorId) {
  // 1. Check buffer presence and size
  if (!buffer || buffer.length === 0) {
    throw { status: 400, message: "CSV file is empty" };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw { status: 413, message: "File size exceeds maximum limit of 5 MB" };
  }

  const rawText = buffer.toString('utf8');
  if (rawText.trim().length === 0) {
    throw { status: 400, message: "CSV file is empty" };
  }

  // 2. Parse CSV with csv-parse
  let recordsWithInfo;
  try {
    recordsWithInfo = parse(buffer, {
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      info: true
    });
  } catch (err) {
    throw { status: 400, message: `Failed to parse CSV file: ${err.message}` };
  }

  if (!recordsWithInfo || recordsWithInfo.length === 0) {
    throw { status: 400, message: "CSV file is empty" };
  }

  if (recordsWithInfo.length === 1) {
    throw { status: 400, message: "CSV file contains no data rows" };
  }

  const dataRowCount = recordsWithInfo.length - 1;
  if (dataRowCount > MAX_ROWS) {
    throw { status: 400, message: `CSV file exceeds maximum limit of ${MAX_ROWS} rows` };
  }

  // 3. Header matching & column report
  const rawHeaders = recordsWithInfo[0].record;
  let customMapping = options.mapping || {};
  if (typeof customMapping === 'string') {
    try {
      customMapping = JSON.parse(customMapping);
    } catch (e) {
      throw { status: 400, message: "Invalid mapping JSON provided" };
    }
  }

  const { columns, fieldToColIdx, missing } = matchHeaders(rawHeaders, customMapping);

  if (missing.length > 0) {
    throw {
      status: 400,
      message: `Missing required column(s): ${missing.join(', ')}`,
      columns
    };
  }

  // 4. Per-row validation & preparation
  const rejected = [];
  const candidateRows = []; // { line, data, key }
  const uniqueAccountIds = new Set();

  for (let r = 1; r < recordsWithInfo.length; r++) {
    const item = recordsWithInfo[r];
    const row = item.record;
    const line = item.info ? item.info.lines : (r + 1);

    // Extract values by canonical field index
    const rawAccountId = row[fieldToColIdx.account_id];
    const rawAmount = row[fieldToColIdx.amount];
    const rawCurrency = row[fieldToColIdx.currency];
    const rawMerchant = row[fieldToColIdx.merchant];
    const rawType = row[fieldToColIdx.transaction_type];
    const rawRegion = row[fieldToColIdx.region];
    const rawTimestamp = row[fieldToColIdx.timestamp];

    const account_id = typeof rawAccountId === 'string' ? rawAccountId.trim() : (rawAccountId ?? '');
    const merchant = typeof rawMerchant === 'string' ? rawMerchant.trim() : (rawMerchant ?? '');
    const region = typeof rawRegion === 'string' ? rawRegion.trim() : (rawRegion ?? '');

    // Amount: strip thousands separators (commas)
    const cleanAmountStr = typeof rawAmount === 'string' ? rawAmount.replace(/,/g, '').trim() : rawAmount;
    const amount = (cleanAmountStr === '' || cleanAmountStr === null || cleanAmountStr === undefined)
      ? NaN
      : Number(cleanAmountStr);

    // Currency: uppercase
    const currency = typeof rawCurrency === 'string' ? rawCurrency.trim().toUpperCase() : '';

    // Transaction type: lowercase
    const transaction_type = typeof rawType === 'string' ? rawType.trim().toLowerCase() : '';

    // Timestamp: check allowed format first
    const timestampStr = typeof rawTimestamp === 'string' ? rawTimestamp.trim() : '';
    const rowErrors = [];

    let normalizedTimestamp = timestampStr;
    if (!timestampStr) {
      rowErrors.push("timestamp is required");
    } else if (!isAllowedTimestampFormat(timestampStr)) {
      rowErrors.push("timestamp format is ambiguous (must be ISO 8601 or YYYY-MM-DD HH:mm:ss)");
    } else {
      normalizedTimestamp = normalizeTimestampToUtc(timestampStr);
    }

    const txCandidate = {
      account_id,
      amount,
      currency,
      merchant,
      transaction_type,
      region,
      timestamp: normalizedTimestamp
    };

    // Run existing validateTransaction
    const valErrors = validateTransaction(txCandidate);
    for (const err of valErrors) {
      // Avoid duplicate timestamp error if we already flagged format ambiguity
      if (rowErrors.length > 0 && err === "timestamp must be a valid date") continue;
      rowErrors.push(err);
    }

    if (rowErrors.length > 0) {
      rejected.push({ line, errors: rowErrors });
    } else {
      // Normalise timestamp into standard millisecond comparison for duplicate check
      const timeMs = new Date(normalizedTimestamp).getTime();
      const amtFixed = Number(amount).toFixed(2);
      const compositeKey = `${account_id}|${amtFixed}|${currency}|${merchant}|${timeMs}`;

      candidateRows.push({
        line,
        data: txCandidate,
        key: compositeKey
      });

      uniqueAccountIds.add(account_id);
    }
  }

  // 5. Duplicate Detection
  // Check against DB for existing transactions for the accounts in this file
  const existingInDbSet = new Set();
  if (uniqueAccountIds.size > 0) {
    const accountArray = Array.from(uniqueAccountIds);
    // Batch account lookups in chunks to avoid SQLite parameter limit
    for (let i = 0; i < accountArray.length; i += 500) {
      const slice = accountArray.slice(i, i + 500);
      const existingTxs = await Transaction.findAll({
        where: {
          account_id: { [Op.in]: slice }
        },
        attributes: ['account_id', 'amount', 'currency', 'merchant', 'timestamp']
      });

      for (const tx of existingTxs) {
        const timeMs = new Date(tx.timestamp).getTime();
        const amtFixed = Number(tx.amount).toFixed(2);
        const k = `${tx.account_id}|${amtFixed}|${tx.currency}|${tx.merchant}|${timeMs}`;
        existingInDbSet.add(k);
      }
    }
  }

  const seenInFile = new Set();
  const validNonDuplicateRows = [];
  let duplicateCount = 0;

  for (const item of candidateRows) {
    if (seenInFile.has(item.key) || existingInDbSet.has(item.key)) {
      // Skip row as duplicate (reported as duplicate, not an error)
      duplicateCount++;
    } else {
      seenInFile.add(item.key);
      validNonDuplicateRows.push({ line: item.line, data: item.data });
    }
  }

  const isDryRun = options.dry_run === true || options.dry_run === 'true';

  // 6. Dry Run Mode
  if (isDryRun) {
    return {
      dry_run: true,
      upload_batch: null,
      total_rows: dataRowCount,
      valid_count: validNonDuplicateRows.length,
      saved_count: 0,
      rejected_count: rejected.length,
      duplicate_count: duplicateCount,
      columns,
      preview: validNonDuplicateRows.slice(0, 20).map(r => r.data),
      valid_rows: validNonDuplicateRows.slice(0, 20).map(r => r.data),
      rejected
    };
  }

  // 7. Real Mode
  const upload_batch = 'upload-' + Date.now();
  let savedCount = 0;

  if (validNonDuplicateRows.length > 0) {
    // Ingest in batches of 500 to respect ingestTransactions size limits
    for (let i = 0; i < validNonDuplicateRows.length; i += 500) {
      const chunk = validNonDuplicateRows.slice(i, i + 500);
      const batchPayload = chunk.map(c => ({
        ...c.data,
        source: 'uploaded',
        upload_batch
      }));

      try {
        const result = await transactionService.ingestTransactions(batchPayload, actorId);
        const savedNumber = result.isArray ? result.saved.length : (result.saved ? 1 : 0);
        savedCount += savedNumber;

        // If any rows were rejected by ingestTransactions, add them with their CSV line number
        if (result.rejected && result.rejected.length > 0) {
          for (const rej of result.rejected) {
            const originalLine = chunk[rej.index] ? chunk[rej.index].line : undefined;
            rejected.push({ line: originalLine, errors: rej.errors });
          }
        }
      } catch (ingestErr) {
        // If ALL items in the batch failed validation in ingestTransactions
        if (ingestErr.details && Array.isArray(ingestErr.details)) {
          for (const rej of ingestErr.details) {
            const originalLine = chunk[rej.index] ? chunk[rej.index].line : undefined;
            rejected.push({ line: originalLine, errors: rej.errors });
          }
        } else {
          throw ingestErr;
        }
      }
    }
  }

  // 8. Audit Logging
  await logAction({
    userId: actorId,
    action: ACTIONS.CSV_UPLOADED,
    entityType: 'Transaction',
    entityId: null,
    details: {
      fileName: options.fileName || 'upload.csv',
      upload_batch,
      saved_count: savedCount,
      rejected_count: rejected.length,
      duplicate_count: duplicateCount
    }
  });

  return {
    upload_batch,
    total_rows: dataRowCount,
    saved_count: savedCount,
    rejected_count: rejected.length,
    duplicate_count: duplicateCount,
    rejected,
    columns
  };
}

module.exports = {
  processCsvBuffer,
  matchHeaders,
  isAllowedTimestampFormat,
  normalizeTimestampToUtc,
  REQUIRED_FIELDS,
  FIELD_ALIASES,
  MAX_FILE_SIZE,
  MAX_ROWS
};
