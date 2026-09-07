// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const icons = { success: '&#10003;', error: '&#10007;', info: 'i', warning: '!' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusBadge(status) {
  return `<span class="badge badge-${status.toLowerCase()}">${status}</span>`;
}

function getDoctorById(id) { return DB.doctors.find(d => d.id === id); }
function getPatientById(id) { return DB.patients.find(p => p.id === id); }

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
let currentAuthRole = 'patient';

function openAuth(role) {
  currentAuthRole = role;
  const modal = document.getElementById('auth-modal');
  const titles = { patient: 'Patient Portal', doctor: 'Doctor Portal', admin: 'Admin Access' };
  const subs = { patient: 'Manage your appointments and health records', doctor: 'Manage your schedule and patients', admin: 'Full system administration' };
  document.getElementById('auth-modal-title').textContent = titles[role];
  document.getElementById('auth-modal-sub').textContent = subs[role];

  const registerTab = document.getElementById('tab-register');
  registerTab.style.display = role === 'admin' ? 'none' : '';
  switchAuthTab('login');
  modal.classList.add('active');
}

function closeAuth() {
  document.getElementById('auth-modal').classList.remove('active');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('auth-login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('register-doctor-fields').style.display =
    (tab === 'register' && currentAuthRole === 'doctor') ? 'block' : 'none';
  document.getElementById('auth-error').textContent = '';
}

function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('auth-error');

  if (!email || !password) { err.textContent = 'Please fill all fields'; return; }

  if (Auth.login(email, password, currentAuthRole)) {
    closeAuth();
    showToast('Welcome, ' + Auth.currentUser.name + '!');
    routeToDashboard(currentAuthRole);
  } else {
    err.textContent = 'Invalid email or password';
  }
}

function handleRegister(e) {
  if (e && e.preventDefault) e.preventDefault();
  const err = document.getElementById('auth-error');
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const age = parseInt(document.getElementById('reg-age').value);
  const gender = document.getElementById('reg-gender').value;
  const password = document.getElementById('reg-password').value;

  if (!name || !email || !phone || !age || !gender || !password) {
    err.textContent = 'Please fill all fields'; return;
  }

  if (currentAuthRole === 'patient') {
    const result = PatientService.register({ name, email, phone, age, gender, password });
    if (result.success) {
      Auth.login(email, password, 'patient');
      closeAuth();
      showToast('Account created successfully!');
      routeToDashboard('patient');
    } else {
      err.textContent = result.error;
    }
  } else if (currentAuthRole === 'doctor') {
    const specialty = document.getElementById('reg-specialty').value;
    const experience = parseInt(document.getElementById('reg-experience').value);
    const fee = parseInt(document.getElementById('reg-fee').value);
    const availability = Array.from(document.querySelectorAll('.day-check:checked')).map(cb => cb.value);
    const slots = document.getElementById('reg-slots').value.split(',').map(s => s.trim()).filter(Boolean);

    if (!specialty || !experience || !fee) { err.textContent = 'Please fill all fields'; return; }

    const result = DoctorService.register({ name, email, phone, specialty, experience, fee, password, availability, slots });
    if (result.success) {
      Auth.login(email, password, 'doctor');
      closeAuth();
      showToast('Doctor account created!');
      routeToDashboard('doctor');
    } else {
      err.textContent = result.error;
    }
  }
}

function routeToDashboard(role) {
  if (role === 'patient') showPage('patient-dashboard', { section: 'home' });
  else if (role === 'doctor') showPage('doctor-dashboard', { section: 'home' });
  else if (role === 'admin') showPage('admin-dashboard', { section: 'home' });
}

// ─── Dashboard Shell Builder ──────────────────────────────────────────────────
function buildDashboard(containerId, navItems, user, role, contentRenderer) {
  const container = document.getElementById(containerId);
  const roleIcons = { patient: 'P', doctor: 'D', admin: 'A' };

  container.innerHTML = `
    <div class="dashboard">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">+</div>
          <div>
            <div class="logo-text">Hospital Appt.</div>
            <div class="logo-sub">${role} Portal</div>
          </div>
        </div>
        <div class="sidebar-user">
          <div class="user-badge">
            <div class="user-avatar">${roleIcons[role]}</div>
            <div class="user-info">
              <div class="user-name">${user.name}</div>
              <div class="user-role">${role}</div>
            </div>
          </div>
        </div>
        <div class="nav-section">
          <div class="nav-label">Navigation</div>
          ${navItems.map(item => `
            <button class="nav-item ${item.active ? 'active' : ''}" onclick="navigateSection('${containerId}', '${item.id}')">
              <span class="nav-icon">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `).join('')}
        </div>
        <div class="sidebar-footer">
          <button class="btn btn-secondary btn-full btn-sm" onclick="Auth.logout()">
            Sign Out
          </button>
        </div>
      </aside>
      <main class="main-content" id="${containerId}-content">
      </main>
    </div>
  `;

  contentRenderer(navItems.find(n => n.active)?.id || navItems[0].id);
}

function navigateSection(dashId, sectionId) {
  document.querySelectorAll(`#${dashId} .nav-item`).forEach(item => item.classList.remove('active'));
  event.currentTarget.classList.add('active');

  if (dashId === 'page-patient-dashboard') renderPatientSection(sectionId);
  else if (dashId === 'page-doctor-dashboard') renderDoctorSection(sectionId);
  else if (dashId === 'page-admin-dashboard') renderAdminSection(sectionId);
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
window.pageRenderers = window.pageRenderers || {};

window.pageRenderers['patient-dashboard'] = function(params) {
  const user = Auth.currentUser;
  const navItems = [
    { id: 'home', icon: 'H', label: 'Dashboard', active: true },
    { id: 'doctors', icon: 'D', label: 'Find Doctors' },
    { id: 'appointments', icon: 'A', label: 'My Appointments' },
    { id: 'profile', icon: 'P', label: 'My Profile' },
  ];
  buildDashboard('page-patient-dashboard', navItems, user, 'patient', renderPatientSection);
};

function renderPatientSection(section) {
  const content = document.getElementById('page-patient-dashboard-content');
  const user = Auth.currentUser;

  if (section === 'home') {
    const myAppts = AppointmentService.getByPatient(user.id);
    const pending = myAppts.filter(a => a.status === 'Pending').length;
    const confirmed = myAppts.filter(a => a.status === 'Confirmed').length;
    const completed = myAppts.filter(a => a.status === 'Completed').length;
    const upcoming = myAppts.filter(a => a.status !== 'Cancelled' && a.status !== 'Completed')
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Good day, ${user.name.split(' ')[0]}</div>
          <div class="page-sub">Here is your health overview</div>
        </div>
        <button class="btn btn-primary" onclick="navigateToBook()">+ Book Appointment</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">A</div><div class="stat-value">${myAppts.length}</div><div class="stat-label">Total Appointments</div></div>
        <div class="stat-card"><div class="stat-icon">P</div><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card"><div class="stat-icon">C</div><div class="stat-value">${confirmed}</div><div class="stat-label">Confirmed</div></div>
        <div class="stat-card"><div class="stat-icon">D</div><div class="stat-value">${completed}</div><div class="stat-label">Completed</div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Upcoming Appointments</div>
          <button class="btn btn-secondary btn-sm" onclick="navigateSectionDirect('patient-dashboard','appointments')">View All</button>
        </div>
        <div class="card-body">
          ${upcoming.length === 0
            ? '<p class="text-muted" style="text-align:center;padding:20px 0">No upcoming appointments. <a href="#" onclick="navigateToBook()" style="color:var(--teal)">Book one now!</a></p>'
            : `<div class="table-wrap"><table>
              <thead><tr><th>Doctor</th><th>Specialty</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                ${upcoming.map(a => {
                  const doc = getDoctorById(a.doctorId);
                  return `<tr>
                    <td><strong>${doc ? doc.name : '-'}</strong></td>
                    <td>${doc ? doc.specialty : '-'}</td>
                    <td>${formatDate(a.date)}</td>
                    <td class="font-mono">${a.time}</td>
                    <td>${getStatusBadge(a.status)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table></div>`}
        </div>
      </div>
    `;
  }

  else if (section === 'doctors') {
    const specialties = [...new Set(DB.doctors.map(d => d.specialty))];

    function renderDoctors(search, spec) {
      search = search || '';
      spec = spec || 'all';
      let docs = DB.doctors;
      if (spec !== 'all') docs = docs.filter(d => d.specialty === spec);
      if (search) docs = docs.filter(d => d.name.toLowerCase().includes(search) || d.specialty.toLowerCase().includes(search));

      document.getElementById('doctors-grid').innerHTML = docs.length === 0
        ? '<p class="text-muted" style="grid-column:1/-1;text-align:center;padding:40px">No doctors found.</p>'
        : docs.map(doc => `
          <div class="doctor-card" onclick="openBooking('${doc.id}')">
            <div class="doctor-avatar">Dr</div>
            <div class="doctor-name">${doc.name}</div>
            <div><span class="doctor-spec">${doc.specialty}</span></div>
            <div class="doctor-meta">
              <span>${doc.experience} yrs exp</span>
              <span>${doc.availability ? doc.availability.join(', ') : ''}</span>
            </div>
            <div class="doctor-fee">
              <div>
                <div class="fee-value">Rs.${doc.fee}</div>
                <div class="fee-label">per consultation</div>
              </div>
              <button class="btn btn-primary btn-sm">Book</button>
            </div>
          </div>
        `).join('');
    }

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Find a Doctor</div>
          <div class="page-sub">${DB.doctors.length} specialists available</div>
        </div>
      </div>
      <div class="search-bar">
        <span class="search-icon">S</span>
        <input type="text" placeholder="Search by name or specialty..." id="doctor-search">
      </div>
      <div class="filter-pills mb-24">
        <button class="pill active" onclick="setSpecFilter('all', this)">All</button>
        ${specialties.map(s => `<button class="pill" onclick="setSpecFilter('${s}', this)">${s}</button>`).join('')}
      </div>
      <div class="doctor-grid" id="doctors-grid"></div>
    `;

    window._currentSpec = 'all';
    window.setSpecFilter = function(spec, el) {
      document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      window._currentSpec = spec;
      renderDoctors(document.getElementById('doctor-search').value.toLowerCase(), spec);
    };

    document.getElementById('doctor-search').addEventListener('input', function() {
      renderDoctors(this.value.toLowerCase(), window._currentSpec);
    });

    renderDoctors('', 'all');
  }

  else if (section === 'appointments') {
    const myAppts = AppointmentService.getByPatient(user.id);

    function renderTable(f) {
      let appts = myAppts;
      if (f !== 'all') appts = appts.filter(a => a.status === f);
      appts = appts.sort((a, b) => b.date.localeCompare(a.date));

      document.getElementById('appt-table-body').innerHTML = appts.length === 0
        ? '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--white-mid)">No appointments found</td></tr>'
        : appts.map(a => {
          const doc = getDoctorById(a.doctorId);
          return `<tr>
            <td><span class="id-badge">${a.id}</span></td>
            <td><strong>${doc ? doc.name : '-'}</strong><br><small class="text-muted">${doc ? doc.specialty : ''}</small></td>
            <td>${formatDate(a.date)}</td>
            <td class="font-mono">${a.time}</td>
            <td>${a.reason || '-'}</td>
            <td>${getStatusBadge(a.status)}</td>
            <td>
              ${a.status === 'Pending' || a.status === 'Confirmed'
                ? `<button class="btn btn-danger btn-sm" onclick="cancelAppt('${a.id}')">Cancel</button>`
                : '-'}
            </td>
          </tr>`;
        }).join('');
    }

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">My Appointments</div>
          <div class="page-sub">${myAppts.length} total records</div>
        </div>
        <button class="btn btn-primary" onclick="navigateToBook()">+ Book New</button>
      </div>
      <div class="filter-pills">
        <button class="pill active" onclick="filterAppts('all', this)">All</button>
        <button class="pill" onclick="filterAppts('Pending', this)">Pending</button>
        <button class="pill" onclick="filterAppts('Confirmed', this)">Confirmed</button>
        <button class="pill" onclick="filterAppts('Completed', this)">Completed</button>
        <button class="pill" onclick="filterAppts('Cancelled', this)">Cancelled</button>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody id="appt-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    window.filterAppts = function(f, el) {
      document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      renderTable(f);
    };
    window.cancelAppt = function(id) {
      if (confirm('Cancel this appointment?')) {
        AppointmentService.updateStatus(id, 'Cancelled');
        showToast('Appointment cancelled');
        renderPatientSection('appointments');
      }
    };

    renderTable('all');
  }

  else if (section === 'profile') {
    const freshUser = PatientService.getById(user.id) || user;
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">My Profile</div>
          <div class="page-sub">Manage your personal information</div>
        </div>
      </div>
      <div class="card" style="max-width:560px">
        <div class="card-header"><div class="card-title">Personal Details</div></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="prof-name" value="${freshUser.name}"></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="prof-email" value="${freshUser.email}" type="email"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="prof-phone" value="${freshUser.phone}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Age</label><input class="form-input" id="prof-age" value="${freshUser.age}" type="number"></div>
            <div class="form-group">
              <label class="form-label">Gender</label>
              <select class="form-select" id="prof-gender">
                <option ${freshUser.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option ${freshUser.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option ${freshUser.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
          </div>
          <div id="prof-msg"></div>
          <button class="btn btn-primary" onclick="saveProfile()" style="margin-top:8px">Save Changes</button>
        </div>
      </div>
    `;

    window.saveProfile = function() {
      const updated = {
        name: document.getElementById('prof-name').value.trim(),
        email: document.getElementById('prof-email').value.trim(),
        phone: document.getElementById('prof-phone').value.trim(),
        age: parseInt(document.getElementById('prof-age').value),
        gender: document.getElementById('prof-gender').value,
      };
      PatientService.update(user.id, updated);
      Auth.currentUser = Object.assign({}, Auth.currentUser, updated);
      sessionStorage.setItem('auth', JSON.stringify({ user: Auth.currentUser, role: 'patient' }));
      document.getElementById('prof-msg').innerHTML = '<p class="success-msg">Profile updated!</p>';
      showToast('Profile saved');
    };
  }
}

function navigateToBook() {
  navigateSectionDirect('patient-dashboard', 'doctors');
}

function navigateSectionDirect(dash, section) {
  document.querySelectorAll(`#page-${dash} .nav-item`).forEach(item => item.classList.remove('active'));
  document.querySelectorAll(`#page-${dash} .nav-item`).forEach(item => {
    const onclick = item.getAttribute('onclick') || '';
    if (onclick.includes(`'${section}'`)) item.classList.add('active');
  });
  if (dash === 'patient-dashboard') renderPatientSection(section);
  else if (dash === 'doctor-dashboard') renderDoctorSection(section);
  else if (dash === 'admin-dashboard') renderAdminSection(section);
}

// ─── Booking Modal ────────────────────────────────────────────────────────────
let bookingDoc = null;
let selectedSlot = null;

function openBooking(docId) {
  bookingDoc = getDoctorById(docId);
  selectedSlot = null;
  const modal = document.getElementById('booking-modal');
  document.getElementById('booking-doc-name').textContent = bookingDoc.name;
  document.getElementById('booking-doc-spec').textContent = bookingDoc.specialty;
  document.getElementById('booking-doc-fee').textContent = 'Rs.' + bookingDoc.fee;
  document.getElementById('booking-date').min = new Date().toISOString().split('T')[0];
  document.getElementById('booking-date').value = '';
  document.getElementById('booking-slots').innerHTML = '<p class="text-muted">Select a date to see available slots</p>';
  document.getElementById('booking-reason').value = '';
  document.getElementById('booking-error').textContent = '';
  modal.classList.add('active');
}

function closeBooking() {
  document.getElementById('booking-modal').classList.remove('active');
}

function loadSlots() {
  const date = document.getElementById('booking-date').value;
  if (!date || !bookingDoc) return;
  const booked = AppointmentService.getBookedSlots(bookingDoc.id, date);
  const slotsEl = document.getElementById('booking-slots');
  if (!bookingDoc.slots || bookingDoc.slots.length === 0) {
    slotsEl.innerHTML = '<p class="text-muted">No slots available</p>';
    return;
  }
  slotsEl.innerHTML = '<div class="slot-grid">' + bookingDoc.slots.map(function(s) {
    const isBooked = booked.includes(s);
    return `<button class="slot-btn ${isBooked ? 'booked' : ''}" onclick="selectSlot('${s}', this)" ${isBooked ? 'disabled' : ''}>${s}</button>`;
  }).join('') + '</div>';
  selectedSlot = null;
}

function selectSlot(time, el) {
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedSlot = time;
}

function confirmBooking() {
  const date = document.getElementById('booking-date').value;
  const reason = document.getElementById('booking-reason').value.trim();
  const err = document.getElementById('booking-error');

  if (!date) { err.textContent = 'Please select a date'; return; }
  if (!selectedSlot) { err.textContent = 'Please select a time slot'; return; }

  const result = AppointmentService.create({
    patientId: Auth.currentUser.id,
    doctorId: bookingDoc.id,
    date: date,
    time: selectedSlot,
    reason: reason || 'General consultation'
  });

  if (result.success) {
    closeBooking();
    showToast('Appointment booked successfully!');
    renderPatientSection('appointments');
    navigateSectionDirect('patient-dashboard', 'appointments');
  } else {
    err.textContent = result.error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
window.pageRenderers['doctor-dashboard'] = function() {
  const user = Auth.currentUser;
  const navItems = [
    { id: 'home', icon: 'H', label: 'Dashboard', active: true },
    { id: 'appointments', icon: 'A', label: 'Appointments' },
    { id: 'schedule', icon: 'S', label: 'My Schedule' },
    { id: 'profile', icon: 'P', label: 'Profile' },
  ];
  buildDashboard('page-doctor-dashboard', navItems, user, 'doctor', renderDoctorSection);
};

function updateApptStatus(id, status) {
  AppointmentService.updateStatus(id, status);
  showToast('Appointment ' + status);
  renderDoctorSection('appointments');
}

function renderDoctorSection(section) {
  const content = document.getElementById('page-doctor-dashboard-content');
  const user = Auth.currentUser;
  const doctor = DoctorService.getById(user.id) || user;

  if (section === 'home') {
    const myAppts = AppointmentService.getByDoctor(user.id);
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = myAppts.filter(a => a.date === today);
    const pending = myAppts.filter(a => a.status === 'Pending').length;
    const confirmed = myAppts.filter(a => a.status === 'Confirmed').length;
    const upcoming = myAppts.filter(a => a.status !== 'Cancelled' && a.status !== 'Completed' && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Welcome, ${doctor.name.split(' ').slice(0, 2).join(' ')}</div>
          <div class="page-sub">${doctor.specialty} - ${doctor.experience} years experience</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">T</div><div class="stat-value">${todayAppts.length}</div><div class="stat-label">Today's Appointments</div></div>
        <div class="stat-card"><div class="stat-icon">P</div><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card"><div class="stat-icon">C</div><div class="stat-value">${confirmed}</div><div class="stat-label">Confirmed</div></div>
        <div class="stat-card"><div class="stat-icon">A</div><div class="stat-value">${myAppts.length}</div><div class="stat-label">Total Patients</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Upcoming Appointments</div></div>
        <div class="card-body">
          ${upcoming.length === 0
            ? '<p class="text-muted" style="text-align:center;padding:20px">No upcoming appointments</p>'
            : `<div class="table-wrap"><table>
              <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${upcoming.map(a => {
                  const patient = getPatientById(a.patientId);
                  return `<tr>
                    <td><strong>${patient ? patient.name : '-'}</strong></td>
                    <td>${formatDate(a.date)}</td>
                    <td class="font-mono">${a.time}</td>
                    <td>${a.reason || '-'}</td>
                    <td>${getStatusBadge(a.status)}</td>
                    <td>
                      <div class="flex-gap gap-8">
                        ${a.status === 'Pending' ? `<button class="btn btn-primary btn-sm" onclick="updateApptStatus('${a.id}','Confirmed')">Confirm</button>` : ''}
                        ${a.status !== 'Completed' && a.status !== 'Cancelled' ? `<button class="btn btn-gold btn-sm" onclick="updateApptStatus('${a.id}','Completed')">Done</button>` : ''}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table></div>`}
        </div>
      </div>
    `;
  }

  else if (section === 'appointments') {
    const myAppts = AppointmentService.getByDoctor(user.id).sort((a, b) => b.date.localeCompare(a.date));

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">All Appointments</div>
          <div class="page-sub">${myAppts.length} total</div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${myAppts.map(a => {
                const patient = getPatientById(a.patientId);
                return `<tr>
                  <td><span class="id-badge">${a.id}</span></td>
                  <td><strong>${patient ? patient.name : '-'}</strong><br><small class="text-muted">${patient ? patient.phone : ''}</small></td>
                  <td>${formatDate(a.date)}</td>
                  <td class="font-mono">${a.time}</td>
                  <td>${a.reason || '-'}</td>
                  <td>${getStatusBadge(a.status)}</td>
                  <td>
                    <div class="flex-gap gap-8">
                      ${a.status === 'Pending' ? `<button class="btn btn-primary btn-sm" onclick="updateApptStatus('${a.id}','Confirmed')">Confirm</button>` : ''}
                      ${a.status !== 'Completed' && a.status !== 'Cancelled' ? `<button class="btn btn-gold btn-sm" onclick="updateApptStatus('${a.id}','Completed')">Done</button>` : ''}
                      ${a.status !== 'Cancelled' && a.status !== 'Completed' ? `<button class="btn btn-danger btn-sm" onclick="updateApptStatus('${a.id}','Cancelled')">Cancel</button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  else if (section === 'schedule') {
    const doc = DoctorService.getById(user.id) || user;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">My Schedule</div>
          <div class="page-sub">Manage your availability</div>
        </div>
      </div>
      <div class="card" style="max-width:600px">
        <div class="card-header"><div class="card-title">Available Days</div></div>
        <div class="card-body">
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px">
            ${days.map(d => `
              <label style="display:flex;align-items:center;gap:8px;padding:8px 16px;border:1px solid var(--border);border-radius:8px;cursor:pointer;${doc.availability && doc.availability.includes(d) ? 'background:var(--teal-dim);border-color:var(--teal)' : ''}">
                <input type="checkbox" class="day-sched" value="${d}" ${doc.availability && doc.availability.includes(d) ? 'checked' : ''} style="accent-color:var(--teal)">
                <span>${d}</span>
              </label>
            `).join('')}
          </div>
          <div class="form-group">
            <label class="form-label">Time Slots (comma separated, e.g. 09:00, 10:00)</label>
            <input class="form-input" id="sched-slots" value="${doc.slots ? doc.slots.join(', ') : ''}">
          </div>
          <button class="btn btn-primary" onclick="saveSchedule()">Save Schedule</button>
        </div>
      </div>
    `;

    window.saveSchedule = function() {
      const avail = Array.from(document.querySelectorAll('.day-sched:checked')).map(cb => cb.value);
      const slots = document.getElementById('sched-slots').value.split(',').map(s => s.trim()).filter(Boolean);
      DoctorService.update(user.id, { availability: avail, slots: slots });
      Auth.currentUser = Object.assign({}, Auth.currentUser, { availability: avail, slots: slots });
      showToast('Schedule updated!');
    };
  }

  else if (section === 'profile') {
    const doc = DoctorService.getById(user.id) || user;
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">My Profile</div>
          <div class="page-sub">Update your information</div>
        </div>
      </div>
      <div class="card" style="max-width:560px">
        <div class="card-body">
          <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="dp-name" value="${doc.name}"></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="dp-email" value="${doc.email}"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="dp-phone" value="${doc.phone}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Specialty</label><input class="form-input" id="dp-spec" value="${doc.specialty}"></div>
            <div class="form-group"><label class="form-label">Experience (yrs)</label><input class="form-input" id="dp-exp" value="${doc.experience}" type="number"></div>
          </div>
          <div class="form-group"><label class="form-label">Consultation Fee (Rs.)</label><input class="form-input" id="dp-fee" value="${doc.fee}" type="number"></div>
          <button class="btn btn-primary" onclick="saveDoctorProfile()" style="margin-top:8px">Save Changes</button>
        </div>
      </div>
    `;

    window.saveDoctorProfile = function() {
      const updates = {
        name: document.getElementById('dp-name').value.trim(),
        email: document.getElementById('dp-email').value.trim(),
        phone: document.getElementById('dp-phone').value.trim(),
        specialty: document.getElementById('dp-spec').value.trim(),
        experience: parseInt(document.getElementById('dp-exp').value),
        fee: parseInt(document.getElementById('dp-fee').value),
      };
      DoctorService.update(user.id, updates);
      Auth.currentUser = Object.assign({}, Auth.currentUser, updates);
      sessionStorage.setItem('auth', JSON.stringify({ user: Auth.currentUser, role: 'doctor' }));
      showToast('Profile saved!');
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
window.pageRenderers['admin-dashboard'] = function() {
  const user = Auth.currentUser;
  const navItems = [
    { id: 'home', icon: 'H', label: 'Dashboard', active: true },
    { id: 'appointments', icon: 'A', label: 'All Appointments' },
    { id: 'patients', icon: 'P', label: 'Patients' },
    { id: 'doctors', icon: 'D', label: 'Doctors' },
    { id: 'reports', icon: 'R', label: 'Reports' },
    { id: 'logs', icon: 'L', label: 'System Logs' },
  ];
  buildDashboard('page-admin-dashboard', navItems, user, 'admin', renderAdminSection);
};

function renderAdminSection(section) {
  const content = document.getElementById('page-admin-dashboard-content');

  if (section === 'home') {
    const appts = DB.appointments;
    const byStatus = {};
    appts.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

    const docApptCounts = DB.doctors.map(d => ({
      name: d.name.split(' ').slice(1, 3).join(' '),
      count: appts.filter(a => a.doctorId === d.id).length
    }));
    const maxCount = Math.max.apply(null, docApptCounts.map(d => d.count).concat([1]));

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">System Overview</div>
          <div class="page-sub">Hospital Management Dashboard</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">P</div><div class="stat-value">${DB.patients.length}</div><div class="stat-label">Total Patients</div></div>
        <div class="stat-card"><div class="stat-icon">D</div><div class="stat-value">${DB.doctors.length}</div><div class="stat-label">Active Doctors</div></div>
        <div class="stat-card"><div class="stat-icon">A</div><div class="stat-value">${appts.length}</div><div class="stat-label">Total Appointments</div></div>
        <div class="stat-card"><div class="stat-icon">C</div><div class="stat-value">${byStatus['Completed'] || 0}</div><div class="stat-label">Completed</div></div>
        <div class="stat-card"><div class="stat-icon">W</div><div class="stat-value">${byStatus['Pending'] || 0}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card"><div class="stat-icon">X</div><div class="stat-value">${byStatus['Cancelled'] || 0}</div><div class="stat-label">Cancelled</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Appointments per Doctor</div></div>
        <div class="card-body">
          <div class="chart-bar-wrap">
            ${docApptCounts.map(d => `
              <div class="chart-bar-col">
                <div class="chart-bar-val">${d.count}</div>
                <div class="chart-bar" style="height:${Math.round((d.count / maxCount) * 100)}px;"></div>
                <div class="chart-bar-lbl">${d.name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  else if (section === 'appointments') {
    const allAppts = DB.appointments.slice().sort((a, b) => b.date.localeCompare(a.date));

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">All Appointments</div>
          <div class="page-sub">${allAppts.length} records</div>
        </div>
      </div>
      <div class="search-bar mb-24">
        <span class="search-icon">S</span>
        <input type="text" placeholder="Search patient or doctor..." id="appt-search">
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="all-appts-body"></tbody>
          </table>
        </div>
      </div>
    `;

    function renderAllApptsTable(appts) {
      document.getElementById('all-appts-body').innerHTML = appts.map(a => {
        const p = getPatientById(a.patientId);
        const d = getDoctorById(a.doctorId);
        return `<tr>
          <td><span class="id-badge">${a.id}</span></td>
          <td><strong>${p ? p.name : '-'}</strong></td>
          <td>${d ? d.name : '-'}</td>
          <td>${formatDate(a.date)}</td>
          <td class="font-mono">${a.time}</td>
          <td>${getStatusBadge(a.status)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="adminDeleteAppt('${a.id}')">Delete</button></td>
        </tr>`;
      }).join('');
    }

    document.getElementById('appt-search').addEventListener('input', function() {
      const q = this.value.toLowerCase();
      const filtered = allAppts.filter(a => {
        const p = getPatientById(a.patientId);
        const d = getDoctorById(a.doctorId);
        return !q || (p && p.name.toLowerCase().includes(q)) || (d && d.name.toLowerCase().includes(q));
      });
      renderAllApptsTable(filtered);
    });

    window.adminDeleteAppt = function(id) {
      if (confirm('Delete this appointment permanently?')) {
        AppointmentService.delete(id);
        showToast('Appointment deleted');
        renderAdminSection('appointments');
      }
    };

    renderAllApptsTable(allAppts);
  }

  else if (section === 'patients') {
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Patients</div>
          <div class="page-sub">${DB.patients.length} registered patients</div>
        </div>
      </div>
      <div class="search-bar mb-24">
        <span class="search-icon">S</span>
        <input type="text" placeholder="Search patients..." id="patient-search">
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Age</th><th>Gender</th><th>Appointments</th></tr></thead>
            <tbody id="patients-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    function renderPatientsTable(patients) {
      document.getElementById('patients-table-body').innerHTML = patients.map(p => {
        const count = DB.appointments.filter(a => a.patientId === p.id).length;
        return `<tr>
          <td><span class="id-badge">${p.id}</span></td>
          <td><strong>${p.name}</strong></td>
          <td>${p.email}</td>
          <td>${p.phone}</td>
          <td>${p.age}</td>
          <td>${p.gender}</td>
          <td><span class="badge badge-confirmed">${count}</span></td>
        </tr>`;
      }).join('');
    }

    document.getElementById('patient-search').addEventListener('input', function() {
      const q = this.value.toLowerCase();
      renderPatientsTable(DB.patients.filter(p => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)));
    });

    renderPatientsTable(DB.patients);
  }

  else if (section === 'doctors') {
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Doctors</div>
          <div class="page-sub">${DB.doctors.length} registered doctors</div>
        </div>
        <button class="btn btn-primary" onclick="openAddDoctor()">+ Add Doctor</button>
      </div>
      <div class="card mb-24">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Specialty</th><th>Experience</th><th>Fee</th><th>Availability</th><th>Actions</th></tr></thead>
            <tbody>
              ${DB.doctors.map(d => `<tr>
                <td><span class="id-badge">${d.id}</span></td>
                <td><strong>${d.name}</strong></td>
                <td><span class="doctor-spec" style="font-size:12px">${d.specialty}</span></td>
                <td>${d.experience} yrs</td>
                <td class="text-gold">Rs.${d.fee}</td>
                <td>${d.availability ? d.availability.join(', ') : '-'}</td>
                <td><button class="btn btn-danger btn-sm" onclick="adminDeleteDoctor('${d.id}')">Remove</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div id="add-doctor-form" style="display:none" class="card">
        <div class="card-header"><div class="card-title">Add New Doctor</div></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="nd-name"></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="nd-email" type="email"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="nd-phone"></div>
            <div class="form-group"><label class="form-label">Specialty</label><input class="form-input" id="nd-spec"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Experience (yrs)</label><input class="form-input" id="nd-exp" type="number"></div>
            <div class="form-group"><label class="form-label">Fee (Rs.)</label><input class="form-input" id="nd-fee" type="number"></div>
          </div>
          <div class="form-group"><label class="form-label">Availability (e.g. Mon,Wed,Fri)</label><input class="form-input" id="nd-avail"></div>
          <div class="form-group"><label class="form-label">Slots (e.g. 09:00, 10:00)</label><input class="form-input" id="nd-slots"></div>
          <div class="form-group"><label class="form-label">Password</label><input class="form-input" id="nd-pass" type="password"></div>
          <div id="nd-error" class="error-msg"></div>
          <div style="display:flex;gap:10px;margin-top:8px">
            <button class="btn btn-primary" onclick="submitAddDoctor()">Add Doctor</button>
            <button class="btn btn-secondary" onclick="document.getElementById('add-doctor-form').style.display='none'">Cancel</button>
          </div>
        </div>
      </div>
    `;

    window.openAddDoctor = function() {
      document.getElementById('add-doctor-form').style.display = 'block';
      document.getElementById('add-doctor-form').scrollIntoView({ behavior: 'smooth' });
    };

    window.adminDeleteDoctor = function(id) {
      if (confirm('Remove this doctor from the system?')) {
        DoctorService.delete(id);
        showToast('Doctor removed');
        renderAdminSection('doctors');
      }
    };

    window.submitAddDoctor = function() {
      const data = {
        name: document.getElementById('nd-name').value.trim(),
        email: document.getElementById('nd-email').value.trim(),
        phone: document.getElementById('nd-phone').value.trim(),
        specialty: document.getElementById('nd-spec').value.trim(),
        experience: parseInt(document.getElementById('nd-exp').value),
        fee: parseInt(document.getElementById('nd-fee').value),
        availability: document.getElementById('nd-avail').value.split(',').map(s => s.trim()).filter(Boolean),
        slots: document.getElementById('nd-slots').value.split(',').map(s => s.trim()).filter(Boolean),
        password: document.getElementById('nd-pass').value,
      };
      const err = document.getElementById('nd-error');
      if (!data.name || !data.email || !data.specialty || !data.password) {
        err.textContent = 'Fill all required fields'; return;
      }
      const result = DoctorService.register(data);
      if (result.success) { showToast('Doctor added!'); renderAdminSection('doctors'); }
      else { err.textContent = result.error; }
    };
  }

  else if (section === 'reports') {
    const appts = DB.appointments;
    const specStats = {};
    appts.forEach(a => {
      const d = getDoctorById(a.doctorId);
      if (d) specStats[d.specialty] = (specStats[d.specialty] || 0) + 1;
    });

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Reports and Analytics</div>
          <div class="page-sub">System statistics overview</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><div class="card-title">Appointments by Specialty</div></div>
          <div class="card-body">
            ${Object.entries(specStats).map(function(entry) {
              const spec = entry[0];
              const count = entry[1];
              return `<div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:14px">${spec}</span>
                  <span class="text-teal font-mono" style="font-size:14px">${count}</span>
                </div>
                <div style="height:6px;background:var(--white-dim);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${Math.round((count / appts.length) * 100)}%;background:var(--teal);border-radius:3px"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Summary Statistics</div></div>
          <div class="card-body">
            <table>
              <tbody>
                <tr><td class="text-muted">Total Patients</td><td><strong>${DB.patients.length}</strong></td></tr>
                <tr><td class="text-muted">Total Doctors</td><td><strong>${DB.doctors.length}</strong></td></tr>
                <tr><td class="text-muted">Total Appointments</td><td><strong>${appts.length}</strong></td></tr>
                <tr><td class="text-muted">Pending</td><td><strong>${appts.filter(a => a.status === 'Pending').length}</strong></td></tr>
                <tr><td class="text-muted">Confirmed</td><td><strong>${appts.filter(a => a.status === 'Confirmed').length}</strong></td></tr>
                <tr><td class="text-muted">Completed</td><td><strong>${appts.filter(a => a.status === 'Completed').length}</strong></td></tr>
                <tr><td class="text-muted">Cancelled</td><td><strong>${appts.filter(a => a.status === 'Cancelled').length}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  else if (section === 'logs') {
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">System Logs</div>
          <div class="page-sub">${DB.logs.length} events</div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>User</th><th>Time</th></tr></thead>
            <tbody>
              ${DB.logs.length === 0
                ? '<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--white-mid)">No log entries yet</td></tr>'
                : DB.logs.slice().reverse().map(l => `<tr>
                  <td>${l.action}</td>
                  <td>${l.user}</td>
                  <td class="font-mono" style="font-size:12px">${new Date(l.time).toLocaleString('en-IN')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

// ─── Restore session on page load ─────────────────────────────────────────────
// Waits for window.DB_READY (js/db.js) so the SQLite-backed data has actually
// arrived from the server before we try to render a dashboard from it.
document.addEventListener('DOMContentLoaded', function() {
  window.DB_READY.then(function() {
    if (Auth.restore()) {
      routeToDashboard(Auth.currentRole);
    }
  });
});