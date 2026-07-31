const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shiv_shakti_tiles';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Bill Schema & Model
const itemSchema = new mongoose.Schema({
  desc: { type: String, default: '' },
  qty: { type: SchemaTypes.Mixed, default: '' },
  rate: { type: SchemaTypes.Mixed, default: '' }
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

// ── API ROUTES ──

// Fetch all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
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
    res.status(500).json({ error: 'Failed to save bill' });
  }
});

// Update existing bill by ID
app.put('/api/bills/:id', async (req, res) => {
  try {
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedBill) return res.status(404).json({ error: 'Bill not found' });
    res.json(updatedBill);
  } catch (err) {
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
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Serve frontend HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Shiv Shakti Tiles Billing App running on http://localhost:${PORT}`);
});
