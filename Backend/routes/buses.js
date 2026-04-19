// routes/buses.js — handles routes, schedules, and seat availability

const express = require('express');
const pool    = require('../db');
const auth    = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /routes
// Returns all active routes.
// Protected: user must be logged in.
// ============================================================
router.get('/routes', auth, async (req, res) => {
  try {
    const [routes] = await pool.query(
      'SELECT * FROM routes WHERE is_active = TRUE ORDER BY route_name'
    );
    res.json({ success: true, data: routes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not fetch routes.' });
  }
});

// ============================================================
// GET /schedules?route_id=1
// Returns all active schedules for a given route,
// including bus info and how many seats are still free.
// ============================================================
router.get('/schedules', auth, async (req, res) => {
  const { route_id } = req.query;

  if (!route_id) {
    return res.status(400).json({ success: false, message: 'route_id is required.' });
  }

  try {
    // Join schedules + buses + routes in one query
    const [schedules] = await pool.query(
      `SELECT
          s.id            AS schedule_id,
          s.departure,
          s.fare,
          s.days_running,
          b.bus_number,
          b.bus_type,
          b.total_seats,
          r.route_name,
          -- Count confirmed bookings to calculate remaining seats
          (b.total_seats - COUNT(bk.id)) AS available_seats
       FROM schedules s
       JOIN buses b  ON s.bus_id   = b.id
       JOIN routes r ON s.route_id = r.id
       LEFT JOIN bookings bk ON bk.schedule_id = s.id AND bk.status = 'confirmed'
       WHERE s.route_id = ? AND s.is_active = TRUE
       GROUP BY s.id, b.id, r.id
       ORDER BY s.departure`,
      [route_id]
    );

    res.json({ success: true, data: schedules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not fetch schedules.' });
  }
});

// ============================================================
// GET /seats/:schedule_id
// Returns an array of 40 seat objects: { seat_number, is_booked }
// The frontend uses this to draw the seat-map grid.
// ============================================================
router.get('/seats/:schedule_id', auth, async (req, res) => {
  const { schedule_id } = req.params;

  try {
    // Get the total seat count for this schedule's bus
    const [busRows] = await pool.query(
      `SELECT b.total_seats FROM schedules s
       JOIN buses b ON s.bus_id = b.id
       WHERE s.id = ?`,
      [schedule_id]
    );

    if (busRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    const totalSeats = busRows[0].total_seats;

    // Get all CONFIRMED bookings for this schedule
    const [bookedRows] = await pool.query(
      `SELECT seat_number FROM bookings
       WHERE schedule_id = ? AND status = 'confirmed'`,
      [schedule_id]
    );

    const bookedSeats = new Set(bookedRows.map(r => r.seat_number));

    // Build seat list
    const seats = [];
    for (let i = 1; i <= totalSeats; i++) {
      seats.push({ seat_number: i, is_booked: bookedSeats.has(i) });
    }

    res.json({ success: true, data: seats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not fetch seat data.' });
  }
});

module.exports = router;
