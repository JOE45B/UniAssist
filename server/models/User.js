const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: [2, 'Name must be at least 2 characters'], maxlength: 80 },
  email: {
    type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email address is not valid'],
  },
  password: { type: String, required: [true, 'Password is required'], minlength: [8, 'Password must be at least 8 characters'], select: false },
  role: { type: String, enum: { values: ROLES, message: 'Role must be student, faculty or admin' }, default: 'student', index: true },
  idNumber: { type: String, trim: true, unique: true, sparse: true, maxlength: 20 },
  department: { type: String, trim: true, maxlength: 80, default: '' },
  program: { type: String, trim: true, maxlength: 80, default: '' },
  yearLevel: { type: Number, min: [1, 'Year level must be 1-6'], max: [6, 'Year level must be 1-6'] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.comparePassword = function comparePassword(plain) { return bcrypt.compare(plain, this.password); };
userSchema.set('toJSON', { transform: (doc, ret) => { delete ret.password; delete ret.__v; return ret; } });

module.exports = mongoose.model('User', userSchema);
