# Hospital Appointment Management System

A web-based application designed to streamline hospital appointment booking and management. This system allows patients to book, view, and manage their appointments, while administrators can manage doctors, view all appointments, and update schedules efficiently.

> **Storage note:** the app used to persist its data in the browser's
> `localStorage`. It now persists data in a real **SQLite** database file
> (`hospital.db`) through a small Node/Express server. Nothing about how the
> app looks or behaves has changed — only where the data lives.

---

## Features

- **Patient Portal**
  - Register and login as a patient
  - Book new appointments with available doctors
  - View and cancel existing appointments
- **Doctor Portal**
  - Manage schedule/availability and profile
  - View and update appointment status for their patients
- **Admin Portal**
  - Manage doctors (add, update, delete)
  - View all appointments in a dashboard
  - Update appointment status
  - Reports and system logs
- **User-Friendly Interface**
  - Responsive design using HTML, CSS, and JavaScript

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (unchanged, no framework/build step)
- **Backend:** Node.js + Express.js (`server/server.js`)
- **Database:** SQLite (`better-sqlite3`), file: `hospital.db`

---

## How the storage layer works now

- `server/schema.sql` defines the tables: `patients`, `doctors`,
  `appointments`, `admins`, `logs`, and `meta` (used for the `A00x`/`P00x`/`D00x`
  id counters that used to live in `DB.nextIds`).
- `server/database.js` opens/creates `hospital.db`, creates the tables if
  needed, and — **only the very first time**, when the database is empty —
  inserts the same demo data (3 patients, 6 doctors, 5 appointments, 1 admin)
  that used to be hard-coded in `js/db.js`.
- `server/server.js` is a tiny Express server that serves the existing
  frontend files as-is and exposes two endpoints:
  - `GET /api/state` — returns the full app state read from SQLite.
  - `POST /api/state` — overwrites SQLite with the full app state sent by
    the browser.
- `js/db.js` still exposes the exact same `DB` object, `Auth`,
  `AppointmentService`, `PatientService`, `DoctorService`, and `showPage()`
  that `js/app.js` already used. The **only** thing that changed inside it is
  `loadDB()`/`saveDB()`: instead of reading/writing
  `localStorage.getItem/setItem('hospitalDB', ...)`, they now `fetch()`
  `GET`/`POST /api/state`. Every button, form, and page in the app works
  exactly like before — it's just talking to SQLite instead of localStorage
  under the hood.
- Login sessions (`sessionStorage.setItem('auth', ...)`) were left as-is —
  that's per-tab session state, not app data, so it doesn't need a database.

---

## Installation & running it

1. Make sure you have **Node.js 18+** installed.
2. From the project folder, install dependencies:
   ```bash
   npm install
   ```
   This installs `express` and `better-sqlite3` (a native SQLite driver — it
   downloads a prebuilt binary for your OS automatically, no extra setup
   needed on Windows/macOS/Linux).
3. Start the server:
   ```bash
   npm start
   ```
   You should see:
   ```
   Hospital Appointment Management System running at http://localhost:3000
   SQLite database file: /path/to/project/hospital.db
   ```
   The first time it starts, it will also print `Seeded hospital.db with
   initial demo data.` — a `hospital.db` file will appear in the project
   folder. That file **is** your database; every booking, registration,
   status change, etc. is now stored there instead of the browser.
4. Open your browser at:
   ```
   http://localhost:3000
   ```
   Use it exactly like before — the demo logins still work:
   - Patient: `aarav@email.com` / `pass123`
   - Doctor: `meera@hospital.com` / `doc123`
   - Admin: `admin@hospital.com` / `admin123`

### Inspecting the database directly (optional)

You can open `hospital.db` with any SQLite tool, e.g.:
```bash
sqlite3 hospital.db
sqlite> .tables
sqlite> SELECT * FROM patients;
```

### Resetting the data

Stop the server and delete `hospital.db` (and `hospital.db-wal` /
`hospital.db-shm` if present). Restart with `npm start` and it will
re-seed the original demo data.

---

## Folder Structure

```
Hospital-Appointment-Management-System-main/
├── index.html            # unchanged frontend markup
├── css/
│   └── style.css         # unchanged styles
├── js/
│   ├── db.js             # DB object + Auth/services - now talks to /api/state instead of localStorage
│   └── app.js             # unchanged UI logic (one small edit: waits for DB_READY on load)
├── server/
│   ├── server.js          # Express app + GET/POST /api/state
│   ├── database.js        # SQLite connection, schema creation, one-time seed
│   └── schema.sql         # table definitions
├── hospital.db             # created on first run - your SQLite database (git-ignored)
├── package.json
└── .gitignore
```

---

## Future Enhancements

- Email and SMS notifications for appointments
- Advanced search and filtering for doctors
- Integration with hospital departments and medical records
- Per-endpoint REST API (create/update/delete single records) instead of
  whole-state sync, and password hashing for stored credentials
