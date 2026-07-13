const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// GET dashboard statistics
router.get('/stats', (req, res) => {
  try {
    const db = getDatabase();

    const stats = {
      totalBookings: db.prepare('SELECT COUNT(*) as count FROM bookings').get().count,
      confirmedBookings: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").get().count,
      pendingBookings: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'").get().count,
      cancelledBookings: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'").get().count,
      totalRevenue: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = 'confirmed' AND payment_status = 'paid'").get().total,
      paidRevenue: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE payment_status = 'paid'").get().total,
      occupancyRate: 0,
      totalRooms: db.prepare('SELECT COUNT(*) as count FROM rooms WHERE status = ?').get('available').count,
      totalGuests: db.prepare('SELECT COALESCE(SUM(adults + children), 0) as total FROM bookings WHERE status = ?').get('confirmed').total,
      recentBookings: db.prepare(`
        SELECT b.*, r.name as room_name, r.type as room_type
        FROM bookings b JOIN rooms r ON b.room_id = r.id
        ORDER BY b.created_at DESC LIMIT 5
      `).all(),
      bookingsByMonth: db.prepare(`
        SELECT strftime('%Y-%m', check_in_date) as month, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings WHERE status != 'cancelled'
        GROUP BY month ORDER BY month DESC LIMIT 12
      `).all(),
      bookingsByRoomType: db.prepare(`
        SELECT r.type, COUNT(*) as count, COALESCE(SUM(b.total_amount), 0) as revenue
        FROM bookings b JOIN rooms r ON b.room_id = r.id
        WHERE b.status != 'cancelled'
        GROUP BY r.type
      `).all(),
      unreadMessages: db.prepare("SELECT COUNT(*) as count FROM contacts WHERE status = 'unread'").get().count,
      newsletterSubscribers: db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers').get().count,
      averageRating: db.prepare('SELECT COALESCE(ROUND(AVG(rating), 1), 0) as avg FROM reviews WHERE status = ?').get('approved').avg
    };

    // Calculate occupancy
    const today = new Date().toISOString().split('T')[0];
    const occupied = db.prepare(`
      SELECT COUNT(DISTINCT room_id) as count FROM bookings
      WHERE status IN ('confirmed', 'checked_in')
      AND check_in_date <= ? AND check_out_date >= ?
    `).get(today, today).count;
    stats.occupiedRooms = occupied;
    stats.occupancyRate = stats.totalRooms > 0 ? Math.round((occupied / stats.totalRooms) * 100) : 0;

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent activity
router.get('/activity', (req, res) => {
  try {
    const db = getDatabase();
    const bookings = db.prepare(`
      SELECT id, guest_name, room_id, total_amount, status, payment_status, created_at,
             'booking' as type
      FROM bookings ORDER BY created_at DESC LIMIT 10
    `).all();

    const payments = db.prepare(`
      SELECT p.id, p.booking_id, p.amount, p.status, p.mpesa_receipt, p.created_at,
             'payment' as type
      FROM payments p ORDER BY created_at DESC LIMIT 10
    `).all();

    const activity = [...bookings, ...payments]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15);

    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings chart data
router.get('/chart-data', (req, res) => {
  try {
    const db = getDatabase();
    const days = parseInt(req.query.days) || 30;

    const dailyData = db.prepare(`
      WITH RECURSIVE dates(d) AS (
        SELECT date('now', '-${days} days')
        UNION ALL
        SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
      )
      SELECT dates.d as date,
        COALESCE(b.booking_count, 0) as bookings,
        COALESCE(b.revenue, 0) as revenue
      FROM dates
      LEFT JOIN (
        SELECT check_in_date, COUNT(*) as booking_count, COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings WHERE status != 'cancelled'
        GROUP BY check_in_date
      ) b ON dates.d = b.check_in_date
      ORDER BY dates.d ASC
    `).all();

    res.json(dailyData);
  } catch (err) {
    // Fallback if recursive CTE not supported
    try {
      const db = getDatabase();
      const data = db.prepare(`
        SELECT check_in_date as date, COUNT(*) as bookings, COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings WHERE status != 'cancelled'
        AND check_in_date >= date('now', '-${days} days')
        GROUP BY check_in_date ORDER BY check_in_date ASC
      `).all();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

module.exports = router;
