const crypto = require('crypto');

// Configuration driven by environment variables with portfolio-safe defaults
const MAX_CONCURRENT_USERS = parseInt(process.env.MAX_ACTIVE_USERS, 10) || 4;
const SESSION_TIMEOUT_MS = (parseInt(process.env.SESSION_EXPIRY_MINUTES, 10) || 60) * 60 * 1000; // 60 minutes

// In-memory session store: sessionId -> { sessionId, user, createdAt, lastSeen }
const activeSessions = new Map();

// Helper: Sweep and remove sessions past the 60-minute idle threshold
function pruneExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastSeen > SESSION_TIMEOUT_MS) {
      activeSessions.delete(sessionId);
      console.log(`⏳ [authSession] Expired idle session purged: ${sessionId}`);
    }
  }
}

// Create a new session enforcing the max 4 concurrent active users limit
function createSession(userData = {}) {
  pruneExpiredSessions();

  // Strict Concurrency Limit Check (Max 4 Users)
  if (activeSessions.size >= MAX_CONCURRENT_USERS) {
    return {
      error: `Maximum active user limit of ${MAX_CONCURRENT_USERS} reached. Please try again later.`,
      limitReached: true
    };
  }

  const sessionId = 'sess_' + crypto.randomBytes(24).toString('hex');
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
  pruneExpiredSessions();

  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.lastSeen = Date.now();
  return true;
}

// Destroy session on logout
function destroySession(sessionId) {
  if (!sessionId) return false;
  return activeSessions.delete(sessionId);
}

// Express Middleware to protect private endpoints
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.body?.sessionId || req.query?.sessionId;

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }

  const session = activeSessions.get(sessionId);

  // Check 60-minute inactivity timeout
  if (Date.now() - session.lastSeen > SESSION_TIMEOUT_MS) {
    activeSessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired due to 60-minute inactivity' });
  }

  // Refresh active timestamp
  session.lastSeen = Date.now();
  req.user = session.user;
  req.sessionId = sessionId;

  next();
}

// Helper to get session metrics
function getSessionStats() {
  pruneExpiredSessions();
  return {
    activeCount: activeSessions.size,
    maxAllowed: MAX_CONCURRENT_USERS
  };
}

// Background cleanup task: Sweeps inactive sessions every 1 minute
setInterval(pruneExpiredSessions, 60 * 1000);

module.exports = {
  createSession,
  touchSession,
  destroySession,
  requireAuth,
  pruneExpiredSessions,
  getSessionStats,
  activeSessions
};
