-- ============================================================
-- NSU Bus Management System — Database Schema
-- Run this file once to set up your database
-- ============================================================

-- Create & select the database
CREATE DATABASE IF NOT EXISTS nsu_bus_system;
USE nsu_bus_system;

-- ============================================================
-- TABLE 1: students
-- Stores every registered student (one row per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id          INT AUTO_INCREMENT PRIMARY KEY,   -- internal numeric PK
    student_id  VARCHAR(20)  NOT NULL UNIQUE,     -- e.g. "2211234" — must be unique
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    phone       VARCHAR(20)  NOT NULL,
    password    VARCHAR(255) NOT NULL,            -- bcrypt hash, never plain text
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 2: routes
-- Each route has a start and end point
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    route_name   VARCHAR(100) NOT NULL,           -- e.g. "Dhanmondi → NSU"
    origin       VARCHAR(100) NOT NULL,
    destination  VARCHAR(100) NOT NULL,
    is_active    BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABLE 3: buses
-- Physical buses (a bus belongs to no specific route — it is
-- assigned per schedule)
-- ============================================================
CREATE TABLE IF NOT EXISTS buses (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    bus_number   VARCHAR(20) NOT NULL UNIQUE,     -- e.g. "NSU-101"
    bus_type     ENUM('AC', 'Non-AC') NOT NULL,
    total_seats  INT NOT NULL DEFAULT 40,
    is_active    BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABLE 4: schedules
-- One schedule = one bus on one route at a specific time
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    route_id     INT NOT NULL,
    bus_id       INT NOT NULL,
    departure    TIME NOT NULL,                   -- e.g. "08:00:00"
    fare         DECIMAL(8,2) NOT NULL,           -- in BDT
    days_running VARCHAR(50) DEFAULT 'Mon-Fri',   -- which days this runs
    is_active    BOOLEAN DEFAULT TRUE,

    -- Foreign keys keep data consistent
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (bus_id)   REFERENCES buses(id)  ON DELETE CASCADE
);

-- ============================================================
-- TABLE 5: bookings
-- Each row = one student booking one seat on one schedule
-- The UNIQUE constraint on (schedule_id, seat_number) prevents
-- two students from booking the SAME seat on the same trip.
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  INT NOT NULL,
    schedule_id INT NOT NULL,
    seat_number INT NOT NULL,
    fare        DECIMAL(8,2) NOT NULL,
    status      ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
    booked_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- One seat per schedule — prevents double booking
    UNIQUE KEY unique_seat (schedule_id, seat_number),

    FOREIGN KEY (student_id)  REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

-- ============================================================
-- SAMPLE DATA — routes
-- ============================================================
INSERT INTO routes (route_name, origin, destination) VALUES
('Dhanmondi → NSU',   'Dhanmondi',    'NSU Bashundhara'),
('Mirpur → NSU',      'Mirpur-10',    'NSU Bashundhara'),
('Uttara → NSU',      'Uttara Sec-6', 'NSU Bashundhara'),
('Mohammadpur → NSU', 'Mohammadpur',  'NSU Bashundhara');

-- ============================================================
-- SAMPLE DATA — buses
-- ============================================================
INSERT INTO buses (bus_number, bus_type, total_seats) VALUES
('NSU-101', 'AC',     40),
('NSU-102', 'Non-AC', 40),
('NSU-103', 'AC',     40),
('NSU-104', 'Non-AC', 40);

-- ============================================================
-- SAMPLE DATA — schedules  (route_id, bus_id, time, fare)
-- ============================================================
INSERT INTO schedules (route_id, bus_id, departure, fare, days_running) VALUES
(1, 1, '07:30:00', 30.00, 'Mon-Fri'),  -- Dhanmondi AC
(1, 2, '08:00:00', 20.00, 'Mon-Fri'),  -- Dhanmondi Non-AC
(2, 3, '07:45:00', 25.00, 'Mon-Fri'),  -- Mirpur AC
(2, 4, '08:15:00', 15.00, 'Mon-Fri'),  -- Mirpur Non-AC
(3, 1, '07:00:00', 35.00, 'Mon-Fri'),  -- Uttara AC
(3, 2, '07:30:00', 25.00, 'Mon-Fri'),  -- Uttara Non-AC
(4, 3, '07:45:00', 22.00, 'Mon-Fri'),  -- Mohammadpur AC
(4, 4, '08:00:00', 15.00, 'Mon-Fri');  -- Mohammadpur Non-AC
