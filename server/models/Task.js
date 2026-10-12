const mongoose = require('mongoose');
const { PRIORITIES, TASK_STATUSES } = require('../utils/constants');

// "overdue" is intentionally not stored: it is derived from dueDate + status at read time.
const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: [true, 'Title is required'], trim: true, minlength: [3, 'Title must be at least 3 characters'], maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 60 },
  dueDate: { type: Date, required: [true, 'Due date is required'] },
  priority: { type: String, enum: { values: PRIORITIES, message: 'Priority must be low, medium or high' }, default: 'medium' },
  status: { type: String, enum: { values: TASK_STATUSES, message: 'Status must be pending or completed' }, default: 'pending' },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

taskSchema.index({ user: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
