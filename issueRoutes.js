const express = require('express');
const upload = require('../middleware/upload');
const { attachUserIfPresent, requireAuth, requireRole } = require('../middleware/auth');
const {
  checkDuplicate,
  createIssue,
  getIssues,
  getIssueById,
  getMyIssues,
  toggleUpvote,
  updateStatus,
  getAnalytics,
} = require('../controllers/issueController');

const router = express.Router();

// Public: browse the live feed
router.get('/', getIssues);
router.get('/analytics/summary', getAnalytics);
router.get('/check-duplicate', checkDuplicate);

// Auth required: "My Reports" tab
router.get('/mine', requireAuth, getMyIssues);

// Public: submit a report (works anonymously; attaches user if logged in)
router.post('/', attachUserIfPresent, upload.single('photo'), createIssue);

// Public: upvote (voterId-based, no login required)
router.post('/:id/upvote', toggleUpvote);

// Officer only: update status/priority
router.patch('/:id/status', requireAuth, requireRole('officer'), updateStatus);

// Public: single issue detail — keep after the more specific routes above
router.get('/:id', getIssueById);

module.exports = router;
