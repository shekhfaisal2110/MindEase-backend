const mongoose = require('mongoose');
require('dotenv').config();
const MotivationThought = require('../models/MotivationThought');
const User = require('../models/User');

const defaultThoughts = [
  "You are stronger than you think.",
  "Every day may not be good, but there's something good in every day.",
  "Believe you can and you're halfway there.",
  "The only way to do great work is to love what you do."
  // ... add up to 50 (I'll provide a full list in final code)
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    // Find a dummy admin user to assign as submitter? Or create a system user.
    let systemUser = await User.findOne({ email: 'system@mindease.com' });
    if (!systemUser) {
      systemUser = new User({ username: 'MindEase', email: 'system@mindease.com', password: 'system', isVerified: true });
      await systemUser.save();
    }
    const existing = await MotivationThought.countDocuments();
    if (existing === 0) {
      const thoughts = defaultThoughts.map(thought => ({
        user: systemUser._id,
        thought,
        status: 'approved',
        approvedAt: new Date()
      }));
      await MotivationThought.insertMany(thoughts);
      console.log(`Seeded ${thoughts.length} motivational thoughts.`);
    } else {
      console.log('Thoughts already exist. Skipping seed.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();