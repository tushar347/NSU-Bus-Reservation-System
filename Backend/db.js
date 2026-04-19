// db.js — creates a reusable MySQL connection pool
// A "pool" keeps several connections open so the server
// doesn't open a brand-new connection on every request.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'nsu_bus_system',
  port:     process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit: 10,   // max 10 simultaneous DB connections
  queueLimit: 0
});

module.exports = pool;
