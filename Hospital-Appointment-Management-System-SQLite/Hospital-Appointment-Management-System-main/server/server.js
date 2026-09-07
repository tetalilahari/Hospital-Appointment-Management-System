// ─── Express server ────────────────────────────────────────────────────────
// Serves the existing frontend (index.html/css/js) unchanged, and exposes a
// small REST API (GET/POST /api/state) backed by SQLite instead of the
// browser's localStorage.
//
// The frontend still keeps its whole in-memory DB object and mutates it the
// same way it always did (see js/db.js) — the only thing that changed is
// where that object is loaded from / saved to.

const path = require('path');
const express = require('express');
const db = require('./database');

const app = express();
const PROJECT_ROOT = path.join(__dirname, '..');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(PROJECT_ROOT));

// ─── Read the full app state out of SQLite ────────────────────────────────
function getState() {
  const patients = db.prepare('SELECT * FROM patients ORDER BY id').all();

  const doctors = db.prepare('SELECT * FROM doctors ORDER BY id').all().map(d => ({
    ...d,
    availability: d.availability ? JSON.parse(d.availability) : [],
    slots: d.slots ? JSON.parse(d.slots) : [],
  }));

  const appointments = db.prepare('SELECT * FROM appointments ORDER BY id').all();
  const admins = db.prepare('SELECT * FROM admins ORDER BY id').all();
  const logs = db.prepare('SELECT action, user, time FROM logs ORDER BY rowid ASC').all();

  const metaRows = db.prepare('SELECT key, value FROM meta').all();
  const nextIds = { patient: 1, doctor: 1, appointment: 1 };
  metaRows.forEach(({ key, value }) => {
    if (key === 'nextId_patient') nextIds.patient = parseInt(value, 10);
    if (key === 'nextId_doctor') nextIds.doctor = parseInt(value, 10);
    if (key === 'nextId_appointment') nextIds.appointment = parseInt(value, 10);
  });

  return { patients, doctors, appointments, admins, logs, nextIds };
}

// ─── Overwrite SQLite with the full app state sent by the browser ─────────
// (Mirrors the old localStorage.setItem('hospitalDB', JSON.stringify(DB)) —
// the frontend still sends its whole DB object on every change.)
const saveState = db.transaction((state) => {
  // Appointments reference patients/doctors via FOREIGN KEY, so their rows
  // must be cleared before we touch patients/doctors, and re-inserted only
  // after the new patients/doctors rows exist.
  db.prepare('DELETE FROM appointments').run();

  db.prepare('DELETE FROM patients').run();
  const insertPatient = db.prepare(`
    INSERT INTO patients (id, name, email, phone, age, gender, password, createdAt)
    VALUES (@id, @name, @email, @phone, @age, @gender, @password, @createdAt)
  `);
  (state.patients || []).forEach(p => insertPatient.run({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone ?? null,
    age: p.age ?? null,
    gender: p.gender ?? null,
    password: p.password ?? null,
    createdAt: p.createdAt ?? null,
  }));

  db.prepare('DELETE FROM doctors').run();
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (id, name, email, phone, specialty, experience, fee, password, availability, slots, avatar, createdAt)
    VALUES (@id, @name, @email, @phone, @specialty, @experience, @fee, @password, @availability, @slots, @avatar, @createdAt)
  `);
  (state.doctors || []).forEach(d => insertDoctor.run({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone ?? null,
    specialty: d.specialty ?? null,
    experience: d.experience ?? null,
    fee: d.fee ?? null,
    password: d.password ?? null,
    availability: JSON.stringify(d.availability || []),
    slots: JSON.stringify(d.slots || []),
    avatar: d.avatar ?? null,
    createdAt: d.createdAt ?? null,
  }));

  const insertAppointment = db.prepare(`
    INSERT INTO appointments (id, patientId, doctorId, date, time, status, reason, createdAt)
    VALUES (@id, @patientId, @doctorId, @date, @time, @status, @reason, @createdAt)
  `);
  (state.appointments || []).forEach(a => insertAppointment.run({
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    date: a.date ?? null,
    time: a.time ?? null,
    status: a.status ?? null,
    reason: a.reason ?? null,
    createdAt: a.createdAt ?? null,
  }));

  db.prepare('DELETE FROM admins').run();
  const insertAdmin = db.prepare(`
    INSERT INTO admins (id, name, email, password)
    VALUES (@id, @name, @email, @password)
  `);
  (state.admins || []).forEach(a => insertAdmin.run({
    id: a.id,
    name: a.name ?? null,
    email: a.email ?? null,
    password: a.password ?? null,
  }));

  db.prepare('DELETE FROM logs').run();
  const insertLog = db.prepare('INSERT INTO logs (action, user, time) VALUES (@action, @user, @time)');
  (state.logs || []).forEach(l => insertLog.run({
    action: l.action ?? null,
    user: l.user ?? null,
    time: l.time ?? null,
  }));

  const upsertMeta = db.prepare(`
    INSERT INTO meta (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const nextIds = state.nextIds || {};
  upsertMeta.run({ key: 'nextId_patient', value: String(nextIds.patient ?? 1) });
  upsertMeta.run({ key: 'nextId_doctor', value: String(nextIds.doctor ?? 1) });
  upsertMeta.run({ key: 'nextId_appointment', value: String(nextIds.appointment ?? 1) });
});

// ─── API routes ────────────────────────────────────────────────────────────
app.get('/api/state', (req, res) => {
  try {
    res.json(getState());
  } catch (err) {
    console.error('GET /api/state failed:', err);
    res.status(500).json({ error: 'Failed to load data from the database.' });
  }
});

app.post('/api/state', (req, res) => {
  try {
    saveState(req.body || {});
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/state failed:', err);
    res.status(500).json({ error: 'Failed to save data to the database.' });
  }
});

// Anything else (deep links like a refresh on the SPA) falls back to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hospital Appointment Management System running at http://localhost:${PORT}`);
  console.log(`SQLite database file: ${path.join(PROJECT_ROOT, 'hospital.db')}`);
});
