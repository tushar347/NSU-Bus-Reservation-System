// js/dashboard.js — all dashboard logic

const API = 'http://localhost:3000/api';

// ---- State variables ----
let token       = null;
let student     = null;
let selectedSeat = null;   // currently chosen seat number
let currentFare  = 0;

// =============================================
// INIT — runs when the page loads
// =============================================
(function init() {
  token   = localStorage.getItem('nsu_token');
  student = JSON.parse(localStorage.getItem('nsu_student') || 'null');

  // If not logged in, redirect to login page
  if (!token || !student) {
    window.location.href = 'index.html';
    return;
  }

  // Show student's first name in the navbar
  document.getElementById('nav-name').textContent = student.name.split(' ')[0];

  loadRoutes();
  loadMyBookings();
})();

// ---- Authenticated fetch helper ----
// Adds the JWT token to every API request automatically
async function apiFetch(url, options = {}) {
  options.headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  const res = await fetch(`${API}${url}`, options);
  // If server says 401/403, the token expired — force re-login
  if (res.status === 401 || res.status === 403) {
    logout();
  }
  return res.json();
}

// =============================================
// ROUTES — populate the route dropdown
// =============================================
async function loadRoutes() {
  const data = await apiFetch('/routes');
  const select = document.getElementById('routeSelect');

  if (data.success && data.data.length) {
    data.data.forEach(r => {
      const opt = document.createElement('option');
      opt.value       = r.id;
      opt.textContent = r.route_name;
      select.appendChild(opt);
    });
  } else {
    select.innerHTML = '<option>No routes available</option>';
  }
}

// =============================================
// SCHEDULES — load when route changes
// =============================================
async function loadSchedules() {
  const routeId = document.getElementById('routeSelect').value;
  const schedSel = document.getElementById('scheduleSelect');

  // Reset downstream UI
  schedSel.innerHTML = '<option value="">— Select Schedule —</option>';
  schedSel.disabled = true;
  document.getElementById('seat-section').style.display = 'none';
  document.getElementById('fare-badge').classList.add('hidden');
  document.getElementById('book-btn').disabled = true;
  selectedSeat = null;

  if (!routeId) return;

  const data = await apiFetch(`/schedules?route_id=${routeId}`);

  if (data.success && data.data.length) {
    data.data.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.schedule_id;
      // Store fare in a data attribute for easy access
      opt.dataset.fare = s.fare;
      opt.textContent = `${s.departure.substring(0,5)} • ${s.bus_type} Bus (${s.bus_number}) — ${s.available_seats} seats left`;
      schedSel.appendChild(opt);
    });
    schedSel.disabled = false;
  } else {
    schedSel.innerHTML = '<option>No schedules for this route</option>';
  }
}

// =============================================
// SEATS — draw the seat grid when schedule changes
// =============================================
async function loadSeats() {
  const schedSel   = document.getElementById('scheduleSelect');
  const scheduleId = schedSel.value;
  selectedSeat     = null;
  document.getElementById('book-btn').disabled = true;
  document.getElementById('selected-seat-label').textContent = '';

  if (!scheduleId) return;

  // Show fare
  const fare = schedSel.selectedOptions[0].dataset.fare;
  currentFare = fare;
  document.getElementById('fare-amount').textContent = `৳${parseFloat(fare).toFixed(2)}`;
  document.getElementById('fare-badge').classList.remove('hidden');

  // Fetch seat availability
  const data = await apiFetch(`/seats/${scheduleId}`);
  if (!data.success) return;

  const grid = document.getElementById('seat-grid');
  grid.innerHTML = '';
  document.getElementById('seat-section').style.display = 'block';

  data.data.forEach(seat => {
    const btn = document.createElement('button');
    btn.textContent = seat.seat_number;
    btn.className   = `seat-btn ${seat.is_booked ? 'taken' : ''}`;
    btn.disabled    = seat.is_booked;

    if (!seat.is_booked) {
      btn.onclick = () => selectSeat(seat.seat_number, btn);
    }

    grid.appendChild(btn);
  });
}

// ---- Called when user clicks a seat ----
function selectSeat(seatNumber, btn) {
  // De-select previous choice
  document.querySelectorAll('.seat-btn.selected').forEach(b => b.classList.remove('selected'));

  btn.classList.add('selected');
  selectedSeat = seatNumber;

  document.getElementById('selected-seat-label').textContent =
    `Selected: Seat ${seatNumber}`;
  document.getElementById('book-btn').disabled = false;
}

// =============================================
// BOOK — confirm the booking
// =============================================
async function bookSeat() {
  const scheduleId = document.getElementById('scheduleSelect').value;

  if (!scheduleId || !selectedSeat) {
    showBookError('Please select a schedule and a seat first.');
    return;
  }

  setBookingLoading(true);
  hideBookError();

  const data = await apiFetch('/book', {
    method: 'POST',
    body: JSON.stringify({ schedule_id: parseInt(scheduleId), seat_number: selectedSeat }),
  });

  setBookingLoading(false);

  if (data.success) {
    showToast(`🎉 Seat ${selectedSeat} booked! Fare: ৳${parseFloat(data.fare).toFixed(2)}`);
    // Refresh seat map and booking history
    await loadSeats();
    await loadMyBookings();
  } else {
    showBookError(data.message || 'Booking failed.');
    // Refresh seat map so the newly taken seat shows as taken
    await loadSeats();
  }
}

// =============================================
// MY BOOKINGS — load and render booking history
// =============================================
async function loadMyBookings() {
  const container = document.getElementById('bookings-container');
  container.innerHTML = '<p class="empty-note">Loading…</p>';

  const data = await apiFetch('/my-bookings');

  if (!data.success || data.data.length === 0) {
    container.innerHTML = '<p class="empty-note">No bookings yet. Book your first ride! 🚌</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'bookings-grid';

  data.data.forEach(b => {
    const card = document.createElement('div');
    card.className = `booking-card ${b.status === 'cancelled' ? 'cancelled' : ''}`;

    const dep = b.departure ? b.departure.substring(0, 5) : '—';
    const date = new Date(b.booked_at).toLocaleDateString('en-BD', { day:'numeric', month:'short', year:'numeric' });
    const typeTag = b.bus_type === 'AC'
      ? `<span class="tag ac">AC</span>`
      : `<span class="tag non-ac">Non-AC</span>`;
    const statusBadge = b.status === 'confirmed'
      ? `<span class="badge-confirmed">✓ Confirmed</span>`
      : `<span class="badge-cancelled">✗ Cancelled</span>`;
    const cancelBtn = b.status === 'confirmed'
      ? `<button class="btn-cancel" onclick="cancelBooking(${b.booking_id})">Cancel</button>`
      : '';

    card.innerHTML = `
      <div class="card-route">🚌 ${b.route_name}</div>
      <div class="card-meta">
        <span class="tag">${dep}</span>
        ${typeTag}
        <span class="tag">${b.bus_number}</span>
        <span class="tag seat">Seat ${b.seat_number}</span>
      </div>
      <div style="font-size:0.78rem; color:var(--muted);">Booked on ${date}</div>
      <div class="card-footer">
        <div class="card-fare">৳${parseFloat(b.fare).toFixed(2)} <span>BDT</span></div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${statusBadge}
          ${cancelBtn}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

// =============================================
// CANCEL a booking
// =============================================
async function cancelBooking(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;

  const data = await apiFetch(`/cancel/${bookingId}`, { method: 'DELETE' });

  if (data.success) {
    showToast('Booking cancelled.');
    loadMyBookings();
    // Refresh seat map if on same schedule
    const scheduleId = document.getElementById('scheduleSelect').value;
    if (scheduleId) loadSeats();
  } else {
    alert(data.message || 'Could not cancel booking.');
  }
}

// =============================================
// LOGOUT
// =============================================
function logout() {
  localStorage.removeItem('nsu_token');
  localStorage.removeItem('nsu_student');
  window.location.href = 'index.html';
}

// ---- UI Helpers ----
function setBookingLoading(loading) {
  const btn    = document.getElementById('book-btn');
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

function showBookError(msg) {
  const el = document.getElementById('book-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideBookError() {
  document.getElementById('book-error').classList.add('hidden');
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}
