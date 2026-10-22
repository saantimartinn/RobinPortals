// Server-side booking config helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const DEFAULT_BOOKING_CONFIG = Object.freeze({
  availabilityTitle: 'RobinJr',
  maxDays: 14,
  slotMin: 60,
});

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value == null ? '' : value), 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function bookingConfig(env = process.env) {
  return {
    availabilityTitle: DEFAULT_BOOKING_CONFIG.availabilityTitle,
    maxDays: boundedInteger(env.BOOKING_MAX_DAYS, DEFAULT_BOOKING_CONFIG.maxDays, 1, 31),
    slotMin: DEFAULT_BOOKING_CONFIG.slotMin,
  };
}

function requestedDays(value, maxDays) {
  return boundedInteger(value, maxDays, 1, maxDays);
}

module.exports = { bookingConfig, boundedInteger, DEFAULT_BOOKING_CONFIG, requestedDays };
