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
// ────────────────────────────────────────────────────────────────────────────

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// DISABLE default index.html serving so login check works at '/'
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

app.get('/logout',   (req, res) => { req.session.destroy(); res.redirect('/login'); });

// Protected Pages (Triggers /login if not logged in)
app.get('/',         requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/gst-bill', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'gst-bill.html')));
app.get('/history',  requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')));

// ── API ──────────────────────────────────────────────────────────────────────
app.get('/api/me', requireLogin, (req, res) =>
  res.json({ name: req.session.user.name, username: req.session.user.username }));

app.get('/api/ping', requireLogin, (req, res) => res.json({ ok: true }));

// ── Bills data ───────────────────────────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bills.json');
if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const readBills  = ()      => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeBills = (bills) => fs.writeFileSync(DATA_FILE, JSON.stringify(bills, null, 2));

app.get('/api/bills', requireLogin, (req, res) => {
  try { res.json({ ok: true, bills: readBills() }); }
  catch(e) { res.status(500).json({ ok: false, message: 'Could not read bills.' }); }
});

app.get('/api/bills/:id', requireLogin, (req, res) => {
  try {
    const bill = readBills().find(b => b.id === req.params.id);
    if (!bill) return res.status(404).json({ ok: false, message: 'Bill not found.' });
    res.json({ ok: true, bill });
  } catch(e) { res.status(500).json({ ok: false, message: 'Error.' }); }
});

app.post('/api/bills', requireLogin, (req, res) => {
  try {
    const bills = readBills();
    const bill  = {
      ...req.body,
      id: 'BILL-' + Date.now(),
      savedBy: req.session.user.username,
      savedByName: req.session.user.name,
      savedAt: new Date().toISOString(),
      updatedAt: null
    };
    bills.unshift(bill);
    writeBills(bills);
    res.json({ ok: true, message: 'Bill saved.', bill });
  } catch(e) { res.status(500).json({ ok: false, message: 'Could not save bill.' }); }
});

app.put('/api/bills/:id', requireLogin, (req, res) => {
  try {
    const bills = readBills();
    const idx   = bills.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ ok: false, message: 'Bill not found.' });
    bills[idx] = {
      ...bills[idx], ...req.body,
      id: bills[idx].id,
      savedBy: bills[idx].savedBy,
      savedByName: bills[idx].savedByName,
      savedAt: bills[idx].savedAt,
      updatedBy: req.session.user.username,
      updatedByName: req.session.user.name,
      updatedAt: new Date().toISOString()
    };
    writeBills(bills);
    res.json({ ok: true, message: 'Bill updated.', bill: bills[idx] });
  } catch(e) { res.status(500).json({ ok: false, message: 'Could not update bill.' }); }
});

app.delete('/api/bills/:id', requireLogin, (req, res) => {
  try {
    writeBills(readBills().filter(b => b.id !== req.params.id));
    res.json({ ok: true, message: 'Bill deleted.' });
  } catch(e) { res.status(500).json({ ok: false, message: 'Could not delete bill.' }); }
});

// ── Start server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('\n==========================================');
  console.log('  SHIV SHAKTI TILES - BILLING SERVER');
  console.log('==========================================\n');
  console.log(`  ✅  Running at: http://localhost:${PORT}`);
  console.log(`  ✅  Login at:   http://localhost:${PORT}/login\n`);
  console.log('  Keep this window open.');
  console.log('  Press Ctrl+C to stop.\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use!`);
    console.error('    Fix: Double-click STOP.bat first, then try START.bat again.\n');
    process.exit(1);
  } else {
    throw err;
  }
});
