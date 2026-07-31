const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shiv_shakti_tiles';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB with connection event monitoring
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully.'))
  .catch((err) => console.error('❌ MongoDB initial connection error:', err));

mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB connection lost. Attempting to reconnect...');
});

// Schemas & Models
const itemSchema = new mongoose.Schema({
  desc: { type: String, default: '' },
  qty: { type: mongoose.Schema.Types.Mixed, default: '' },
  rate: { type: mongoose.Schema.Types.Mixed, default: '' }
}, { _id: false });

const billSchema = new mongoose.Schema({
  billNo: { type: String, default: '' },
  date: { type: String, default: '' },
  custName: { type: String, default: '' },
  custPhone: { type: String, default: '' },
  custAddress: { type: String, default: '' },
  items: [itemSchema],
  isGstApplied: { type: Boolean, default: false },
  gstAmt: { type: String, default: '0.00' },
  grandTotal: { type: String, default: '0.00' },
  registerBillNo: { type: String, default: '' }
}, { timestamps: true });

const Bill = mongoose.model('Bill', billSchema);

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.status(200).json({ status: 'OK', database: dbState });
});

// ── API ROUTES ──

// Fetch all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Fetch single bill by ID
app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    console.error(`Error fetching bill ${req.params.id}:`, err);
    res.status(500).json({ error: 'Error fetching bill' });
  }
});

// Create new bill
app.post('/api/bills', async (req, res) => {
  try {
    const newBill = new Bill(req.body);
    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (err) {
    console.error('Error creating bill:', err);
    res.status(500).json({ error: 'Failed to save bill' });
  }
});

// Update existing bill by ID
app.put('/api/bills/:id', async (req, res) => {
  try {
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedBill) return res.status(404).json({ error: 'Bill not found' });
    res.json(updatedBill);
  } catch (err) {
    console.error(`Error updating bill ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Delete bill by ID
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const deletedBill = await Bill.findByIdAndDelete(req.params.id);
    if (!deletedBill) return res.status(404).json({ error: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    console.error(`Error deleting bill ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Fallback route to serve main page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Shiv Shakti Tiles Billing App running on port ${PORT}`);
});

// Graceful Shutdown for Cloud Deployments (Render / Docker)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});
