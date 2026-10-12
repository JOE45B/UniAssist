// One consistent date/time representation for the whole API:
//   calendar dates  -> "YYYY-MM-DD" strings
//   times of day    -> "HH:mm" strings (24h), compared as minutes since midnight
// "Today" and "now" are evaluated in APP_TIMEZONE so results do not depend on
// where the server is hosted.
const ApiError = require('./ApiError');

const TZ = () => process.env.APP_TIMEZONE || 'Asia/Manila';
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_MINUTES = 15;

const isValidTime = (t) => typeof t === 'string' && TIME_RE.test(t);
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMinutes = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function isValidDateStr(d) {
  if (typeof d !== 'string' || !DATE_RE.test(d)) return false;
  const dt = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === d;
}

/** Calendar date of a Date (default: now) in the app timezone. */
function dateStrOf(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
const todayStr = () => dateStrOf(new Date());

function nowMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ(), hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return (get('hour') % 24) * 60 + get('minute');
}

function addDays(dateStr, n) {
  const dt = new Date(`${dateStr}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
const diffDays = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
const dayName = (dateStr) => DAYS[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];

/** Two half-open intervals [aStart,aEnd) and [bStart,bEnd) overlap. */
const overlaps = (aStart, aEnd, bStart, bEnd) => toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);

/** Validates a start/end pair; throws 400 with a clear message. */
function assertTimeRange(start, end, { grid = false } = {}) {
  if (!isValidTime(start) || !isValidTime(end)) throw ApiError.badRequest('Start and end time must use the HH:mm 24-hour format');
  if (toMinutes(end) <= toMinutes(start)) throw ApiError.badRequest('End time must be later than start time');
  if (grid && (toMinutes(start) % SLOT_MINUTES || toMinutes(end) % SLOT_MINUTES)) {
    throw ApiError.badRequest(`Times must fall on ${SLOT_MINUTES}-minute steps (e.g. 09:00, 09:15, 09:30)`);
  }
}

function assertDateStr(d, label = 'Date') {
  if (!isValidDateStr(d)) throw ApiError.badRequest(`${label} must be a valid date in YYYY-MM-DD format`);
}

/** Rejects a date/start that is already in the past. */
function assertNotPast(dateStr, start) {
  const today = todayStr();
  if (dateStr < today) throw ApiError.badRequest('Date cannot be in the past');
  if (dateStr === today && start && toMinutes(start) <= nowMinutes()) throw ApiError.badRequest('Start time has already passed today');
}

module.exports = {
  DAYS, SLOT_MINUTES, isValidTime, isValidDateStr, toMinutes, fromMinutes, dateStrOf, todayStr, nowMinutes,
  addDays, diffDays, dayName, overlaps, assertTimeRange, assertDateStr, assertNotPast,
};
