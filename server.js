const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Active Sessions (Max 4 allowed concurrently) & Login Activity Tracker
const activeSessions = new Map(); // sessionId -> { username, ip, device, loginTime, lastSeen }
const loginAttemptsLog = [];     // History of login attempts

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

// Supports MONGO_URI or MONGODB_URI automatically
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/shiv_shakti_tiles';
console.log('Attempting MongoDB connection...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// Flexible Schema
const billSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Bill = mongoose.model('Bill', billSchema);

// Explicit HTML Page Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/history', (req, res) => res.sendFile(path.join(__dirname, 'history.html')));
app.get('/activity', (req, res) => res.sendFile(path.join(__dirname, 'activity.html')));

// -------------------------------------------------------------
// AUTHENTICATION & CONCURRENCY RATE LIMITER ENDPOINTS
// -------------------------------------------------------------

// POST /api/login - Strict Auth Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const userAgent = req.headers['user-agent'] || 'Unknown Device';

  const CORRECT_USERNAME = 'Shiv-Shakti';
  const CORRECT_PASSWORD = 'shivshakti@*&$#2012sungranites';

  const reqUsername = (username || '').trim();

  if (reqUsername === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
    // Enforce 4 Concurrent Active Users
    if (activeSessions.size >= 4) {
      logLoginAttempt(reqUsername, clientIp, userAgent, 'REJECTED_MAX_LIMIT', 'Active user limit of 4 reached');
      return res.status(429).json({
        success: false,
        message: 'Maximum limit of 4 active users reached. Please try again later.'
      });
    }

    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const sessionData = {
      sessionId,
      username: reqUsername,
      ip: clientIp,
      device: userAgent,
      loginTime: new Date().toISOString(),
      lastSeen: Date.now()
    };

    activeSessions.set(sessionId, sessionData);
    logLoginAttempt(reqUsername, clientIp, userAgent, 'SUCCESS', 'Login successful');

    return res.json({
      success: true,
      message: 'Login successful',
      sessionId: sessionId,
      username: reqUsername
    });
  } else {
    logLoginAttempt(reqUsername, clientIp, userAgent, 'FAILED_INVALID_CREDS', 'Incorrect username or password');
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
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
      maxAllowed: 4
    });
  }
  return res.status(401).json({ active: false, message: 'Session invalid or expired' });
});

// GET /api/admin/login-activity
app.get('/api/admin/login-activity', (req, res) => {
  res.json({
    activeUserCount: activeSessions.size,
    maxAllowed: 4,
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
    const { officialBillNo } = req.body;
    const updated = await Bill.findByIdAndUpdate(
      req.params.id, 
      { officialBillNo }, 
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
