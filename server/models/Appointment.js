const mongoose = require('mongoose');
const { DEPARTMENTS, APPOINTMENT_STATUSES } = require('../utils/constants');
const { isValidTime, isValidDateStr } = require('../utils/time');

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  department: { type: String, required: [true, 'Department is required'], enum: { values: DEPARTMENTS, message: 'Unknown department' } },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Staff member is required'] },
  date: { type: String, required: [true, 'Date is required'], validate: [isValidDateStr, 'Date must be YYYY-MM-DD'] },
  startTime: { type: String, required: [true, 'Start time is required'], validate: [isValidTime, 'Start time must be HH:mm'] },
  endTime: { type: String, required: [true, 'End time is required'], validate: [isValidTime, 'End time must be HH:mm'] },
  purpose: { type: String, required: [true, 'Purpose is required'], trim: true, minlength: [5, 'Purpose must be at least 5 characters'], maxlength: 500 },
  status: { type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled', index: true },
}, { timestamps: true });

appointmentSchema.index({ staff: 1, date: 1, startTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
