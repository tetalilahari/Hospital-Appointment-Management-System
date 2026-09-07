// ─── SQLite connection + schema bootstrap + one-time seed data ───────────────
// This is the direct replacement for the old localStorage("hospitalDB") blob.
// The same data that used to be hard-coded inside js/db.js is inserted here
// ONE TIME ONLY, the first time the app runs (i.e. when hospital.db is empty).

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_FILE = path.join(__dirname, '..', 'hospital.db');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables if they don't exist yet.
db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));

function seedIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM patients').get();
  if (c > 0) return; // already seeded / has real data, do nothing

  const insertPatient = db.prepare(`
    INSERT INTO patients (id, name, email, phone, age, gender, password, createdAt)
    VALUES (@id, @name, @email, @phone, @age, @gender, @password, @createdAt)
  `);
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (id, name, email, phone, specialty, experience, fee, password, availability, slots, avatar, createdAt)
    VALUES (@id, @name, @email, @phone, @specialty, @experience, @fee, @password, @availability, @slots, @avatar, @createdAt)
  `);
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (id, patientId, doctorId, date, time, status, reason, createdAt)
    VALUES (@id, @patientId, @doctorId, @date, @time, @status, @reason, @createdAt)
  `);
  const insertAdmin = db.prepare(`
    INSERT INTO admins (id, name, email, password)
    VALUES (@id, @name, @email, @password)
  `);
  const upsertMeta = db.prepare(`
    INSERT INTO meta (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const seed = db.transaction(() => {
    [
      { id: 'P001', name: 'Aarav Sharma', email: 'aarav@email.com', phone: '9876543210', age: 34, gender: 'Male', password: 'pass123', createdAt: '2024-01-15' },
      { id: 'P002', name: 'Priya Nair', email: 'priya@email.com', phone: '9123456780', age: 28, gender: 'Female', password: 'pass123', createdAt: '2024-02-10' },
      { id: 'P003', name: 'Ravi Teja', email: 'ravi@email.com', phone: '9988776655', age: 45, gender: 'Male', password: 'pass123', createdAt: '2024-03-05' },
    ].forEach(p => insertPatient.run(p));

    [
      { id: 'D001', name: 'Dr. Meera Krishnan', email: 'meera@hospital.com', phone: '9001122334', specialty: 'Cardiology', experience: 12, fee: 800, password: 'doc123', availability: ['Mon', 'Wed', 'Fri'], slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'], avatar: '👩‍⚕️' },
      { id: 'D002', name: 'Dr. Suresh Babu', email: 'suresh@hospital.com', phone: '9002233445', specialty: 'Neurology', experience: 8, fee: 1000, password: 'doc123', availability: ['Tue', 'Thu', 'Sat'], slots: ['09:30', '10:30', '11:30', '14:30', '15:30'], avatar: '👨‍⚕️' },
      { id: 'D003', name: 'Dr. Lakshmi Devi', email: 'lakshmi@hospital.com', phone: '9003344556', specialty: 'Pediatrics', experience: 15, fee: 600, password: 'doc123', availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], avatar: '👩‍⚕️' },
      { id: 'D004', name: 'Dr. Arjun Reddy', email: 'arjun@hospital.com', phone: '9004455667', specialty: 'Orthopedics', experience: 10, fee: 750, password: 'doc123', availability: ['Mon', 'Wed', 'Fri', 'Sat'], slots: ['09:00', '10:00', '11:00', '14:00', '15:00'], avatar: '👨‍⚕️' },
      { id: 'D005', name: 'Dr. Kavitha Rao', email: 'kavitha@hospital.com', phone: '9005566778', specialty: 'Dermatology', experience: 6, fee: 500, password: 'doc123', availability: ['Tue', 'Thu', 'Sat'], slots: ['10:00', '11:00', '12:00', '15:00', '16:00'], avatar: '👩‍⚕️' },
      { id: 'D006', name: 'Dr. Venkat Prasad', email: 'venkat@hospital.com', phone: '9006677889', specialty: 'Gastroenterology', experience: 14, fee: 900, password: 'doc123', availability: ['Mon', 'Tue', 'Thu', 'Fri'], slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'], avatar: '👨‍⚕️' },
    ].forEach(d => insertDoctor.run({
      ...d,
      availability: JSON.stringify(d.availability),
      slots: JSON.stringify(d.slots),
    }));

    [
      { id: 'A001', patientId: 'P001', doctorId: 'D001', date: '2025-03-20', time: '10:00', status: 'Confirmed', reason: 'Chest pain checkup', createdAt: '2025-03-10' },
      { id: 'A002', patientId: 'P002', doctorId: 'D003', date: '2025-03-21', time: '09:00', status: 'Pending', reason: 'Child fever', createdAt: '2025-03-11' },
      { id: 'A003', patientId: 'P003', doctorId: 'D002', date: '2025-03-22', time: '10:30', status: 'Completed', reason: 'Migraine follow-up', createdAt: '2025-03-09' },
      { id: 'A004', patientId: 'P001', doctorId: 'D004', date: '2025-03-25', time: '14:00', status: 'Pending', reason: 'Knee pain', createdAt: '2025-03-12' },
      { id: 'A005', patientId: 'P002', doctorId: 'D005', date: '2025-03-18', time: '11:00', status: 'Cancelled', reason: 'Skin rash', createdAt: '2025-03-08' },
    ].forEach(a => insertAppointment.run(a));

    insertAdmin.run({ id: 'ADM001', name: 'Admin User', email: 'admin@hospital.com', password: 'admin123' });

    upsertMeta.run({ key: 'nextId_patient', value: '4' });
    upsertMeta.run({ key: 'nextId_doctor', value: '7' });
    upsertMeta.run({ key: 'nextId_appointment', value: '6' });
  });

  seed();
  console.log('Seeded hospital.db with initial demo data.');
}

seedIfEmpty();

module.exports = db;
