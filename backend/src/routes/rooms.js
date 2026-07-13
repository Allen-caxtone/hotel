const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// GET all rooms
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const rooms = db.prepare('SELECT * FROM rooms WHERE status = ? ORDER BY price_per_night ASC').all('available');
    const parsed = rooms.map(r => ({
      ...r,
      amenities: r.amenities ? r.amenities.split(',') : [],
      gallery_urls: r.gallery_urls ? JSON.parse(r.gallery_urls) : []
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET room by ID
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    room.amenities = room.amenities ? room.amenities.split(',') : [];
    room.gallery_urls = room.gallery_urls ? JSON.parse(room.gallery_urls) : [];
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET room availability for date range
router.get('/availability/search', (req, res) => {
  try {
    const { check_in, check_out, room_type } = req.query;
    const db = getDatabase();

    let query = `
      SELECT r.* FROM rooms r
      WHERE r.status = 'available'
    `;
    const params = [];

    if (room_type) {
      query += ' AND r.type = ?';
      params.push(room_type);
    }

    if (check_in && check_out) {
      query += ` AND r.id NOT IN (
        SELECT b.room_id FROM bookings b
        WHERE b.status NOT IN ('cancelled', 'rejected')
        AND b.check_in_date < ? AND b.check_out_date > ?
      )`;
      params.push(check_out, check_in);
    }

    query += ' ORDER BY r.price_per_night ASC';
    const rooms = db.prepare(query).all(...params);
    const parsed = rooms.map(r => ({
      ...r,
      amenities: r.amenities ? r.amenities.split(',') : [],
      gallery_urls: r.gallery_urls ? JSON.parse(r.gallery_urls) : []
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
