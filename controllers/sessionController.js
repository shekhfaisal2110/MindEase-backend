// const UserSession = require('../models/UserSession');

// // Start a new session when user logs in or visits the first time
// exports.startSession = async (req, res) => {
//   try {
//     if (req.userType !== 'user') {
//       return res.status(403).json({ message: 'Only users can have sessions' });
//     }

//     const { deviceType } = req.body;
//     const session = new UserSession({
//       user: req.userId,
//       startTime: new Date(),
//       deviceType: deviceType || 'desktop',
//     });
//     await session.save();
//     res.status(201).json({ sessionId: session._id });
//   } catch (error) {
//     console.error('startSession error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Update session duration (heartbeat) – called periodically by frontend
// exports.heartbeat = async (req, res) => {
//   try {
//     const { sessionId, durationSeconds } = req.body;
//     if (!sessionId || durationSeconds === undefined) {
//       return res.status(400).json({ message: 'sessionId and durationSeconds required' });
//     }
//     const session = await UserSession.findById(sessionId);
//     if (!session || session.endTime) {
//       return res.status(404).json({ message: 'Session not active' });
//     }
//     session.durationSeconds = durationSeconds;
//     await session.save();
//     res.json({ success: true });
//   } catch (error) {
//     console.error('heartbeat error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // End session (on logout or page unload)
// exports.endSession = async (req, res) => {
//   try {
//     const { sessionId, finalDuration } = req.body;
//     const session = await UserSession.findById(sessionId);
//     if (!session || session.endTime) {
//       return res.status(404).json({ message: 'Session not found or already ended' });
//     }
//     session.endTime = new Date();
//     if (finalDuration !== undefined) session.durationSeconds = finalDuration;
//     await session.save();
//     res.json({ success: true });
//   } catch (error) {
//     console.error('endSession error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };



const UserSession = require('../models/UserSession');

// Start a new session
exports.startSession = async (req, res) => {
  try {
    if (req.userType !== 'user') {
      return res.status(403).json({ message: 'Only users can have sessions' });
    }

    const { deviceType } = req.body;
    const session = await UserSession.create({
      user: req.userId,
      startTime: new Date(),
      deviceType: deviceType || 'desktop',
    });
    res.status(201).json({ sessionId: session._id });
  } catch (error) {
    console.error('startSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Heartbeat – update duration atomically + security check
exports.heartbeat = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId required' });
    }

    // Calculate current duration from startTime (don't trust client)
    const session = await UserSession.findOne({ _id: sessionId, user: req.userId, endTime: null });
    if (!session) {
      return res.status(404).json({ message: 'Session not active or not yours' });
    }

    const currentDuration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    
    const updated = await UserSession.findOneAndUpdate(
      { _id: sessionId, user: req.userId, endTime: null },
      { $set: { durationSeconds: currentDuration } },
      { new: true, lean: true }
    );
    res.json({ success: true, durationSeconds: updated.durationSeconds });
  } catch (error) {
    console.error('heartbeat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// End session – atomic update
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId required' });
    }

    const session = await UserSession.findOne({ _id: sessionId, user: req.userId, endTime: null });
    if (!session) {
      return res.status(404).json({ message: 'Session not found or already ended' });
    }

    const finalDuration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    
    const updated = await UserSession.findOneAndUpdate(
      { _id: sessionId, user: req.userId, endTime: null },
      { $set: { endTime: new Date(), durationSeconds: finalDuration } },
      { new: true, lean: true }
    );
    res.json({ success: true, durationSeconds: updated.durationSeconds });
  } catch (error) {
    console.error('endSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};