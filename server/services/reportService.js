/**
 * reportService.js
 * Contains business logic for generating aggregated reports and handling exports.
 * 
 * Key concepts for viva:
 * - Aggregation: Computing summary metrics (like sums, averages, or counts) over a large set of rows 
 *   directly in the database using SQL (e.g. GROUP BY), rather than fetching all rows into memory and counting them in Node.js.
 *   This is crucial for performance.
 * - Heatmap: A data visualization technique that shows magnitude of a phenomenon as color in two dimensions.
 * - CSV Injection (Formula Injection): When a user inputs malicious formulas (like =CMD|' /C calc'!A0) that are safely 
 *   stored as text in the DB, but execute as code when opened in Excel. Mitigate by prefixing cells starting with =, +, -, or @.
 */

const { Transaction, Case, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const { logAction, ACTIONS } = require('./auditLogger');

// Helper to parse shared filters
function parseReportFilters(query) {
  const filters = {};
  const errors = [];

  if (query.from) {
    const d = new Date(query.from);
    if (isNaN(d.getTime())) errors.push("from must be a valid ISO date");
    else filters.from = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (isNaN(d.getTime())) errors.push("to must be a valid ISO date");
    else filters.to = d;
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    errors.push("from date cannot be later than to date");
  }

  if (query.region) filters.region = query.region;
  if (query.transaction_type) filters.transaction_type = query.transaction_type;
  if (query.risk_level) {
    const validLevels = ['low', 'medium', 'high'];
    if (!validLevels.includes(query.risk_level)) errors.push("risk_level must be one of: low, medium, high");
    else filters.risk_level = query.risk_level;
  }

  if (errors.length > 0) throw { status: 400, message: "Invalid query parameters", details: errors };
  return filters;
}

// Helper to build where clause for Transaction model
function buildWhereClause(filters) {
  const where = {};
  if (filters.from || filters.to) {
    where.timestamp = {};
    if (filters.from) where.timestamp[Op.gte] = filters.from;
    if (filters.to) where.timestamp[Op.lte] = filters.to;
  }
  if (filters.region) where.region = filters.region;
  if (filters.transaction_type) where.transaction_type = filters.transaction_type;
  if (filters.risk_level) where.risk_level = filters.risk_level;
  return where;
}

// GET /api/reports/summary
async function getSummary(query) {
  const filters = parseReportFilters(query);
  const where = buildWhereClause(filters);

  // Use raw queries/aggregates for efficiency
  const totalRes = await Transaction.findOne({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END")), 'flagged_transactions'],
      [sequelize.fn('AVG', sequelize.col('risk_score')), 'average_risk_score']
    ],
    raw: true
  });

  const riskLevelsRes = await Transaction.findAll({
    where,
    attributes: ['risk_level', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['risk_level'],
    raw: true
  });

  // For cases_by_status, we join Transaction with Case
  const casesRes = await Case.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Case.id')), 'count']],
    include: [{
      model: Transaction,
      as: 'transaction', 
      attributes: [],
      where
    }],
    group: ['status'],
    raw: true
  });

  const total_transactions = Number(totalRes.total_transactions) || 0;
  const total_amount = Number(totalRes.total_amount) || 0;
  const flagged_transactions = Number(totalRes.flagged_transactions) || 0;
  const average_risk_score = Number((Number(totalRes.average_risk_score) || 0).toFixed(2));
  
  const flagged_rate = total_transactions > 0 ? Number((flagged_transactions / total_transactions).toFixed(4)) : 0;

  const by_risk_level = { low: 0, medium: 0, high: 0 };
  riskLevelsRes.forEach(r => { if (r.risk_level) by_risk_level[r.risk_level] = Number(r.count); });

  const cases_by_status = { flagged: 0, investigating: 0, resolved: 0, escalated: 0, closed: 0 };
  casesRes.forEach(r => { if (r.status) cases_by_status[r.status] = Number(r.count); });

  return {
    total_transactions,
    total_amount,
    flagged_transactions,
    flagged_rate,
    by_risk_level,
    cases_by_status,
    average_risk_score
  };
}

// GET /api/reports/trends
async function getTrends(query) {
  if (query.interval && query.interval !== 'day' && query.interval !== 'week') {
    throw { status: 400, message: "Invalid query parameters", details: ["interval must be day or week"] };
  }
  const filters = parseReportFilters(query);
  const interval = query.interval === 'week' ? 'week' : 'day';
  const where = buildWhereClause(filters);
  
  let strftimeFormat = '%Y-%m-%d';
  if (interval === 'week') {
    strftimeFormat = '%Y-%W';
  }

  // SQLite specific strftime
  const periodCol = sequelize.fn('strftime', strftimeFormat, sequelize.col('timestamp'));

  const results = await Transaction.findAll({
    where,
    attributes: [
      [periodCol, 'period'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END")), 'flagged'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END")), 'high_risk'],
      [sequelize.fn('AVG', sequelize.col('risk_score')), 'average_risk_score']
    ],
    group: [periodCol],
    order: [[periodCol, 'ASC']],
    raw: true
  });

  const points = results.map(r => ({
    period: r.period,
    total: Number(r.total) || 0,
    flagged: Number(r.flagged) || 0,
    high_risk: Number(r.high_risk) || 0,
    average_risk_score: Number((Number(r.average_risk_score) || 0).toFixed(2))
  })).filter(r => r.period !== null); // SQLite might return null for period if DB is totally empty

  return { interval, points };
}

// GET /api/reports/heatmap
async function getHeatmap(query) {
  if (query.dimension && query.dimension !== 'region_by_type' && query.dimension !== 'hour_by_weekday') {
    throw { status: 400, message: "Invalid query parameters", details: ["dimension must be region_by_type or hour_by_weekday"] };
  }
  const filters = parseReportFilters(query);
  const dimension = query.dimension === 'hour_by_weekday' ? 'hour_by_weekday' : 'region_by_type';
  const where = buildWhereClause(filters);
  
  if (dimension === 'hour_by_weekday') {
    const weekdayCol = sequelize.fn('strftime', '%w', sequelize.col('timestamp'));
    const hourCol = sequelize.fn('strftime', '%H', sequelize.col('timestamp'));

    const results = await Transaction.findAll({
      where,
      attributes: [
        [weekdayCol, 'weekday'],
        [hourCol, 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('risk_score')), 'average_risk_score']
      ],
      group: [weekdayCol, hourCol],
      raw: true
    });

    const cells = results.map(r => ({
      weekday: Number(r.weekday),
      hour: Number(r.hour),
      count: Number(r.count),
      average_risk_score: Number((Number(r.average_risk_score) || 0).toFixed(2))
    })).filter(r => !isNaN(r.weekday));

    return { dimension, cells };
  } else {
    // region_by_type (default)
    const results = await Transaction.findAll({
      where,
      attributes: [
        'region',
        'transaction_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('risk_score')), 'average_risk_score']
      ],
      group: ['region', 'transaction_type'],
      raw: true
    });

    const cells = results.map(r => ({
      region: r.region || 'Unknown',
      transaction_type: r.transaction_type,
      count: Number(r.count),
      average_risk_score: Number((Number(r.average_risk_score) || 0).toFixed(2))
    }));

    return { dimension, cells };
  }
}

function escapeCsvValue(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // CSV Injection protection: prefix with quote if starts with dangerous char
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  // Escape quotes
  str = str.replace(/"/g, '""');
  // Wrap in quotes if it contains comma, newline, or quote
  if (/[",\n\r]/.test(str) || /^[=+\-@]/.test(str)) {
    return `"${str}"`;
  }
  return str;
}

// Generate the raw export data based on type (cases or fraud_summary)
async function getExportData(filters, type) {
  if (type === 'fraud_summary') {
    // Reuse the summary and trends logic (no duplicate logic!)
    const summary = await getSummary(filters);
    const trends = await getTrends(filters);
    return { summary, trends };
  } else {
    // type === 'cases'
    const where = buildWhereClause(parseReportFilters(filters));
    const limit = 5001; // fetch one extra to know if it's truncated
    const cases = await Case.findAll({
      include: [
        { 
          model: Transaction, as: 'transaction', 
          where, 
          attributes: ['amount', 'currency', 'region', 'transaction_type', 'risk_score', 'risk_level'] 
        },
        { model: User, as: 'assignee', attributes: ['username'] }
      ],
      order: [['created_at', 'DESC']],
      limit
    });
    
    const isTruncated = cases.length > 5000;
    const data = cases.slice(0, 5000).map(c => ({
      case_id: c.id,
      transaction_id: c.transaction_id,
      status: c.status,
      assigned_to_username: c.assignee ? c.assignee.username : '',
      amount: c.transaction.amount,
      currency: c.transaction.currency,
      region: c.transaction.region,
      transaction_type: c.transaction.transaction_type,
      risk_score: c.transaction.risk_score,
      risk_level: c.transaction.risk_level,
      created_at: c.created_at ? new Date(c.created_at).toISOString() : '',
      closed_at: c.closed_at ? new Date(c.closed_at).toISOString() : ''
    }));

    return { data, isTruncated };
  }
}

async function exportData(req, res) {
  const { format, type = 'cases' } = req.query;
  const actorId = req.user.id;

  if (!['csv', 'pdf'].includes(format)) {
    throw { status: 400, message: "Invalid query parameters", details: ["format must be csv or pdf"] };
  }
  if (!['cases', 'fraud_summary'].includes(type)) {
    throw { status: 400, message: "Invalid query parameters", details: ["type must be cases or fraud_summary"] };
  }

  const dataObj = await getExportData(req.query, type);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${type}-${dateStr}.${format}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    let csvRows = [];

    if (type === 'fraud_summary') {
      const { summary, trends } = dataObj;
      csvRows.push(['Metric', 'Value']);
      csvRows.push(['Total Transactions', summary.total_transactions]);
      csvRows.push(['Total Amount', summary.total_amount]);
      csvRows.push(['Flagged Transactions', summary.flagged_transactions]);
      csvRows.push(['Flagged Rate', summary.flagged_rate]);
      csvRows.push(['Average Risk Score', summary.average_risk_score]);
      csvRows.push([]);
      csvRows.push(['Trend Period', 'Total', 'Flagged', 'High Risk', 'Average Risk Score']);
      for (const pt of trends.points) {
        csvRows.push([pt.period, pt.total, pt.flagged, pt.high_risk, pt.average_risk_score]);
      }
    } else {
      const { data, isTruncated } = dataObj;
      const headers = ['case_id', 'transaction_id', 'status', 'assigned_to_username', 'amount', 'currency', 'region', 'transaction_type', 'risk_score', 'risk_level', 'created_at', 'closed_at'];
      csvRows.push(headers);
      for (const row of data) {
        csvRows.push(headers.map(h => row[h]));
      }
      if (isTruncated) csvRows.push(['# truncated']);
    }

    const csvString = csvRows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
    res.send(csvString);

  } else if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    const doc = new PDFDocument({ margin: 30 });
    doc.pipe(res);

    doc.fontSize(20).text(`Export: ${type.toUpperCase()}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown();
    
    // Hide empty filter object
    const cleanFilters = parseReportFilters(req.query);
    doc.fontSize(12).text(`Filters: ${Object.keys(cleanFilters).length ? JSON.stringify(cleanFilters) : 'None'}`);
    doc.moveDown();

    if (type === 'fraud_summary') {
      const { summary, trends } = dataObj;
      doc.fontSize(16).text('Summary Metrics');
      doc.fontSize(12).text(`Total Transactions: ${summary.total_transactions}`);
      doc.text(`Total Amount: INR ${Number(summary.total_amount).toLocaleString('en-IN')}`);
      doc.text(`Flagged Rate: ${(summary.flagged_rate * 100).toFixed(2)}%`);
      doc.text(`Average Risk Score: ${summary.average_risk_score}`);
      doc.moveDown();

      doc.text(`By Risk Level: Low (${summary.by_risk_level.low}), Medium (${summary.by_risk_level.medium}), High (${summary.by_risk_level.high})`);
      doc.text(`Cases by Status: Flagged (${summary.cases_by_status.flagged}), Inv (${summary.cases_by_status.investigating}), Res (${summary.cases_by_status.resolved}), Esc (${summary.cases_by_status.escalated}), Closed (${summary.cases_by_status.closed})`);
      doc.moveDown();
      
      doc.fontSize(16).text('Trends (Daily/Weekly)');
      trends.points.forEach(pt => {
        doc.fontSize(10).text(`${pt.period} | Total: ${pt.total} | Flagged: ${pt.flagged} | High Risk: ${pt.high_risk} | Avg Risk: ${pt.average_risk_score}`, { width: 500 });
      });

    } else {
      const { data, isTruncated } = dataObj;
      if (isTruncated) {
        doc.fillColor('red').text('WARNING: Results truncated to 5000 rows.', { align: 'center' });
        doc.fillColor('black').moveDown();
      }
      
      data.forEach(c => {
        if (doc.y > doc.page.height - 100) doc.addPage();
        const line = `Case ${c.case_id} (Tx ${c.transaction_id}) | Status: ${c.status} | Assgn: ${c.assigned_to_username} | Amt: ${c.amount} ${c.currency} | Risk: ${c.risk_score} (${c.risk_level}) | Type: ${c.transaction_type} | Region: ${c.region}`;
        doc.fontSize(10).text(line, { width: 500 });
        doc.moveDown(0.5);
      });
    }
    doc.end();
  }

  // Auditing
  const rowCount = (type === 'cases') ? dataObj.data.length : 1;
  await logAction({
    userId: actorId,
    action: ACTIONS.REPORT_EXPORTED,
    entityType: 'Report',
    details: { type, format, row_count: rowCount }
  });
}

module.exports = { getSummary, getTrends, getHeatmap, exportData };
