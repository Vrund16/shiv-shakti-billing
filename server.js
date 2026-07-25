const express = require('express');
const session = require('express-session');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── ALLOWED USERS ──────────────────────────────────────────────────────────
const USERS = {
  'suresh': { password: 'suresh123',  name: 'Suresh Patel' },
  'vishnu': { password: 'vishnu123',  name: 'Vishnu Patel' },
  'admin':  { password: 'shivshakti', name: 'Admin'        },
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use(session({
  secret: 'shivshakti-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

// ── Page routes ──────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const key  = (username || '').toLowerCase().trim();
  const user = USERS[key];
  if (user && user.password === password) {
    req.session.user = { username: key, name: user.name };
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

app.get('/logout',      (req, res) => { req.session.destroy(); res.redirect('/login'); });
app.get('/',            requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/gst-bill',    requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'gst-bill.html')));
app.get('/gst-history', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'gst-history.html')));
app.get('/history',     requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')));

// ── API ──────────────────────────────────────────────────────────────────────
app.get('/api/me', requireLogin, (req, res) =>
  res.json({ name: req.session.user.name, username: req.session.user.username }));

app.get('/api/ping', requireLogin, (req, res) => res.json({ ok: true }));

// ── Standard Bills Data ──────────────────────────────────────────────────────
const DATA_DIR      = path.join(__dirname, 'data');
const DATA_FILE     = path.join(DATA_DIR, 'bills.json');
const DATA_FILE_GST = path.join(DATA_DIR, 'gst_bills.json');

if (!fs.existsSync(DATA_DIR))      fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE))     fs.writeFileSync(DATA_FILE, '[]');
if (!fs.existsSync(DATA_FILE_GST)) fs.writeFileSync(DATA_FILE_GST, '[]');

const readBills  = ()      => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeBills = (bills) => fs.writeFileSync(DATA_FILE, JSON.stringify(bills, null, 2));

const readGstBills  = ()      => JSON.parse(fs.readFileSync(DATA_FILE_GST, 'utf8'));
const writeGstBills = (bills) => fs.writeFileSync(DATA_FILE_GST, JSON.stringify(bills, null, 2));

// Standard Bills Routes
app.get('/api/bills', requireLogin, (req, res) => {
  try { res.json({ ok: true, bills: readBills() }); }
  catch(e) { res.status(500).json({ ok: false, message: 'Could not read bills.' }); }
});

app.post('/api/bills', requireLogin, (req, res) => {
  try {
    const bills = readBills();
    const bill  = {
      ...req.body,
      id: 'BILL-' + Date.now(),
      savedBy: req.session.user.username,
      savedByName: req.session.user.name,
      savedAt: new Date().toISOString()
    };
    bills.unshift(bill);
    writeBills(bills);
    res.json({ ok: true, message: 'Bill saved.', bill });
  } catch(e) { res.status(500).json({ ok: false, message: 'Could not save bill.' }); }
});

app.delete('/api/bills/:id', requireLogin, (req, res) => {
  try {
    writeBills(readBills().filter(b => b.id !== req.params.id));
    res.json({ ok: true, message: 'Bill deleted.' });
  } catch(e) { res.status(500).json({ ok: false, message: 'Could not delete bill.' }); }
});

// GST Bills Routes
app.get('/api/gst-bills', requireLogin, (req, res) => {
  try { res.json({ ok: true, bills: readGstBills() }); }
  catch(e) { res.status(500).json({ ok: false, message: 'Could not read GST bills.' }); }
});

app.post('/api/gst-bills', requireLogin, (req, res) => {
  try {
    const bills = readGstBills();
    const bill  = {
      ...req.body,
      id: 'GST-' + Date.now(),
      savedBy: req.session.user.username,
      savedByName: req.session.user.name,
      savedAt: new Date().toISOString()
    };
    bills.unshift(bill);
    writeGstBills(bills);
    res.json({ ok: true, message: 'GST Bill saved.', bill });
  } catch(e) { res.status(500).json({ ok: false, message: 'Could not save GST bill.' }); }
});

app.delete('/api/gst-bills/:id', requireLogin, (req, res) => {
  try {
    writeGstBills(readGstBills().filter(b => b.id !== req.params.id));
    res.json({ ok: true, message: 'GST Bill deleted.' });
  } catch(e) { res.status(500).json({ ok: false, message: 'Could not delete GST bill.' }); }
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Server running at: http://localhost:${PORT}`);
});
