const mongoose = require('mongoose');

// Internal helper collection (not one of the eight domain collections).
// One document = one 15-minute slot of one resource (a staff member or a facility)
// on one date, held by one booking. The UNIQUE index below is what makes double
// booking impossible even when two requests arrive at the same instant: MongoDB
// lets only one of them insert a given (resource, date, slot) key.
const slotLockSchema = new mongoose.Schema({
  resource: { type: String, required: true }, // "staff:<userId>" or "facility:<name>"
  date: { type: String, required: true },
  slot: { type: Number, required: true }, // minutes since midnight
  booking: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

slotLockSchema.index({ resource: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('SlotLock', slotLockSchema);
