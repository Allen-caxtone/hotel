const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');

// CREATE booking
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const {
      room_id, guest_name, guest_email, guest_phone,
      check_in_date, check_out_date, adults, children,
      special_requests
    } = req.body;

    // Validation
    if (!room_id || !guest_name || !guest_email || !guest_phone || !check_in_date || !check_out_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get room
    const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND status = ?').get(room_id, 'available');
    if (!room) return res.status(404).json({ error: 'Room not available' });

    // Check for conflicts
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE room_id = ? AND status NOT IN ('cancelled', 'rejected')
      AND check_in_date < ? AND check_out_date > ?
    `).get(room_id, check_out_date, check_in_date);

    if (conflict) {
      return res.status(409).json({ error: 'Room is already booked for these dates' });
    }

    // Calculate
    const nights = Math.ceil(
      (new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24)
    );
    const total_amount = nights * room.price_per_night;
    const bookingId = 'BK-' + uuidv4().slice(0, 8).toUpperCase();

    const booking = {
      id: bookingId,
      room_id, guest_name, guest_email, guest_phone,
      check_in_date, check_out_date,
      adults: adults || 1,
      children: children || 0,
      total_nights: nights,
      total_amount,
      special_requests: special_requests || null,
      status: 'pending',
      payment_status: 'unpaid'
    };

    const stmt = db.prepare(`
      INSERT INTO bookings (id, room_id, guest_name, guest_email, guest_phone,
        check_in_date, check_out_date, adults, children, total_nights, total_amount,
        special_requests, status, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      booking.id, booking.room_id, booking.guest_name, booking.guest_email, booking.guest_phone,
      booking.check_in_date, booking.check_out_date, booking.adults, booking.children,
      booking.total_nights, booking.total_amount, booking.special_requests,
      booking.status, booking.payment_status
    );

    res.status(201).json({ ...booking, room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all bookings (with optional filters)
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { status, search } = req.query;

    let query = `
      SELECT b.*, r.name as room_name, r.type as room_type, r.image_url as room_image
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (b.guest_name LIKE ? OR b.guest_email LIKE ? OR b.id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY b.created_at DESC';
    const bookings = db.prepare(query).all(...params);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET booking by ID
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const booking = db.prepare(`
      SELECT b.*, r.name as room_name, r.type as room_type, r.image_url as room_image,
             r.price_per_night, r.bed_type, r.amenities
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const payment = db.prepare('SELECT * FROM payments WHERE booking_id = ?').all(booking.id);
    booking.payments = payment;
    booking.room_amenities = booking.amenities ? booking.amenities.split(',') : [];
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE booking status
router.patch('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { status, payment_status, special_requests } = req.body;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (payment_status) { updates.push('payment_status = ?'); params.push(payment_status); }
    if (special_requests !== undefined) { updates.push('special_requests = ?'); params.push(special_requests); }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      params.push(req.params.id);
      db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare(`
      SELECT b.*, r.name as room_name, r.type as room_type
      FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (cancel) booking
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ message: 'Booking cancelled successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
