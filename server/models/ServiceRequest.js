const mongoose = require('mongoose');
const { PRIORITIES, REQUEST_CATEGORIES, REQUEST_STATUSES } = require('../utils/constants');

const historySchema = new mongoose.Schema({
  status: { type: String, enum: REQUEST_STATUSES, required: true },
  note: { type: String, trim: true, maxlength: 300, default: '' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const serviceRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: [true, 'Category is required'], enum: { values: REQUEST_CATEGORIES, message: 'Unknown category' } },
  title: { type: String, required: [true, 'Title is required'], trim: true, minlength: [5, 'Title must be at least 5 characters'], maxlength: 120 },
  description: { type: String, required: [true, 'Description is required'], trim: true, minlength: [10, 'Description must be at least 10 characters'], maxlength: 2000 },
  priority: { type: String, enum: { values: PRIORITIES, message: 'Priority must be low, medium or high' }, default: 'medium' },
  status: { type: String, enum: REQUEST_STATUSES, default: 'pending', index: true },
  submittedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

serviceRequestSchema.pre('validate', function checkDue() {
  if (this.dueDate && this.submittedAt && this.dueDate < this.submittedAt && this.isModified('dueDate')) {
    this.invalidate('dueDate', 'Due date cannot be earlier than the submission date');
  }
});
serviceRequestSchema.index({ status: 1, category: 1, submittedAt: -1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
