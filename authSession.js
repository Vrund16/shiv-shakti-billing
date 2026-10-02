const crypto = require('crypto');

// In-memory session store
const activeSessions = new Map();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

// Create a new session
function createSession(userData = {}) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const sessionData = {
    sessionId,
    user: userData,
    createdAt: Date.now(),
    lastSeen: Date.now()
  };
  activeSessions.set(sessionId, sessionData);
  return sessionData;
}

// Keep session active on ping/request
function touchSession(sessionId) {
  if (!sessionId) return false;
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.lastSeen = Date.now();
  activeSessions.set(sessionId, session);
  return true;
}

// Destroy session on logout
function destroySession(sessionId) {
  if (!sessionId) return false;
  return activeSessions.delete(sessionId);
}

// Express Middleware to protect private endpoints
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.body?.sessionId;

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }

  const session = activeSessions.get(sessionId);

  // Check inactivity timeout
  if (Date.now() - session.lastSeen > SESSION_TIMEOUT_MS) {
    activeSessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired due to inactivity' });
  }

  // Refresh timestamp
  session.lastSeen = Date.now();
  req.user = session.user;
  req.sessionId = sessionId;

  next();
}

// Periodic cleanup of abandoned sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastSeen > SESSION_TIMEOUT_MS) {
      activeSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  createSession,
  touchSession,
  destroySession,
  requireAuth,
  activeSessions
};
