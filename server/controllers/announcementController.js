const Announcement = require('../models/Announcement');
const svc = require('../services/announcementService');
const ApiError = require('../utils/ApiError');
const { pick, rx, isStaff } = require('../utils/helpers');
const { ANNOUNCEMENT_CATEGORIES, PRIORITIES } = require('../utils/constants');
const { loadOr404 } = require('./_access');

const FIELDS = ['title', 'content', 'category', 'priority', 'publishDate', 'expiryDate'];
const RANK = { high: 0, medium: 1, low: 2 };

function filters(query) {
  const f = {};
  if (query.category) { if (!ANNOUNCEMENT_CATEGORIES.includes(query.category)) throw ApiError.badRequest('Unknown category'); f.category = query.category; }
  if (query.priority) { if (!PRIORITIES.includes(query.priority)) throw ApiError.badRequest('Unknown priority'); f.priority = query.priority; }
  if (query.q) f.$or = [{ title: rx(query.q) }, { content: rx(query.q) }];
  return f;
}

/** Staff see every announcement (any state). Everyone else only ever receives active ones. */
exports.list = async (req, res) => {
  const now = new Date();
  const staff = req.user && isStaff(req.user);
  const state = staff ? req.query.state : 'active';
  if (state && !['upcoming', 'active', 'expired'].includes(state)) throw ApiError.badRequest('state must be upcoming, active or expired');
  const rows = await Announcement.find({ ...filters(req.query), ...svc.stateFilter(state, now) }).sort({ publishDate: -1 }).populate('createdBy', 'name').lean();
  res.json(rows.map((a) => svc.decorate(a, now)));
};

/** Public active feed: published and not yet expired, most important first. */
exports.active = async (req, res) => {
  const now = new Date();
  const rows = await Announcement.find({ ...filters(req.query), ...svc.stateFilter('active', now) }).sort({ publishDate: -1 }).populate('createdBy', 'name').lean();
  rows.sort((a, b) => RANK[a.priority] - RANK[b.priority] || new Date(b.publishDate) - new Date(a.publishDate));
  res.json(rows.map((a) => svc.decorate(a, now)));
};

exports.get = async (req, res) => {
  const doc = await Announcement.findById(req.params.id).populate('createdBy', 'name');
  if (!doc) throw ApiError.notFound('Announcement not found');
  const out = svc.decorate(doc);
  if (out.state !== 'active' && !(req.user && isStaff(req.user))) throw ApiError.notFound('Announcement not found');
  res.json(out);
};

exports.create = async (req, res) => res.status(201).json(svc.decorate(await Announcement.create({ ...pick(req.body, FIELDS), createdBy: req.user._id })));

exports.update = async (req, res) => {
  const doc = await loadOr404(Announcement, req.params.id, 'Announcement');
  Object.assign(doc, pick(req.body, FIELDS));
  await doc.save();
  res.json(svc.decorate(doc));
};

exports.remove = async (req, res) => {
  const doc = await loadOr404(Announcement, req.params.id, 'Announcement');
  await doc.deleteOne();
  res.json({ message: 'Announcement deleted', id: doc._id });
};
