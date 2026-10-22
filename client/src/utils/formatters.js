/**
 * Formats a monetary amount using the appropriate currency symbol and locale grouping.
 * Uses Intl.NumberFormat with style 'currency'.
 *
 * - For INR, uses 'en-IN' locale to preserve Indian numbering system (e.g., ₹1,00,000.00).
 * - For other standard currencies (e.g., EUR, USD), formats with standard currency symbols (€, $).
 * - If the currency code is missing or not a valid 3-letter code, falls back to displaying
 *   the formatted number with the raw code text instead of crashing.
 *
 * @param {number|string} amount
 * @param {string} [currency]
 * @returns {string}
 */
export function formatMoney(amount, currency) {
  const num = Number(amount);
  const safeNum = isNaN(num) ? 0 : num;
  const rawCurrency = currency !== null && currency !== undefined ? String(currency).trim() : '';
  const upperCurrency = rawCurrency.toUpperCase();

  // If currency code is missing
  if (!rawCurrency) {
    return safeNum.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // If not a valid 3-letter code, fall back to showing number with raw code text
  if (!/^[A-Za-z]{3}$/.test(rawCurrency)) {
    const formattedNum = safeNum.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedNum} ${rawCurrency}`;
  }

  try {
    const locale = upperCurrency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: upperCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeNum);
  } catch {
    // If Intl.NumberFormat rejects the 3-letter code
    const formattedNum = safeNum.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedNum} ${rawCurrency}`;
  }
}
