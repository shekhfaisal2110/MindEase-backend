const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/routine', require('./routes/routineRoutes'));
app.use('/api/affirmations', require('./routes/affirmationRoutes'));
app.use('/api/gratitude', require('./routes/gratitudeRoutes'));
app.use('/api/emotional', require('./routes/emotionalRoutes'));
app.use('/api/therapy', require('./routes/therapyRoutes'));
app.use('/api/letters', require('./routes/letterRoutes'));
app.use('/api/dailytrack', require('./routes/dailyTrackRoutes'));
app.use('/api/emotion-hourly', require('./routes/emotionHourlyRoutes'));
app.use('/api/react-response', require('./routes/reactResponseRoutes'));
app.use('/api/ikigai', require('./routes/ikigaiRoutes'));
app.use('/api/custom-blocks', require('./routes/customHourBlocks'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/daily-activity', require('./routes/dailyActivityRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/time', require('./routes/timeRoutes'));
app.use('/api/usage', require('./routes/usageRoutes'));
app.use('/api/wellbeing', require('./routes/wellbeingRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));

// Test route (remove after testing)
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Backend is running' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});