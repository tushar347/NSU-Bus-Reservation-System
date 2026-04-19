// server.js — the main entry point of the backend
// Run with: node server.js (or npm run dev for auto-reload)

require('dotenv').config();              // loads .env variables
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes    = require('./routes/auth');
const busRoutes     = require('./routes/buses');
const bookingRoutes = require('./routes/bookings');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
// Allow the frontend (on port 5500 or any origin) to call our API
app.use(cors({ origin: '*' }));

// Parse incoming JSON request bodies (req.body will be a JS object)
app.use(express.json());

// Serve the frontend HTML/CSS/JS files as static files
// e.g. http://localhost:3000/ → frontend/index.html
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- Routes ----
app.use('/api', authRoutes);       // /api/signup  /api/login
app.use('/api', busRoutes);        // /api/routes  /api/schedules  /api/seats/:id
app.use('/api', bookingRoutes);    // /api/book    /api/cancel/:id  /api/my-bookings

// ---- 404 fallback ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`✅ NSU Bus Server running at http://localhost:${PORT}`);
});
