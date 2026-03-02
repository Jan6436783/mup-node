const state = {
  currentUser: null,
  view: 'anmeldung',
  users: load('users', [
    { username: 'manager1', password: 'stall123', role: 'manager' },
    { username: 'manager2', password: 'stall123', role: 'manager' },
    { username: 'manager3', password: 'stall123', role: 'manager' },
    { username: 'mitarbeiter1', password: 'stall123', role: 'mitarbeiter' },
    { username: 'mitarbeiter2', password: 'stall123', role: 'mitarbeiter' }
  ]),
  tasks: load('tasks', {
    fuetterung: [{ id: crypto.randomUUID(), text: '11:00 Uhr Tagesration', doneBy: null }],
    bewegung: []
  }),
  appointments: load('appointments', ['Montag 14:00 Uhr - Tierarztkontrolle']),
  emergencyLog: load('emergencyLog', [])
};

const viewsAfterLogin = [
  { key: 'fuetterung', label: 'Fütterung' },
  { key: 'bewegung', label: 'Bewegung' },
  { key: 'mitarbeiter', label: 'Mitarbeiter' },
  { key: 'notfall', label: 'Notfall' },
  { key: 'termine', label: 'Termine' }
];

const menu = document.getElementById('menu');
const content = document.getElementById('content');
const sessionInfo = document.getElementById('sessionInfo');

document.getElementById('menuToggle').addEventListener('click', () => {
  menu.classList.toggle('open');
});

render();

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem('users', JSON.stringify(state.users));
  localStorage.setItem('tasks', JSON.stringify(state.tasks));
  localStorage.setItem('appointments', JSON.stringify(state.appointments));
  localStorage.setItem('emergencyLog', JSON.stringify(state.emergencyLog));
}

function istManager() {
  return state.currentUser && state.currentUser.role === 'manager';
}

function render() {
  renderMenu();
  sessionInfo.textContent = state.currentUser
    ? `Angemeldet: ${state.currentUser.username} (${state.currentUser.role === 'manager' ? 'Manager' : 'Mitarbeiter'})`
    : 'Nicht angemeldet';

  if (state.view === 'anmeldung') return renderLogin();
  if (state.view === 'notfall') return renderEmergency();
  if (state.view === 'mitarbeiter') return renderEmployees();
  if (state.view === 'termine') return renderAppointments();
  if (state.view === 'fuetterung' || state.view === 'bewegung') return renderTasks(state.view);
}

function renderMenu() {
  const items = state.currentUser
    ? viewsAfterLogin
    : [
        { key: 'anmeldung', label: 'Anmeldung' },
        { key: 'notfall', label: 'Notfall' }
      ];

  menu.querySelector('nav').innerHTML = items
    .map(({ key, label }) => `<button class="menu-item ${state.view === key ? 'active' : ''} ${key === 'notfall' ? 'danger' : ''}" data-view="${key}">${label}</button>`)
    .join('');

  if (state.currentUser) {
    menu.querySelector('nav').insertAdjacentHTML('beforeend', '<button class="menu-item" data-view="abmelden">Abmelden</button>');
  }

  menu.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.view === 'abmelden') {
        state.currentUser = null;
        state.view = 'anmeldung';
      } else {
        state.view = button.dataset.view;
      }
      render();
    });
  });
}

function renderLogin() {
  content.innerHTML = document.getElementById('loginTemplate').innerHTML;
  content.querySelector('#loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const user = state.users.find((u) => u.username === data.get('username') && u.password === data.get('password'));

    if (!user) {
      alert('Anmeldung fehlgeschlagen. Bitte Daten prüfen.');
      return;
    }

    state.currentUser = user;
    state.view = 'fuetterung';
    render();
  });
}

function renderTasks(type) {
  if (!state.currentUser) {
    state.view = 'anmeldung';
    return render();
  }

  content.innerHTML = document.getElementById('tasksTemplate').innerHTML;
  content.querySelector('#tasksTitle').textContent = type === 'fuetterung' ? 'Fütterung' : 'Bewegung';

  const managerArea = content.querySelector('#managerCreateArea');
  if (istManager()) {
    managerArea.innerHTML = `
      <form id="createTask" class="form-grid">
        <label>Neue Aufgabe
          <input name="text" required placeholder="z. B. Heu 17:00 Uhr" />
        </label>
        <button type="submit">Aufgabe eintragen</button>
      </form>
    `;

    managerArea.querySelector('#createTask').addEventListener('submit', (event) => {
      event.preventDefault();
      const text = String(new FormData(event.target).get('text')).trim();
      if (!text) return;
      state.tasks[type].push({ id: crypto.randomUUID(), text, doneBy: null });
      save();
      renderTasks(type);
    });
  }

  const list = content.querySelector('#taskList');
  list.innerHTML = state.tasks[type]
    .map((task) => `
      <li>
        <div class="row">
          <span class="${task.doneBy ? 'done' : ''}">${task.text}${task.doneBy ? ` (abgehakt von ${task.doneBy})` : ''}</span>
          ${state.currentUser.role === 'mitarbeiter' ? `<button data-action="check" data-id="${task.id}">${task.doneBy ? 'Erledigt' : 'Abhaken'}</button>` : ''}
        </div>
      </li>
    `)
    .join('');

  list.querySelectorAll('[data-action="check"]').forEach((button) => {
    button.addEventListener('click', () => {
      const task = state.tasks[type].find((t) => t.id === button.dataset.id);
      if (task && !task.doneBy) {
        task.doneBy = state.currentUser.username;
        save();
        renderTasks(type);
      }
    });
  });
}

function renderEmployees() {
  if (!state.currentUser) {
    state.view = 'anmeldung';
    return render();
  }

  content.innerHTML = document.getElementById('mitarbeiterTemplate').innerHTML;
  const list = content.querySelector('#userList');

  list.innerHTML = state.users
    .filter((u) => u.role === 'mitarbeiter')
    .map((u) => `<li>${u.username}</li>`)
    .join('');

  const adminArea = content.querySelector('#employeeAdminArea');
  if (!istManager()) {
    adminArea.innerHTML = '<p>Nur Manager können Mitarbeiter hinzufügen.</p>';
    return;
  }

  adminArea.innerHTML = `
    <h3>Mitarbeiter hinzufügen</h3>
    <form id="addEmployeeForm" class="form-grid">
      <label>Benutzername
        <input name="username" required placeholder="z. B. mitarbeiter3" />
      </label>
      <label>Passwort
        <input name="password" type="password" required placeholder="mind. 4 Zeichen" />
      </label>
      <button type="submit">Mitarbeiter speichern</button>
    </form>
  `;

  adminArea.querySelector('#addEmployeeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = String(formData.get('username')).trim();
    const password = String(formData.get('password')).trim();

    if (username.length < 3 || password.length < 4) {
      alert('Bitte gültigen Benutzernamen und Passwort angeben.');
      return;
    }

    if (state.users.some((u) => u.username === username)) {
      alert('Benutzername existiert bereits.');
      return;
    }

    state.users.push({ username, password, role: 'mitarbeiter' });
    save();
    renderEmployees();
  });
}

function renderEmergency() {
  content.innerHTML = document.getElementById('notfallTemplate').innerHTML;
  const button = content.querySelector('#emergencyButton');
  button.addEventListener('click', () => {
    const timestamp = new Date().toLocaleString('de-DE');
    const by = state.currentUser ? state.currentUser.username : 'Gast';
    state.emergencyLog.unshift(`${timestamp}: Notfall von ${by}. Tierarzt wurde angerufen, alle Manager wurden informiert.`);
    save();
    alert('✅ Notfall ausgelöst: Tierarzt wird angerufen und Manager werden informiert.');
    renderEmergency();
  });

  const log = content.querySelector('#emergencyLog');
  log.innerHTML = state.emergencyLog.map((entry) => `<li>${entry}</li>`).join('');
}

function renderAppointments() {
  if (!state.currentUser) {
    state.view = 'anmeldung';
    return render();
  }

  content.innerHTML = `
    <section class="card">
      <h2>Termine</h2>
      ${istManager() ? `
      <form id="createAppointment" class="form-grid">
        <label>Neuer Termin
          <input name="text" required placeholder="z. B. 12.05. 14:00 Tierarztkontrolle" />
        </label>
        <button type="submit">Termin speichern</button>
      </form>
      ` : '<p>Manager können neue Termine eintragen. Mitarbeiter sehen alle Termine.</p>'}
      <ul id="appointmentList" class="list"></ul>
    </section>
  `;

  const list = content.querySelector('#appointmentList');
  list.innerHTML = state.appointments.map((a) => `<li>${a}</li>`).join('');

  const form = content.querySelector('#createAppointment');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = String(new FormData(form).get('text')).trim();
      if (!text) return;
      state.appointments.push(text);
      save();
      renderAppointments();
    });
  }
}
