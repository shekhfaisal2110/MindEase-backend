// const UserSession = require('../models/UserSession');

// // Start a new session
// exports.startSession = async (req, res) => {
//   try {
//     const { deviceType } = req.body;
//     const session = await UserSession.create({
//       user: req.user._id,              // ✅ use req.user._id
//       startTime: new Date(),
//       deviceType: deviceType || 'desktop',
//     });
//     res.status(201).json({ sessionId: session._id });
//   } catch (error) {
//     console.error('startSession error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Heartbeat – atomic update with security check
// exports.heartbeat = async (req, res) => {
//   try {
//     const { sessionId } = req.body;
//     if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

//     const session = await UserSession.findOne({ _id: sessionId, user: req.user._id, endTime: null });
//     if (!session) return res.status(404).json({ message: 'Session not active or not yours' });

//     const currentDuration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
//     const updated = await UserSession.findOneAndUpdate(
//       { _id: sessionId, user: req.user._id, endTime: null },
//       { $set: { durationSeconds: currentDuration } },
//       { new: true, lean: true }
//     );
//     res.json({ success: true, durationSeconds: updated.durationSeconds });
//   } catch (error) {
//     console.error('heartbeat error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // End session – atomic update
// exports.endSession = async (req, res) => {
//   try {
//     const { sessionId } = req.body;
//     if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

//     const session = await UserSession.findOne({ _id: sessionId, user: req.user._id, endTime: null });
//     if (!session) return res.status(404).json({ message: 'Session not found or already ended' });

//     const finalDuration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
//     const updated = await UserSession.findOneAndUpdate(
//       { _id: sessionId, user: req.user._id, endTime: null },
//       { $set: { endTime: new Date(), durationSeconds: finalDuration } },
//       { new: true, lean: true }
//     );
//     res.json({ success: true, durationSeconds: updated.durationSeconds });
//   } catch (error) {
//     console.error('endSession error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };



// controllers/userSessionController.js
const UserSession = require('../models/UserSession');

/**
 * Start a new session.
 * Uses model's static method to atomically end any active session and create a new one.
 */
exports.startSession = async (req, res) => {
  try {
    const { deviceType } = req.body;
    const session = await UserSession.startSession(req.user._id, deviceType || 'desktop');
    res.status(201).json({ sessionId: session._id });
  } catch (error) {
    console.error('startSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Heartbeat – update the duration of an active session.
 * Uses atomic findOneAndUpdate with a pipeline that recomputes durationSeconds on the fly.
 * No application‑side duration calculation.
 */
exports.heartbeat = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    const now = new Date();
    const updated = await UserSession.findOneAndUpdate(
      { _id: sessionId, user: req.user._id, endTime: null },
      [
        {
          $set: {
            durationSeconds: {
              $floor: {
                $divide: [
                  { $subtract: [now, "$startTime"] },
                  1000
                ]
              }
            }
          }
        }
      ],
      { new: true, lean: true, projection: { durationSeconds: 1, _id: 0 } }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Session not active or not yours' });
    }
    res.json({ success: true, durationSeconds: updated.durationSeconds });
  } catch (error) {
    console.error('heartbeat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * End session – set endTime and finalize duration.
 * Uses model's static method endActiveSession which is atomic and calculates duration in one operation.
 */
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    // The method expects only userId, but we have a specific sessionId.
    // We'll use the atomic pipeline update directly to target this session.
    // Alternatively, use model's endActiveSession if we want to end any active session.
    // For specificity, we update the exact session.
    const now = new Date();
    const updated = await UserSession.findOneAndUpdate(
      { _id: sessionId, user: req.user._id, endTime: null },
      [
        {
          $set: {
            endTime: now,
            durationSeconds: {
              $floor: {
                $divide: [
                  { $subtract: [now, "$startTime"] },
                  1000
                ]
              }
            }
          }
        }
      ],
      { new: true, lean: true, projection: { durationSeconds: 1, _id: 0 } }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Session not found or already ended' });
    }
    res.json({ success: true, durationSeconds: updated.durationSeconds });
  } catch (error) {
    console.error('endSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};