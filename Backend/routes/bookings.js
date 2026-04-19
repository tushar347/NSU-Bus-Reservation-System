// routes/bookings.js — book a seat, cancel, view history

const express = require('express');
const { body, validationResult } = require('express-validator');
const pool    = require('../db');
const auth    = require('../middleware/auth');

const router = express.Router();

// ============================================================
// POST /book
// Books a seat. Prevents double-booking via DB UNIQUE constraint.
// ============================================================
router.post(
  '/book',
  auth,
  [
    body('schedule_id').isInt({ min: 1 }).withMessage('Valid schedule_id required'),
    body('seat_number').isInt({ min: 1, max: 40 }).withMessage('Seat must be 1–40'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schedule_id, seat_number } = req.body;
    const student_db_id = req.user.id; // comes from the JWT

    try {
      // 1. Check the schedule exists and get the fare
      const [schedRows] = await pool.query(
        'SELECT fare FROM schedules WHERE id = ? AND is_active = TRUE',
        [schedule_id]
      );

      if (schedRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Schedule not found.' });
      }

      const fare = schedRows[0].fare;

      // 2. Check: has THIS student already booked THIS schedule?
      const [alreadyBooked] = await pool.query(
        `SELECT id FROM bookings
         WHERE student_id = ? AND schedule_id = ? AND status = 'confirmed'`,
        [student_db_id, schedule_id]
      );

      if (alreadyBooked.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'You already have a booking on this schedule.'
        });
      }

      // 3. Insert booking — the UNIQUE(schedule_id, seat_number) constraint
      //    will throw a duplicate-key error if someone else just took the seat.
      await pool.query(
        'INSERT INTO bookings (student_id, schedule_id, seat_number, fare) VALUES (?, ?, ?, ?)',
        [student_db_id, schedule_id, seat_number, fare]
      );

      res.status(201).json({
        success: true,
        message: `Seat ${seat_number} booked successfully!`,
        fare
      });

    } catch (err) {
      // MySQL error 1062 = duplicate entry (seat already taken)
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: `Seat ${seat_number} is already taken. Please choose another seat.`
        });
      }
      console.error('Booking error:', err);
      res.status(500).json({ success: false, message: 'Booking failed. Please try again.' });
    }
  }
);

// ============================================================
// DELETE /cancel/:booking_id
// Cancels a booking. Only the owner can cancel their own booking.
// ============================================================
router.delete('/cancel/:booking_id', auth, async (req, res) => {
  const { booking_id } = req.params;
  const student_db_id  = req.user.id;

  try {
    // Verify the booking belongs to this student
    const [rows] = await pool.query(
      `SELECT id, status FROM bookings WHERE id = ? AND student_id = ?`,
      [booking_id, student_db_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (rows[0].status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    // Soft-delete: set status to 'cancelled' rather than deleting the row
    // (keeps history intact)
    await pool.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
      [booking_id]
    );

    res.json({ success: true, message: 'Booking cancelled successfully.' });

  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ success: false, message: 'Could not cancel booking.' });
  }
});

// ============================================================
// GET /my-bookings
// Returns the logged-in student's full booking history.
// ============================================================
router.get('/my-bookings', auth, async (req, res) => {
  const student_db_id = req.user.id;

  try {
    const [bookings] = await pool.query(
      `SELECT
          bk.id          AS booking_id,
          bk.seat_number,
          bk.fare,
          bk.status,
          bk.booked_at,
          r.route_name,
          r.origin,
          r.destination,
          b.bus_number,
          b.bus_type,
          s.departure
       FROM bookings bk
       JOIN schedules s ON bk.schedule_id = s.id
       JOIN routes r    ON s.route_id     = r.id
       JOIN buses b     ON s.bus_id       = b.id
       WHERE bk.student_id = ?
       ORDER BY bk.booked_at DESC`,
      [student_db_id]
    );

    res.json({ success: true, data: bookings });

  } catch (err) {
    console.error('My-bookings error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch bookings.' });
  }
});

module.exports = router;
