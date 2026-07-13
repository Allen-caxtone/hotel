const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');

// POST contact form
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    const id = 'MSG-' + uuidv4().slice(0, 8).toUpperCase();
    db.prepare('INSERT INTO contacts (id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, email, subject || 'General Inquiry', message);
    res.status(201).json({ success: true, id, message: 'Your message has been received. We will get back to you shortly.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST newsletter subscription
router.post('/newsletter', (req, res) => {
  try {
    const db = getDatabase();
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(email);
    if (existing) {
      return res.json({ success: true, message: 'You are already subscribed!' });
    }

    const id = 'SUB-' + uuidv4().slice(0, 8).toUpperCase();
    db.prepare('INSERT INTO newsletter_subscribers (id, email) VALUES (?, ?)').run(id, email);
    res.status(201).json({ success: true, message: 'Successfully subscribed to our newsletter!' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.json({ success: true, message: 'You are already subscribed!' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET all contacts (admin)
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 50').all();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
