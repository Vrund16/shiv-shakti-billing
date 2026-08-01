const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Connect MongoDB (Ensure MONGO_URI environment variable is set on Render)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shiv_shakti_tiles';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Flexible Schema to avoid strict validation save errors
const billSchema = new mongoose.Schema({
  billNo: { type: String, default: '' },         // Challan / Invoice No from Main Page
  officialBillNo: { type: String, default: '' }, // Editable Bill No in Summary Register
  date: { type: String, default: '' },
  custName: { type: String, default: '' },
  custPhone: { type: String, default: '' },
  custAddress: { type: String, default: '' },
  items: Array,
  isGstApplied: { type: Boolean, default: false },
  gstAmt: { type: String, default: '0.00' },
  grandTotal: { type: String, default: '0.00' },
  createdAt: { type: Date, default: Date.now }
});

const Bill = mongoose.model('Bill', billSchema);

// GET all bills (Newest first)
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// GET single bill
app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// POST save new bill
app.post('/api/bills', async (req, res) => {
  try {
    const newBill = new Bill(req.body);
    const saved = await newBill.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving bill:', err);
    res.status(500).json({ error: 'Failed to save bill to database' });
  }
});

// PUT update full bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const updated = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// PATCH update official bill number inline from Summary View
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
    res.status(500).json({ error: 'Failed to update official bill number' });
  }
});

// DELETE bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    await Bill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
