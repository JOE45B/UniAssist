const mongoose = require('mongoose');
const { ANNOUNCEMENT_CATEGORIES, PRIORITIES } = require('../utils/constants');

// State (upcoming / active / expired) is derived from publishDate and expiryDate, not stored.
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true, minlength: [5, 'Title must be at least 5 characters'], maxlength: 140 },
  content: { type: String, required: [true, 'Content is required'], trim: true, minlength: [10, 'Content must be at least 10 characters'], maxlength: 3000 },
  category: { type: String, required: [true, 'Category is required'], enum: { values: ANNOUNCEMENT_CATEGORIES, message: 'Unknown category' } },
  priority: { type: String, enum: { values: PRIORITIES, message: 'Priority must be low, medium or high' }, default: 'medium' },
  publishDate: { type: Date, required: [true, 'Publish date is required'] },
  expiryDate: { type: Date, required: [true, 'Expiry date is required'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

announcementSchema.pre('validate', function checkDates() {
  if (this.publishDate && this.expiryDate && this.expiryDate <= this.publishDate) {
    this.invalidate('expiryDate', 'Expiry date must be after the publish date');
  }
});
announcementSchema.index({ publishDate: 1, expiryDate: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
