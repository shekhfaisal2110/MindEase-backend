// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');

// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/tasks', require('./routes/taskRoutes'));
// app.use('/api/routine', require('./routes/routineRoutes'));
// app.use('/api/affirmations', require('./routes/affirmationRoutes'));
// app.use('/api/gratitude', require('./routes/gratitudeRoutes'));
// app.use('/api/emotional', require('./routes/emotionalRoutes'));
// app.use('/api/therapy', require('./routes/therapyRoutes'));
// app.use('/api/letters', require('./routes/letterRoutes'));
// app.use('/api/dailytrack', require('./routes/dailyTrackRoutes'));
// app.use('/api/emotion-hourly', require('./routes/emotionHourlyRoutes'));
// app.use('/api/react-response', require('./routes/reactResponseRoutes'));
// app.use('/api/ikigai', require('./routes/ikigaiRoutes'));
// app.use('/api/custom-blocks', require('./routes/customHourBlocks'));
// app.use('/api/activity', require('./routes/activityRoutes'));
// app.use('/api/daily-activity', require('./routes/dailyActivityRoutes'));
// app.use('/api/messages', require('./routes/messageRoutes'));
// app.use('/api/time', require('./routes/timeRoutes'));
// app.use('/api/usage', require('./routes/usageRoutes'));
// app.use('/api/wellbeing', require('./routes/wellbeingRoutes'));
// app.use('/api/user', require('./routes/userRoutes'));
// app.use('/api/feedback', require('./routes/feedbackRoutes'));
// app.use('/api/contact', require('./routes/contactRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));
// app.use('/api/sleep', require('./routes/sleepRoutes'));
// app.use('/api/analytics', require('./routes/analyticsRoutes'));
// app.use('/api/sessions', require('./routes/sessionRoutes'));

// // Test route (remove after testing)
// app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Backend is running' }));

// // MongoDB Connection
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('✅ MongoDB connected'))
//   .catch(err => console.error('❌ MongoDB connection error:', err));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });





const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ========== SECURITY & PERFORMANCE MIDDLEWARE ==========
app.use(helmet());
app.use(compression());

// ========== CORS – allow Netlify & localhost ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://mindease2110.netlify.app',
  'https://mindease-admin-2110.netlify.app'
];

if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',');
  allowedOrigins.push(...envOrigins);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ========== ROUTES ==========
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
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/sleep', require('./routes/sleepRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message });
});

// ========== DATABASE CONNECTION ==========
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};
connectDB();

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  server.close(() => process.exit(1));
});