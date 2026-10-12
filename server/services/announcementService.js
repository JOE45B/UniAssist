/** upcoming -> not yet published, active -> within the window, expired -> past expiry. */
function stateOf(a, now = new Date()) {
  if (new Date(a.publishDate) > now) return 'upcoming';
  if (new Date(a.expiryDate) <= now) return 'expired';
  return 'active';
}
const decorate = (a, now = new Date()) => ({ ...(a.toObject ? a.toObject() : a), state: stateOf(a, now) });

function stateFilter(state, now = new Date()) {
  if (state === 'active') return { publishDate: { $lte: now }, expiryDate: { $gt: now } };
  if (state === 'upcoming') return { publishDate: { $gt: now } };
  if (state === 'expired') return { expiryDate: { $lte: now } };
  return {};
}

module.exports = { stateOf, decorate, stateFilter };
