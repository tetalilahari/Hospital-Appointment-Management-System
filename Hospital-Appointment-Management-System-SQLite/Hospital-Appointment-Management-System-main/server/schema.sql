-- Hospital Appointment Management System — SQLite schema
-- This replaces the old localStorage("hospitalDB") blob with real tables.

CREATE TABLE IF NOT EXISTS patients (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  email     TEXT UNIQUE NOT NULL,
  phone     TEXT,
  age       INTEGER,
  gender    TEXT,
  password  TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  phone        TEXT,
  specialty    TEXT,
  experience   INTEGER,
  fee          INTEGER,
  password     TEXT,
  availability TEXT,   -- JSON array, e.g. ["Mon","Wed","Fri"]
  slots        TEXT,   -- JSON array, e.g. ["09:00","10:00"]
  avatar       TEXT,
  createdAt    TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id        TEXT PRIMARY KEY,
  patientId TEXT NOT NULL,
  doctorId  TEXT NOT NULL,
  date      TEXT,
  time      TEXT,
  status    TEXT,
  reason    TEXT,
  createdAt TEXT,
  FOREIGN KEY (patientId) REFERENCES patients(id),
  FOREIGN KEY (doctorId)  REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS admins (
  id       TEXT PRIMARY KEY,
  name     TEXT,
  email    TEXT UNIQUE,
  password TEXT
);

CREATE TABLE IF NOT EXISTS logs (
  rowid  INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  user   TEXT,
  time   TEXT
);

-- Key/value store for small bits of state (id counters) that used to live
-- in DB.nextIds inside the localStorage blob.
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
