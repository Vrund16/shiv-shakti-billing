const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable Trust Proxy for Render / Cloudflare to extract exact client IPs
app.set('trust proxy', true);

// Middlewares
app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Dynamic Authentication Configuration
let authConfig = {
  username: process.env.ADMIN_USERNAME || 'Shiv-Shakti',
  password: process.env.ADMIN_PASSWORD || 'shivshakti@*&$#2012sungranites',
  resetPin: process.env.RESET_PIN || '2012' // Master PIN to reset password
};

const MAX_CONCURRENT_USERS = parseInt(process.env.MAX_ACTIVE_USERS, 10) || 4;

// Active Sessions (Max 4 allowed concurrently) & Login Activity Tracker
const activeSessions = new Map(); // sessionId -> { sessionId, username, ip, device, loginTime, lastSeen }
const loginAttemptsLog = [];      // History of login attempts (max 200)

// Helper to extract clean single IP address and location details
async function getClientIp(req) {
  const rawIp = req.headers['cf-connecting-ip'] || 
                (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : null) || 
                req.ip || 
                req.socket.remoteAddress;

  const cleanIp = (rawIp || 'Unknown').replace(/^::ffff:/, '').trim();

  // Return immediately if local network IP
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.')) {
    return cleanIp;
  }

  // Attempt location lookup via ip-api
  try {
    const response = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,city,country,isp`);
    const data = await response.json();
    if (data.status === 'success') {
      return `${cleanIp} (${data.city}, ${data.country} - ${data.isp})`;
    }
  } catch (err) {
    // Fallback to clean IP if API query fails
  }

  return cleanIp;
}

// Helper to log all incoming login activity
function logLoginAttempt(username, ip, userAgent, status, reason = '') {
  const attemptInfo = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    username: username || 'Unknown',
    ip: ip || 'Unknown',
    device: userAgent || 'Unknown',
    timestamp: new Date().toISOString(),
    status: status, // 'SUCCESS', 'FAILED_INVALID_CREDS', 'REJECTED_MAX_LIMIT'
    reason: reason
  };
  loginAttemptsLog.unshift(attemptInfo);
  if (loginAttemptsLog.length > 200) loginAttemptsLog.pop();
}

// Session Cleanup: Automatically clean up sessions inactive for more than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 30 * 60 * 1000) {
      activeSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Authentication Middleware to Protect API Routes
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  
  if (sessionId && activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    session.lastSeen = Date.now();
    req.user = session;
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized. Active session required.' });
}

// MongoDB Connection Configuration
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/shiv_shakti_tiles';

console.log('Attempting MongoDB connection...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// Flexible Bill Schema
const billSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Bill = mongoose.model('Bill', billSchema);

// Explicit HTML Page Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/history', (req, res) => res.sendFile(path.join(__dirname, 'history.html')));
app.get('/activity', (req, res) => res.sendFile(path.join(__dirname, 'activity.html')));

// -------------------------------------------------------------
// SYSTEM & HEALTH ENDPOINTS
// -------------------------------------------------------------

// GET /api/health - System and Database Status Check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
  
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    database: dbStatusMap[dbState] || 'Unknown',
    activeSessions: activeSessions.size,
    maxSessionsAllowed: MAX_CONCURRENT_USERS
  });
});

// -------------------------------------------------------------
// AUTHENTICATION & CONCURRENCY RATE LIMITER ENDPOINTS
// -------------------------------------------------------------

// POST /api/login - Auth Endpoint
app.post('/api/login', async (req, res) => {
  const { username, password, privateIp } = req.body;
  
  // Extract Public IP and append Private IP if sent from login.html
  const publicIp = await getClientIp(req);
  const cleanPrivate = (privateIp && privateIp !== 'N/A') ? ` | Private: ${privateIp}` : '';
  const clientIp = `${publicIp}${cleanPrivate}`;

  const userAgent = req.headers['user-agent'] || 'Unknown Device';

  const reqUserClean = (username || '').trim().toLowerCase();
  const reqPass = (password || '');

  // Flexible Username Acceptance
  const validUsernames = [
    authConfig.username.toLowerCase(),
    'admin',
    'shiv-shakti',
    'shivshakti'
  ];

  if (validUsernames.includes(reqUserClean) && reqPass === authConfig.password) {
    // Enforce Concurrent Active Users Limit
    if (activeSessions.size >= MAX_CONCURRENT_USERS) {
      logLoginAttempt(username, clientIp, userAgent, 'REJECTED_MAX_LIMIT', `Active limit of ${MAX_CONCURRENT_USERS} reached`);
      return res.status(429).json({
        success: false,
        message: `Maximum limit of ${MAX_CONCURRENT_USERS} active users reached. Please try again later.`
      });
    }

    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const sessionData = {
      sessionId,
      username: (username || authConfig.username).trim(),
      ip: clientIp,
      device: userAgent,
      loginTime: new Date().toISOString(),
      lastSeen: Date.now()
    };

    activeSessions.set(sessionId, sessionData);
    logLoginAttempt(username, clientIp, userAgent, 'SUCCESS', 'Login successful');

    return res.json({
      success: true,
      message: 'Login successful',
      sessionId: sessionId,
      username: sessionData.username
    });
  } else {
    logLoginAttempt(username, clientIp, userAgent, 'FAILED_INVALID_CREDS', 'Incorrect username or password');
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// POST /api/reset-password - Password Reset Endpoint using Master Security PIN
app.post('/api/reset-password', (req, res) => {
  const { pin, newPassword } = req.body;

  if (!pin || pin.trim() !== authConfig.resetPin) {
    return res.status(401).json({
      success: false,
      message: 'Invalid Master Security PIN. Contact admin if forgotten.'
    });
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 4 characters long.'
    });
  }

  authConfig.password = newPassword.trim();
  console.log(`🔑 Password successfully reset`);

  return res.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.'
  });
});

// POST /api/logout - Immediately Releases Active Session Slot
app.post('/api/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || (req.body && req.body.sessionId) || req.query.sessionId;

  if (sessionId && activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    activeSessions.delete(sessionId);
    console.log(`🚪 Session released for user [${session.username}] (${sessionId})`);
    return res.json({ success: true, message: 'Session released successfully' });
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/admin/terminate-session - Force Kill Session from Dashboard
app.post('/api/admin/terminate-session', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
    return res.json({ success: true, message: 'Session forcefully terminated' });
  }
  return res.status(404).json({ success: false, message: 'Session not found' });
});

// GET /api/session-check
app.get('/api/session-check', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (sessionId && activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    session.lastSeen = Date.now();
    return res.json({
      active: true,
      activeUserCount: activeSessions.size,
      maxAllowed: MAX_CONCURRENT_USERS
    });
  }
  return res.status(401).json({ active: false, message: 'Session invalid or expired' });
});

// POST /api/session-ping - Heartbeat
app.post('/api/session-ping', (req, res) => {
  const sessionId = req.headers['x-session-id'] || (req.body && req.body.sessionId);
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.get(sessionId).lastSeen = Date.now();
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Session expired' });
});

// GET /api/admin/login-activity
app.get('/api/admin/login-activity', (req, res) => {
  res.json({
    activeUserCount: activeSessions.size,
    maxAllowed: MAX_CONCURRENT_USERS,
    activeSessions: Array.from(activeSessions.values()),
    logs: loginAttemptsLog
  });
});

// -------------------------------------------------------------
// BILLING API ENDPOINTS
// -------------------------------------------------------------

app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch bills' });
  }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch bill' });
  }
});

app.post('/api/bills', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        error: `Database connection state is ${mongoose.connection.readyState} (Not Connected). Check password/URL on Render.` 
      });
    }
    const newBill = new Bill(req.body);
    const saved = await newBill.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving bill:', err);
    res.status(500).json({ error: err.message || 'Failed to save bill to database' });
  }
});

app.put('/api/bills/:id', async (req, res) => {
  try {
    const updated = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update bill' });
  }
});

app.patch('/api/bills/:id', async (req, res) => {
  try {
    const { officialBillNo, billNo } = req.body;
    const updateFields = {};

    if (officialBillNo !== undefined) updateFields.officialBillNo = officialBillNo;
    if (billNo !== undefined) updateFields.billNo = billNo;

    const updated = await Bill.findByIdAndUpdate(
      req.params.id, 
      { $set: updateFields }, 
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update official bill number' });
  }
});

app.delete('/api/bills/:id', async (req, res) => {
  try {
    await Bill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete bill' });
  }
});

// Port Binding
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
