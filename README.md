# NSU-Bus-Reservation-System
A full-stack bus seat booking web app for North South University students, built with Node.js, Express, MySQL, and vanilla JavaScript.


**README.md:**

markdown
# NSU Bus Management System

A full-stack web application that allows North South University students
to book bus seats, view live schedules, and manage their travel bookings.

## Features

- Student registration and login with JWT authentication
- Browse active bus routes and departure schedules
- Interactive seat map with real-time availability
- Personal booking history with status tracking
- One-tap booking cancellation
- Secure password hashing with bcrypt

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: MySQL (XAMPP)
- Authentication: JSON Web Tokens (JWT), bcryptjs
- Validation: express-validator

## Project Structure


CSE 311_NSU Bus System/
├── Backend/
│   ├── middleware/auth.js
│   ├── routes/auth.js
│   ├── routes/bookings.js
│   ├── routes/buses.js
│   ├── db.js
│   ├── server.js
│   └── .env
├── Database/
│   └── schema.sql
└── Frontend/
    ├── CSS/
    ├── JS/
    ├── index.html
    └── dashboard.html


## Setup Instructions

1. Install Node.js and XAMPP
2. Start Apache and MySQL from the XAMPP Control Panel
3. Open phpMyAdmin and import Database/schema.sql
4. Create a .env file inside the Backend folder:


DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nsu_bus_system
DB_PORT=3306
JWT_SECRET=your_secret_key
PORT=3000


5. Open a terminal, navigate to the Backend folder, and run:


npm install
node server.js


6. Open Frontend/index.html in a browser using Live Server

## Course

CSE 311 - Database Systems
North South University
