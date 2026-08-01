const Issue = require('../models/Issue');
const { distanceInMeters, generateTicketId } = require('../utils/geo');

const DUPLICATE_RADIUS = Number(process.env.DUPLICATE_RADIUS_METERS) || 500;

// Shared helper: find the nearest *open* (non-resolved) issue within the duplicate radius.
async function findNearbyDuplicate(lat, lng, excludeId = null) {
  const candidates = await Issue.find({
    status: { $ne: 'resolved' },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).select('ticketId title location status');

  let closest = null;
  let closestDist = Infinity;

  for (const issue of candidates) {
    const dist = distanceInMeters(lat, lng, issue.location.lat, issue.location.lng);
    if (dist < DUPLICATE_RADIUS && dist < closestDist) {
      closest = issue;
      closestDist = dist;
    }
  }
  return closest ? { issue: closest, distanceMeters: Math.round(closestDist) } : null;
}

// GET /api/issues/check-duplicate?lat=&lng=
// Lets the frontend run the same check it does client-side, but against live server data.
async function checkDuplicate(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'Valid lat and lng query params are required.' });
    }
    const match = await findNearbyDuplicate(lat, lng);
    return res.json({ duplicate: match });
  } catch (err) {
    return res.status(500).json({ message: 'Duplicate check failed.', error: err.message });
  }
}

// POST /api/issues  (multipart/form-data, field name "photo")
async function createIssue(req, res) {
  try {
    const { title, category, urgency, description, reporterName, reporterContact, lat, lng } = req.body;

    if (!title || !category || !lat || !lng) {
      return res.status(400).json({ message: 'Title, category, and location are required.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Photo evidence is required.' });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    const duplicate = await findNearbyDuplicate(parsedLat, parsedLng);

    // Simulated AI photo check placeholder — swap with a real vision model call.
    const aiConfidence = Math.floor(85 + Math.random() * 14); // 85-99
    const ticketId = await generateTicketId(Issue);

    const issue = await Issue.create({
      ticketId,
      title,
      category,
      urgency: urgency || 'medium',
      description: description || 'No extra description provided.',
      reporterName: reporterName || 'Anonymous',
      reporterContact: reporterContact || 'Not provided',
      reportedBy: req.user ? req.user._id : null,
      location: { lat: parsedLat, lng: parsedLng },
      imageUrl: `/uploads/${req.file.filename}`,
      aiVerified: true,
      aiConfidence,
      priority: urgency === 'high' ? 'urgent' : 'normal',
      duplicateOf: duplicate ? duplicate.issue._id : null,
    });

    return res.status(201).json({
      issue,
      duplicateWarning: duplicate
        ? { ticketId: duplicate.issue.ticketId, title: duplicate.issue.title, distanceMeters: duplicate.distanceMeters }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to submit report.', error: err.message });
  }
}

// GET /api/issues?status=&category=&sort=recent|top
async function getIssues(req, res) {
  try {
    const { status, category, page = 1, limit = 20, sort = 'recent' } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (category) filter.category = category;

    const sortMap = {
      recent: { createdAt: -1 },
      top: { createdAt: -1 }, // upvotes is a virtual; sorted client-side or via aggregation below
    };

    let query = Issue.find(filter).sort(sortMap[sort] || sortMap.recent);

    if (sort === 'top') {
      // upvotedBy length can't be sorted directly without aggregation; use one for accuracy.
      const results = await Issue.aggregate([
        { $match: filter },
        { $addFields: { upvoteCount: { $size: '$upvotedBy' } } },
        { $sort: { upvoteCount: -1, createdAt: -1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      ]);
      const total = await Issue.countDocuments(filter);
      return res.json({ issues: results, total, page: Number(page), limit: Number(limit) });
    }

    const total = await Issue.countDocuments(filter);
    const issues = await query
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.json({ issues, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch issues.', error: err.message });
  }
}

// GET /api/issues/:id
async function getIssueById(req, res) {
  try {
    const issue = await Issue.findById(req.params.id).populate('duplicateOf', 'ticketId title');
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    return res.json({ issue });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch issue.', error: err.message });
  }
}

// GET /api/issues/mine  (requires auth)
async function getMyIssues(req, res) {
  try {
    const issues = await Issue.find({ reportedBy: req.user._id }).sort({ createdAt: -1 });
    return res.json({ issues });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch your reports.', error: err.message });
  }
}

// POST /api/issues/:id/upvote  { voterId }
// voterId is a client-generated token (e.g. stored in localStorage) so anonymous
// citizens can each vote once without needing an account.
async function toggleUpvote(req, res) {
  try {
    const { voterId } = req.body;
    if (!voterId) return res.status(400).json({ message: 'voterId is required.' });

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    const alreadyVoted = issue.upvotedBy.includes(voterId);
    if (alreadyVoted) {
      issue.upvotedBy = issue.upvotedBy.filter((v) => v !== voterId);
    } else {
      issue.upvotedBy.push(voterId);
    }
    await issue.save();

    return res.json({ upvotes: issue.upvotedBy.length, voted: !alreadyVoted });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update vote.', error: err.message });
  }
}

// PATCH /api/issues/:id/status  (officer only)  { status, priority?, note? }
async function updateStatus(req, res) {
  try {
    const { status, priority, note } = req.body;
    const allowed = ['pending', 'in-progress', 'resolved'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    if (status) issue.status = status;
    if (priority) issue.priority = priority;
    if (note !== undefined) issue.assignedDepartmentNote = note;

    await issue.save();
    return res.json({ issue });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update issue.', error: err.message });
  }
}

// GET /api/issues/analytics/summary  — powers the City Response Overview dashboard
async function getAnalytics(req, res) {
  try {
    const [pending, inProgress, resolved, total] = await Promise.all([
      Issue.countDocuments({ status: 'pending' }),
      Issue.countDocuments({ status: 'in-progress' }),
      Issue.countDocuments({ status: 'resolved' }),
      Issue.countDocuments({}),
    ]);

    const byCategory = await Issue.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly reported vs resolved for the last 7 months, matching the frontend chart shape.
    const now = new Date();
    const monthlyBuckets = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyBuckets.push({
        label: d.toLocaleString('default', { month: 'short' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      });
    }

    const reportedByMonth = [];
    const resolvedByMonth = [];
    for (const bucket of monthlyBuckets) {
      // eslint-disable-next-line no-await-in-loop
      const reportedCount = await Issue.countDocuments({
        createdAt: { $gte: bucket.start, $lt: bucket.end },
      });
      // eslint-disable-next-line no-await-in-loop
      const resolvedCount = await Issue.countDocuments({
        status: 'resolved',
        updatedAt: { $gte: bucket.start, $lt: bucket.end },
      });
      reportedByMonth.push(reportedCount);
      resolvedByMonth.push(resolvedCount);
    }

    return res.json({
      counts: { pending, inProgress, resolved, total },
      byCategory,
      chart: {
        labels: monthlyBuckets.map((b) => b.label),
        reported: reportedByMonth,
        resolved: resolvedByMonth,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load analytics.', error: err.message });
  }
}

module.exports = {
  checkDuplicate,
  createIssue,
  getIssues,
  getIssueById,
  getMyIssues,
  toggleUpvote,
  updateStatus,
  getAnalytics,
};
