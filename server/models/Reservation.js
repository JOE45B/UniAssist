const mongoose = require('mongoose');
const { FACILITIES, FACILITY_TYPES, RESERVATION_STATUSES } = require('../utils/constants');
const { isValidTime, isValidDateStr } = require('../utils/time');

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  facility: { type: String, required: [true, 'Facility is required'], enum: { values: FACILITIES.map((f) => f.name), message: 'Unknown facility' } },
  facilityType: { type: String, required: true, enum: FACILITY_TYPES },
  date: { type: String, required: [true, 'Date is required'], validate: [isValidDateStr, 'Date must be YYYY-MM-DD'] },
  startTime: { type: String, required: [true, 'Start time is required'], validate: [isValidTime, 'Start time must be HH:mm'] },
  endTime: { type: String, required: [true, 'End time is required'], validate: [isValidTime, 'End time must be HH:mm'] },
  purpose: { type: String, required: [true, 'Purpose is required'], trim: true, minlength: [5, 'Purpose must be at least 5 characters'], maxlength: 500 },
  status: { type: String, enum: RESERVATION_STATUSES, default: 'confirmed', index: true },
}, { timestamps: true });

reservationSchema.index({ facility: 1, date: 1, startTime: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
