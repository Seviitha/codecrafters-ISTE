const mongoose = require('mongoose');

const CATEGORIES = [
  'Roads & Potholes',
  'Water Leakage & Sewage',
  'Streetlight & Electrical',
  'Garbage & Sanitation',
  'Public Transport & Stops',
  'Parks & Green Spaces',
  'Traffic Signals & Signage',
  'Illegal Encroachment',
];

const issueSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true }, // e.g. "UE-4812"
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, enum: CATEGORIES },
    urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    description: { type: String, trim: true, default: 'No extra description provided.' },

    reporterName: { type: String, trim: true, default: 'Anonymous' },
    reporterContact: { type: String, trim: true, default: 'Not provided' },
    // If the reporter was logged in, link the account (optional — form allows anonymous reports)
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    imageUrl: { type: String, required: true },
    aiVerified: { type: Boolean, default: false },
    aiConfidence: { type: Number, default: null }, // 0-100

    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'urgent'],
      default: 'normal',
    },
    assignedDepartmentNote: { type: String, default: '' },

    // Voter tokens (client-generated ids stored in localStorage) prevent double-upvoting
    // without requiring every citizen to have an account.
    upvotedBy: { type: [String], default: [] },

    // If this report was flagged as a likely duplicate of an existing one at submit time.
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
  },
  { timestamps: true }
);

issueSchema.index({ 'location.lat': 1, 'location.lng': 1 });
issueSchema.index({ status: 1 });
issueSchema.index({ category: 1 });

issueSchema.virtual('upvotes').get(function upvotesCount() {
  return this.upvotedBy.length;
});
issueSchema.set('toJSON', { virtuals: true });
issueSchema.set('toObject', { virtuals: true });

issueSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Issue', issueSchema);
