// routes/auth.js — handles /signup and /login

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool     = require('../db');

const router = express.Router();

// ============================================================
// POST /signup
// Creates a new student account.
// ============================================================
router.post(
  '/signup',
  // --- Input validation rules (express-validator) ---
  [
    body('student_id')
      .trim()
      .notEmpty().withMessage('Student ID is required')
      .isLength({ min: 3, max: 20 }).withMessage('Student ID must be 3–20 characters'),

    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

    body('email')
      .trim()
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),

    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required')
      .isMobilePhone('any').withMessage('Valid phone number required'),

    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    // Check if validation failed
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { student_id, name, email, phone, password } = req.body;

    try {
      // Check for duplicate student_id or email
      const [existing] = await pool.query(
        'SELECT id FROM students WHERE student_id = ? OR email = ?',
        [student_id, email]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Student ID or email already registered. Please log in.'
        });
      }

      // Hash the password — bcrypt adds a "salt" automatically
      // 10 = cost factor (higher = slower = more secure)
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new student
      await pool.query(
        'INSERT INTO students (student_id, name, email, phone, password) VALUES (?, ?, ?, ?, ?)',
        [student_id, name, email, phone, hashedPassword]
      );

      res.status(201).json({ success: true, message: 'Account created successfully! Please log in.' });

    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
  }
);

// ============================================================
// POST /login
// Verifies credentials and returns a JWT token.
// ============================================================
router.post(
  '/login',
  [
    body('student_id').trim().notEmpty().withMessage('Student ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { student_id, password } = req.body;

    try {
      // Find student by student_id
      const [rows] = await pool.query(
        'SELECT * FROM students WHERE student_id = ?',
        [student_id]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid Student ID or password.' });
      }

      const student = rows[0];

      // Compare plain-text password against the stored hash
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Student ID or password.' });
      }

      // Create a JWT that expires in 8 hours
      const token = jwt.sign(
        { id: student.id, student_id: student.student_id, name: student.name },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        success: true,
        message: 'Login successful!',
        token,
        student: { id: student.id, student_id: student.student_id, name: student.name, email: student.email }
      });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
  }
);

module.exports = router;
