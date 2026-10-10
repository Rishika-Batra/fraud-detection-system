/**
 * scoringConfig.js
 * Centralized configuration for all tunable risk thresholds.
 * Thresholds should never be hardcoded in rules to allow easy tuning.
 *
 * NOTE: The final auto-flag threshold is TBD-1 in the SRS.
 * This system only evaluates risk; it does not automatically flag cases yet.
 */

module.exports = {
  HIGH_AMOUNT: 50000,
  VERY_HIGH_AMOUNT: 200000,
  ODD_HOURS: {
    start: 1, // 1 AM
    end: 5    // 5 AM
  },
  VELOCITY_WINDOW_MINUTES: 10,
  VELOCITY_LIMIT: 5,
  REGION_CHANGE_WINDOW_MINUTES: 60,
  LEVELS: {
    low: { max: 39 }, // below 40
    medium: { max: 69 }, // below 70
    // high is 70 or above
  }
};
