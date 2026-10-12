const mongoose = require('mongoose');
const { DAYS, isValidTime, toMinutes } = require('../utils/time');

const scheduleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseCode: { type: String, required: [true, 'Course code is required'], trim: true, uppercase: true, maxlength: 20 },
  courseName: { type: String, required: [true, 'Course name is required'], trim: true, maxlength: 120 },
  instructor: { type: String, required: [true, 'Instructor is required'], trim: true, maxlength: 80 },
  room: { type: String, required: [true, 'Room is required'], trim: true, maxlength: 40 },
  day: { type: String, required: [true, 'Day is required'], enum: { values: DAYS, message: 'Day must be a day of the week' } },
  startTime: { type: String, required: [true, 'Start time is required'], validate: [isValidTime, 'Start time must be HH:mm'] },
  endTime: { type: String, required: [true, 'End time is required'], validate: [isValidTime, 'End time must be HH:mm'] },
}, { timestamps: true });

scheduleSchema.pre('validate', function checkRange() {
  if (isValidTime(this.startTime) && isValidTime(this.endTime) && toMinutes(this.endTime) <= toMinutes(this.startTime)) {
    this.invalidate('endTime', 'End time must be later than start time');
  }
});
scheduleSchema.index({ user: 1, day: 1, startTime: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
