const Schedule = require('../models/Schedule');
const { overlaps, assertTimeRange, DAYS } = require('../utils/time');
const ApiError = require('../utils/ApiError');

/** Classes of one student that overlap the given day/time range. */
function findConflicts(userId, { day, startTime, endTime }, excludeId) {
  const q = { user: userId, day, startTime: { $lt: endTime }, endTime: { $gt: startTime } };
  if (excludeId) q._id = { $ne: excludeId };
  return Schedule.find(q).sort({ startTime: 1 }).lean();
}

async function assertNoConflict(userId, candidate, excludeId) {
  if (!DAYS.includes(candidate.day)) throw ApiError.badRequest('Day must be a day of the week');
  assertTimeRange(candidate.startTime, candidate.endTime);
  const clash = await findConflicts(userId, candidate, excludeId);
  if (clash.length) {
    const c = clash[0];
    throw ApiError.conflict(`Schedule conflict: overlaps ${c.courseCode} (${c.day} ${c.startTime}-${c.endTime})`);
  }
}

/** Every overlapping pair already present in a student's timetable. */
async function allConflictPairs(userId) {
  const rows = await Schedule.find({ user: userId }).sort({ day: 1, startTime: 1 }).lean();
  const pairs = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i]; const b = rows[j];
      if (a.day === b.day && overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) pairs.push({ day: a.day, first: a, second: b });
    }
  }
  return pairs;
}

module.exports = { findConflicts, assertNoConflict, allConflictPairs };
