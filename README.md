# Hospital Appointment Management System

A web-based application designed to streamline hospital appointment booking and management. This system allows patients to book, view, and manage their appointments, while administrators can manage doctors, view all appointments, and update schedules efficiently.

---

## Features

- **Patient Portal**
  - Register and login as a patient
  - Book new appointments with available doctors
  - View and cancel existing appointments
- **Admin Portal**
  - Manage doctors (add, update, delete)
  - View all appointments in a dashboard
  - Update appointment status
- **Real-time Updates**
  - Appointment confirmations and cancellations updated immediately
- **User-Friendly Interface**
  - Responsive design using HTML, CSS, and JavaScript

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **Database:** SQLite  

---

## Workflow

1. **Patient Registration:** Users create an account to access the portal.  
2. **Appointment Booking:** Patients select a doctor and choose a date and time for their appointment.  
3. **Admin Management:** Admins can add or remove doctors, view appointments, and update status.  
4. **Appointment Tracking:** Patients and admins can track upcoming and past appointments in real-time.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/hospital-appointment-system.git

Navigate to the project folder:

cd hospital-appointment-system

Install dependencies:

npm install

Start the server:

node server.js

Open your browser and go to:

http://localhost:3000
Folder Structure
hospital-appointment-system/
├── public/
│   ├── css/
│   ├── js/
│   └── index.html
├── routes/
│   ├── admin.js
│   └── patient.js
├── database/
│   └── database.sqlite
├── server.js
└── package.json
Future Enhancements

Email and SMS notifications for appointments

Advanced search and filtering for doctors

Integration with hospital departments and medical records
