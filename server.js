const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware (REQUIRED for form submissions)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection (Use your connection string or environment variable)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shiv_shakti_billing';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Bill Schema & Model
const billSchema = new mongoose.Schema({
  billNo: String,
  date: String,
  custName: String,
  custPhone: String,
  custAddress: String,
  items: Array,
  isGstApplied: Boolean,
  gstAmt: String,
  grandTotal: String,
  createdAt: { type: Date, default: Date.now }
});

const Bill = mongoose.model('Bill', billSchema);

/* ── AUTHENTICATION ROUTES ── */

// Serve Login Page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle Login POST (Form submission fallback & direct post)
app.post('/login', (req, res) => {
  // Accepts any login attempt for admin access and redirects to main app
  res.redirect('/index.html');
});

// Handle API Login (JSON submission)
app.post('/api/login', (req, res) => {
  res.json({ success: true, redirect: '/index.html' });
});

/* ── BILL API ROUTES ── */

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get single bill by ID
app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching bill' });
  }
});

// Create new bill
app.post('/api/bills', async (req, res) => {
  try {
    const newBill = new Bill(req.body);
    const saved = await newBill.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save bill' });
  }
});

// Update bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const updated = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Delete bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    await Bill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Fallback route for single page app navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
