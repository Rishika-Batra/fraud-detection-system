/**
 * transactionValidator.js
 * Contains the validation rules for incoming transactions.
 * This is kept separate to adhere to the Single Responsibility Principle,
 * making it easier to test and maintain validation logic without modifying the service.
 */

function validateTransaction(t) {
  const errors = [];

  // 1. Check for presence of required fields
  if (!t.account_id) errors.push("account_id is required");
  if (!t.merchant) errors.push("merchant is required");
  if (!t.region) errors.push("region is required");
  
  // 2. Validate amount (must be a number > 0)
  if (typeof t.amount !== 'number' || isNaN(t.amount) || t.amount <= 0) {
    errors.push("amount must be a number greater than 0");
  }

  // 3. Validate currency (must be a 3-letter uppercase code)
  if (typeof t.currency !== 'string' || !/^[A-Z]{3}$/.test(t.currency)) {
    errors.push("currency must be a 3-letter uppercase code");
  }

  // 4. Validate transaction_type against allowed ENUM values
  const validTypes = ['purchase', 'transfer', 'withdrawal', 'deposit'];
  if (!validTypes.includes(t.transaction_type)) {
    errors.push(`transaction_type must be one of: ${validTypes.join(', ')}`);
  }

  // 5. Validate timestamp (must be a valid date, not in the future)
  if (!t.timestamp) {
    errors.push("timestamp is required");
  } else {
    const date = new Date(t.timestamp);
    if (isNaN(date.getTime())) {
      errors.push("timestamp must be a valid date");
    } else if (date > new Date()) {
      errors.push("timestamp cannot be in the future");
    }
  }

  return errors;
}

module.exports = { validateTransaction };
