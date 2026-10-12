const mongoose = require('mongoose');
const { EVENT_CATEGORIES } = require('../utils/constants');
const { isValidTime, isValidDateStr, toMinutes } = require('../utils/time');

// Registrations are stored as the list of registered users; the count and remaining
// slots shown to users are derived from that array. `registeredCount` is a guard
// counter used only inside atomic update filters (see services/eventService.js): it
// is changed with $inc in the same operation as the $push/$pull, never on its own.
const eventSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true, minlength: [5, 'Title must be at least 5 characters'], maxlength: 140 },
  description: { type: String, required: [true, 'Description is required'], trim: true, minlength: [10, 'Description must be at least 10 characters'], maxlength: 3000 },
  location: { type: String, required: [true, 'Location is required'], trim: true, maxlength: 120 },
  date: { type: String, required: [true, 'Date is required'], validate: [isValidDateStr, 'Date must be YYYY-MM-DD'], index: true },
  startTime: { type: String, required: [true, 'Start time is required'], validate: [isValidTime, 'Start time must be HH:mm'] },
  endTime: { type: String, required: [true, 'End time is required'], validate: [isValidTime, 'End time must be HH:mm'] },
  category: { type: String, required: [true, 'Category is required'], enum: { values: EVENT_CATEGORIES, message: 'Unknown category' } },
  capacity: { type: Number, required: [true, 'Capacity is required'], min: [1, 'Capacity must be at least 1'], max: [10000, 'Capacity cannot exceed 10000'], validate: [Number.isInteger, 'Capacity must be a whole number'] },
  registrations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  registeredCount: { type: Number, default: 0, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

eventSchema.pre('validate', function checkRange() {
  if (this.isNew) this.registeredCount = this.registrations.length;
  if (isValidTime(this.startTime) && isValidTime(this.endTime) && toMinutes(this.endTime) <= toMinutes(this.startTime)) {
    this.invalidate('endTime', 'End time must be later than start time');
  }
});

module.exports = mongoose.model('Event', eventSchema);
