// ─── Database (now backed by a real SQLite database on the server) ───────────
// This used to hold hard-coded seed data and read/write localStorage("hospitalDB").
// The seed data now lives in server/database.js and is inserted into SQLite
// once, the first time the app runs. The browser just asks the server for the
// current state and sends the whole state back whenever something changes —
// exactly like it used to do with localStorage.getItem/setItem, except the
// server persists it into hospital.db instead.
const DB = {
  patients: [],
  doctors: [],
  appointments: [],
  admins: [],
  logs: [],
  nextIds: { patient: 1, doctor: 1, appointment: 1 }
};

const API_BASE = '/api';

// Load the current state from the SQLite-backed server into DB.
async function loadDB() {
  try {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const data = await res.json();
    Object.assign(DB, data);
  } catch (err) {
    console.error('Failed to load data from the SQLite backend:', err);
    alert('Could not connect to the server. Make sure you started it with "npm start" (see README) and are opening the app at http://localhost:3000.');
  }
}

// Persist the full in-memory DB back to SQLite via the server.
function saveDB() {
  fetch(`${API_BASE}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DB)
  }).catch(err => console.error('Failed to save data to the SQLite backend:', err));
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const Auth = {
  currentUser: null,
  currentRole: null,

  login(email, password, role) {
    let user = null;
    if (role === 'patient') user = DB.patients.find(p => p.email === email && p.password === password);
    else if (role === 'doctor') user = DB.doctors.find(d => d.email === email && d.password === password);
    else if (role === 'admin') user = DB.admins.find(a => a.email === email && a.password === password);

    if (user) {
      this.currentUser = user;
      this.currentRole = role;
      sessionStorage.setItem('auth', JSON.stringify({ user, role }));
      DB.logs.push({ action: `${role} login`, user: user.name, time: new Date().toISOString() });
      saveDB();
      return true;
    }
    return false;
  },

  logout() {
    this.currentUser = null;
    this.currentRole = null;
    sessionStorage.removeItem('auth');
    showPage('landing');
  },

  restore() {
    const saved = sessionStorage.getItem('auth');
    if (saved) {
      const { user, role } = JSON.parse(saved);
      this.currentUser = user;
      this.currentRole = role;
      return true;
    }
    return false;
  }
};

// ─── CRUD helpers ─────────────────────────────────────────────────────────────
const AppointmentService = {
  getAll() { return DB.appointments; },

  getByPatient(patientId) {
    return DB.appointments.filter(a => a.patientId === patientId);
  },

  getByDoctor(doctorId) {
    return DB.appointments.filter(a => a.doctorId === doctorId);
  },

  create(data) {
    // Check conflict
    const conflict = DB.appointments.find(a =>
      a.doctorId === data.doctorId && a.date === data.date && a.time === data.time && a.status !== 'Cancelled'
    );
    if (conflict) return { success: false, error: 'Time slot already booked' };

    const id = 'A' + String(DB.nextIds.appointment++).padStart(3, '0');
    const appt = { id, ...data, status: 'Pending', createdAt: new Date().toISOString().split('T')[0] };
    DB.appointments.push(appt);
    saveDB();
    return { success: true, appointment: appt };
  },

  updateStatus(id, status) {
    const appt = DB.appointments.find(a => a.id === id);
    if (appt) { appt.status = status; saveDB(); return true; }
    return false;
  },

  delete(id) {
    const idx = DB.appointments.findIndex(a => a.id === id);
    if (idx !== -1) { DB.appointments.splice(idx, 1); saveDB(); return true; }
    return false;
  },

  getBookedSlots(doctorId, date) {
    return DB.appointments
      .filter(a => a.doctorId === doctorId && a.date === date && a.status !== 'Cancelled')
      .map(a => a.time);
  }
};

const PatientService = {
  getAll() { return DB.patients; },
  getById(id) { return DB.patients.find(p => p.id === id); },

  register(data) {
    if (DB.patients.find(p => p.email === data.email)) return { success: false, error: 'Email already registered' };
    const id = 'P' + String(DB.nextIds.patient++).padStart(3, '0');
    const patient = { id, ...data, createdAt: new Date().toISOString().split('T')[0] };
    DB.patients.push(patient);
    saveDB();
    return { success: true, patient };
  },

  update(id, data) {
    const p = DB.patients.find(p => p.id === id);
    if (p) { Object.assign(p, data); saveDB(); return true; }
    return false;
  }
};

const DoctorService = {
  getAll() { return DB.doctors; },
  getById(id) { return DB.doctors.find(d => d.id === id); },

  register(data) {
    if (DB.doctors.find(d => d.email === data.email)) return { success: false, error: 'Email already registered' };
    const id = 'D' + String(DB.nextIds.doctor++).padStart(3, '0');
    const doctor = { id, ...data, avatar: '👨‍⚕️', createdAt: new Date().toISOString().split('T')[0] };
    DB.doctors.push(doctor);
    saveDB();
    return { success: true, doctor };
  },

  update(id, data) {
    const d = DB.doctors.find(d => d.id === id);
    if (d) { Object.assign(d, data); saveDB(); return true; }
    return false;
  },

  delete(id) {
    const idx = DB.doctors.findIndex(d => d.id === id);
    if (idx !== -1) { DB.doctors.splice(idx, 1); saveDB(); return true; }
    return false;
  }
};

// ─── Router ───────────────────────────────────────────────────────────────────
function showPage(pageId, params = {}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) {
    page.classList.add('active');
    if (window.pageRenderers && window.pageRenderers[pageId]) {
      window.pageRenderers[pageId](params);
    }
  }
}

// Initialize: kick off the fetch from the SQLite-backed server right away.
// app.js awaits this (window.DB_READY) before it restores a session / renders
// anything that depends on DB data, so nothing else needs to change.
window.DB_READY = loadDB();
