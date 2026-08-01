require('dotenv').config();
const connectDB = require('./db');
const User = require('../models/User');
const Issue = require('../models/Issue');

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Issue.deleteMany({})]);

  const citizen = await User.create({
    firstName: 'Asha',
    lastName: 'Rao',
    email: 'citizen@demo.com',
    password: 'password123',
    role: 'citizen',
  });

  const officer = await User.create({
    firstName: 'D.',
    lastName: 'Menon',
    email: 'officer@demo.com',
    password: 'password123',
    role: 'officer',
    department: 'Roads & Potholes',
  });

  await Issue.create([
    {
      ticketId: 'UE-4812',
      title: 'Severe Pothole Cluster on West Avenue',
      category: 'Roads & Potholes',
      urgency: 'high',
      description: 'Multiple deep potholes causing traffic slowdowns and hazard for two-wheelers.',
      reporterName: 'Asha Rao',
      reporterContact: 'citizen@demo.com',
      reportedBy: citizen._id,
      location: { lat: 12.9716, lng: 80.2452 },
      imageUrl: '/uploads/demo-pothole.jpg',
      aiVerified: true,
      aiConfidence: 95,
      status: 'pending',
      priority: 'urgent',
      upvotedBy: ['seed-voter-1', 'seed-voter-2'],
    },
    {
      ticketId: 'UE-4790',
      title: 'Damaged Streetlight Junction Box',
      category: 'Streetlight & Electrical',
      urgency: 'medium',
      description: 'Exposed wiring at the junction box near the park entrance.',
      reporterName: 'Anonymous',
      reporterContact: 'Not provided',
      location: { lat: 12.9812, lng: 80.2311 },
      imageUrl: '/uploads/demo-streetlight.jpg',
      aiVerified: true,
      aiConfidence: 91,
      status: 'in-progress',
      priority: 'normal',
      upvotedBy: ['seed-voter-1'],
    },
    {
      ticketId: 'UE-4655',
      title: 'Overflowing Bin Near Market Entrance',
      category: 'Garbage & Sanitation',
      urgency: 'low',
      description: 'Bin has not been collected in over a week.',
      reporterName: 'Anonymous',
      reporterContact: 'Not provided',
      location: { lat: 12.9601, lng: 80.2188 },
      imageUrl: '/uploads/demo-garbage.jpg',
      aiVerified: true,
      aiConfidence: 88,
      status: 'resolved',
      priority: 'low',
      upvotedBy: [],
    },
  ]);

  console.log('Seed complete:');
  console.log('  Citizen login -> citizen@demo.com / password123');
  console.log('  Officer login -> officer@demo.com / password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
