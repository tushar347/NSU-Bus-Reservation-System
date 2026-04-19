// Frontend/js/auth.js
// NO require() here — this runs in the browser, not Node.js

const API = 'http://localhost:3000/api';

// ---- Tab switching ----
function showTab(tab) {
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin   = document.getElementById('tab-login');
  const tabSignup  = document.getElementById('tab-signup');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
  }
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
}

function setLoading(btnId, loading) {
  const btn    = document.getElementById(btnId);
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

function showError(divId, msg) {
  const el = document.getElementById(divId);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(divId) {
  document.getElementById(divId).classList.add('hidden');
}

if (localStorage.getItem('nsu_token')) {
  window.location.href = 'dashboard.html';
}

async function handleSignup(event) {
  event.preventDefault();
  hideError('signup-error');
  document.getElementById('signup-success').classList.add('hidden');
  setLoading('signup-btn', true);

  const student_id = document.getElementById('su-sid').value.trim();
  const name       = document.getElementById('su-name').value.trim();
  const email      = document.getElementById('su-email').value.trim();
  const phone      = document.getElementById('su-phone').value.trim();
  const password   = document.getElementById('su-pw').value;

  if (!student_id || !name || !email || !phone || !password) {
    showError('signup-error', 'Please fill in all fields.');
    setLoading('signup-btn', false);
    return;
  }
  if (password.length < 6) {
    showError('signup-error', 'Password must be at least 6 characters.');
    setLoading('signup-btn', false);
    return;
  }

  try {
    const response = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, name, email, phone, password })
    });

    const data = await response.json();

    if (data.success) {
      const successEl = document.getElementById('signup-success');
      successEl.textContent = '✅ Account created! Please log in.';
      successEl.classList.remove('hidden');
      document.getElementById('signupForm').reset();
      setTimeout(() => showTab('login'), 2000);
    } else {
      const msg = data.errors ? data.errors[0].msg : (data.message || 'Signup failed.');
      showError('signup-error', msg);
    }

  } catch (err) {
    console.error('Signup error:', err);
    showError('signup-error', '❌ Cannot connect to server. Is "node server.js" running in VS Code terminal?');
  } finally {
    setLoading('signup-btn', false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  hideError('login-error');
  setLoading('login-btn', true);

  const student_id = document.getElementById('login-sid').value.trim();
  const password   = document.getElementById('login-pw').value;

  if (!student_id || !password) {
    showError('login-error', 'Please enter Student ID and password.');
    setLoading('login-btn', false);
    return;
  }

  try {
    const response = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, password })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('nsu_token', data.token);
      localStorage.setItem('nsu_student', JSON.stringify(data.student));
      window.location.href = 'dashboard.html';
    } else {
      const msg = data.errors ? data.errors[0].msg : (data.message || 'Login failed.');
      showError('login-error', msg);
    }

  } catch (err) {
    console.error('Login error:', err);
    showError('login-error', '❌ Cannot connect to server. Is "node server.js" running in VS Code terminal?');
  } finally {
    setLoading('login-btn', false);
  }
}