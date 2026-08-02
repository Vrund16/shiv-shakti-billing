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

// Supports MONGO_URI or MONGODB_URI automatically
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/shiv_shakti_tiles';

console.log('Attempting MongoDB connection...');

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// Flexible Schema
const billSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Bill = mongoose.model('Bill', billSchema);

// HTML Fallback Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// GET all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch bills' });
  }
});

// GET single bill
app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch bill' });
  }
});

// POST save new bill
app.post('/api/bills', async (req, res) => {
  try {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
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

// PUT update full bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const updated = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update bill' });
  }
});

// PATCH update official bill number
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

// DELETE bill
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
