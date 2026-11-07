
'use strict';

/* ===== MASUTA — общая логика (демо: данные хранятся в localStorage браузера) ===== */

const DBKEY = 'masuta_db_v1';
const TIMES = ['09:00', '11:00', '13:00', '17:00', '19:00'];
const WEEK = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const PAGE_BY_ROLE = { client: 'index-client.html', trainer: 'index-trainer.html', admin: 'index-admin.html' };
const ROLE_LABEL = { client: 'клиент', trainer: 'тренер', admin: 'админ' };

function save(db) { localStorage.setItem(DBKEY, JSON.stringify(db)); }
function load() { return JSON.parse(localStorage.getItem(DBKEY)); }

/* Первичный наполнение: демо-аккаунты, слоты на неделю, программы */
function seed() {
  if (localStorage.getItem(DBKEY)) return;
  const users = [
    { id: 1, role: 'admin',   name: 'Администратор', email: 'admin@mail.ru',   phone: '',                 password: '123' },
    { id: 2, role: 'trainer', name: 'Дмитрий',       email: 'trainer@mail.ru', phone: '+7 999 000-00-00', password: '123' },
    { id: 3, role: 'client',  name: 'Анна Смирнова', email: 'client@mail.ru',  phone: '+7 999 111-11-11', password: '123', goal: 'Похудение' }
  ];
  const slots = []; let id = 1;
  for (let d = 0; d < 7; d++) {
    const dt = new Date(); dt.setDate(dt.getDate() + d);
    const iso = dt.toISOString().slice(0, 10);
    TIMES.forEach(t => slots.push({ id: id++, date: iso, time: t, takenBy: null, status: null }));
  }
  const programs = [
    { id: 1, name: 'Новичок',  price: 1000, desc: 'Для старта и первых результатов' },
    { id: 2, name: 'Опытный',  price: 1500, desc: 'Для стабильного прогресса' },
    { id: 3, name: 'В тонусе', price: 2000, desc: 'Для максимальных результатов' }
  ];
  save({ users, slots, programs, current: null });
}

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return WEEK[d.getDay()] + ', ' + dd + '.' + mm;
}
const todayISO = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const statCard = (label, val) =>
  '<div class="stat-card"><b>' + val + '</b><span>' + label + '</span></div>';

function stBadge(st) {
  if (!st) return '';
  return '<span class="st ' + (st === 'ok' ? 'st-ok' : 'st-new') + '">' +
    (st === 'ok' ? 'подтверждено' : 'ожидает подтверждения') + '</span>';
}

function userChip(u) {
  return '<div class="chip"><b>' + esc(u.name) + '</b><span>' + ROLE_LABEL[u.role] + '</span>' +
    '<button class="link-btn" onclick="logout()">Выйти</button></div>';
}

/* ===== Запуск страницы ===== */
function initPage(role) {
  seed();
  const db = load();
  const box = document.getElementById('userBox');
  if (db.current) {
    const u = db.users.find(x => x.id === db.current);
    box.innerHTML = userChip(u);
    if (u.role === role) render(role, db, u);
    else showWrongRole(role, u);
  } else {
    renderAuth(role);
  }
}

function showWrongRole(role, u) {
  document.getElementById('app').innerHTML =
    '<div class="auth-wrap"><div class="card auth-card">' +
    '<h2>Доступ ограничен</h2>' +
    '<p class="muted">Вы вошли как <b>' + esc(u.name) + '</b> (' + ROLE_LABEL[u.role] + '). ' +
    'Эта версия сайта — для роли «' + ROLE_LABEL[role] + '».</p>' +
    '<a class="btn" href="' + PAGE_BY_ROLE[u.role] + '">Перейти в свою версию</a><br>' +
    '<button class="link-btn" style="margin-top:16px" onclick="logout()">Выйти из аккаунта</button>' +
    '</div></div>';
}

function render(role, db, u) {
  if (role === 'client') renderClient(db, u);
  if (role === 'trainer') renderTrainer(db, u);
  if (role === 'admin') renderAdmin(db, u);
}

/* ===== Вход и регистрация ===== */
function renderAuth(role) {
  document.getElementById('app').innerHTML =
    '<div class="auth-wrap"><div class="card auth-card">' +
    '<h2>Вход в MASUTA</h2>' +
    '<p class="muted">Демо-аккаунты: client@mail.ru · trainer@mail.ru · admin@mail.ru — пароль у всех «123»</p>' +
    '<div class="tabs">' +
    '<button id="tabLogin" class="tab active" onclick="switchTab(true)">Вход</button>' +
    '<button id="tabReg" class="tab" onclick="switchTab(false)">Регистрация</button></div>' +
    '<form id="loginForm" onsubmit="doLogin(event)">' +
    '<label>Email</label><input id="liEmail" type="email" required placeholder="you@mail.ru">' +
    '<label>Пароль</label><input id="liPass" type="password" required placeholder="123">' +
    '<div class="err" id="liErr"></div>' +
    '<button class="btn" type="submit">Войти</button>' +
    '</form>' +
    '<form id="regForm" onsubmit="doRegister(event)" style="display:none">' +
    '<label>Имя и фамилия</label><input id="rName" required placeholder="Иван Петров">' +
    '<label>Email</label><input id="rEmail" type="email" required placeholder="you@mail.ru">' +
    '<label>Телефон</label><input id="rPhone" type="tel" required placeholder="+7 999 000-00-00">' +
    '<label>Пароль</label><input id="rPass" type="password" required minlength="3">' +
    '<label>Ваша цель</label><select id="rGoal"><option>Похудение</option><option>Набор массы</option><option>Тонус и здоровье</option></select>' +
    '<div class="err" id="rErr"></div>' +
    '<button class="btn" type="submit">Зарегистрироваться</button>' +
    '</form></div></div>';
}

function switchTab(login) {
  document.getElementById('loginForm').style.display = login ? '' : 'none';
  document.getElementById('regForm').style.display = login ? 'none' : '';
  document.getElementById('tabLogin').classList.toggle('active', login);
  document.getElementById('tabReg').classList.toggle('active', !login);
}

function doLogin(e) {
  e.preventDefault();
  const db = load();
  const email = document.getElementById('liEmail').value.trim().toLowerCase();
  const pass = document.getElementById('liPass').value;
  const u = db.users.find(x => x.email.toLowerCase() === email && x.password === pass);
  if (!u) { document.getElementById('liErr').textContent = 'Неверный email или пароль'; return; }
  db.current = u.id; save(db);
  location.href = PAGE_BY_ROLE[u.role];
}

function doRegister(e) {
  e.preventDefault();
  const db = load();
  const email = document.getElementById('rEmail').value.trim().toLowerCase();
  if (db.users.some(x => x.email.toLowerCase() === email)) {
    document.getElementById('rErr').textContent = 'Этот email уже зарегистрирован';
    return;
  }
  db.users.push({
    id: Math.max(0, ...db.users.map(x => x.id)) + 1,
    role: 'client',
    name: document.getElementById('rName').value.trim(),
    email: email,
    phone: document.getElementById('rPhone').value.trim(),
    password: document.getElementById('rPass').value,
    goal: document.getElementById('rGoal').value
  });
  db.current = db.users[db.users.length - 1].id;
  save(db);
  location.href = PAGE_BY_ROLE.client;
}

function logout() {
  const db = load(); db.current = null; save(db); location.reload();
}

/* ===== Действия ===== */
function bookSlot(id) {
  const db = load();
  const s = db.slots.find(x => x.id === id);
  if (!s || s.takenBy) return;
  s.takenBy = db.current; s.status = 'new';
  save(db); location.reload();
}

function cancelBooking(id) {
  const db = load();
  const s = db.slots.find(x => x.id === id);
  const me = db.users.find(x => x.id === db.current);
  if (!s || !me) return;
  if (me.role === 'client' && s.takenBy !== me.id) return;
  s.takenBy = null; s.status = null;
  save(db); location.reload();
}

function confirmSlot(id) {
  const db = load();
  const s = db.slots.find(x => x.id === id);
  if (s && s.takenBy) { s.status = 'ok'; save(db); location.reload(); }
}

function delSlot(id) {
  const db = load();
  const s = db.slots.find(x => x.id === id);
  if (s && !s.takenBy) { db.slots = db.slots.filter(x => x.id !== id); save(db); location.reload(); }
}

function addSlot(e) {
  e.preventDefault();
  const db = load();
  const date = document.getElementById('slDate').value;
  const time = document.getElementById('slTime').value;
  if (db.slots.some(s => s.date === date && s.time === time)) { alert('Такой слот уже есть'); return; }
  db.slots.push({ id: Math.max(0, ...db.slots.map(s => s.id)) + 1, date, time, takenBy: null, status: null });
  save(db); location.reload();
}

function adminDelUser(id) {
  const db = load();
  const u = db.users.find(x => x.id === id);
  if (!u || u.role !== 'client') return;
  if (!confirm('Удалить клиента «' + u.name + '»? Его записи будут отменены.')) return;
  db.slots.forEach(s => { if (s.takenBy === id) { s.takenBy = null; s.status = null; } });
  db.users = db.users.filter(x => x.id !== id);
  save(db); location.reload();
}

function saveProg(id) {
  const db = load();
  const p = db.programs.find(x => x.id === id);
  p.price = Number(document.getElementById('pr' + id).value) || p.price;
  save(db); location.reload();
}

function addProgram(e) {
  e.preventDefault();
  const db = load();
  const name = document.getElementById('npName').value.trim();
  const price = Number(document.getElementById('npPrice').value) || 0;
  const desc = document.getElementById('npDesc').value.trim() || '—';
  if (!name) return;
  db.programs.push({ id: Math.max(0, ...db.programs.map(x => x.id)) + 1, name, price, desc });
  save(db); location.reload();
}

function delProg(id) {
  const db = load();
  db.programs = db.programs.filter(x => x.id !== id);
  save(db); location.reload();
}

/* ===== Версия КЛИЕНТ ===== */
function renderClient(db, u) {
  const free = db.slots.filter(s => !s.takenBy);
  const byDate = {};
  free.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
  const dates = Object.keys(byDate).sort();

  const booking = dates.length
    ? dates.map(d =>
        '<div class="date-row"><div class="date-name">' + fmtDate(d) + '</div><div class="slot-row">' +
        byDate[d].map(s => '<button class="slot-chip free" onclick="bookSlot(' + s.id + ')">' + s.time + '</button>').join('') +
        '</div></div>').join('')
    : '<p class="muted">Свободных слотов пока нет — тренер скоро добавит расписание.</p>';

  const mine = db.slots.filter(s => s.takenBy === u.id)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const my = mine.length
    ? mine.map(s =>
        '<div class="row-line"><div><b>' + fmtDate(s.date) + '</b> · ' + s.time + '</div>' +
        stBadge(s.status) +
        '<button class="btn-mini ghost" onclick="cancelBooking(' + s.id + ')">Отменить</button></div>').join('')
    : '<p class="muted">У вас пока нет записей. Выберите удобное время выше.</p>';

  const progs = db.programs.map(p =>
    '<div class="mini-card"><b>' + esc(p.name) + '</b><span class="muted">' + esc(p.desc) + '</span>' +
    '<div class="price-line">' + p.price.toLocaleString('ru-RU') + ' ₽ <span class="muted">/ занятие</span></div>' +
    '<a class="btn-mini" style="text-align:center;align-self:stretch;text-decoration:none;padding:10px" href="#booking">Записаться</a></div>').join('');

  document.getElementById('app').innerHTML =
    '<div class="page-head"><h1>Привет, ' + esc(u.name.split(' ')[0]) + '!</h1>' +
    '<p class="muted">Ваша цель: ' + esc(u.goal || 'не указана') + '. Выберите время — остальное берёт на себя тренер.</p></div>' +
    '<section class="card" id="booking"><h3>Записаться на тренировку</h3><div class="schedule">' + booking + '</div></section>' +
    '<section class="card"><h3>Мои записи</h3>' + my + '</section>' +
    '<section class="card"><h3>Программы</h3><div class="mini-grid">' + progs + '</div></section>';
}

/* ===== Версия ТРЕНЕР ===== */
function renderTrainer(db, u) {
  const upcoming = db.slots.filter(s => s.date >= todayISO());
  const free = upcoming.filter(s => !s.takenBy).length;
  const booked = upcoming.filter(s => s.takenBy).length;
  const pending = upcoming.filter(s => s.takenBy && s.status === 'new').length;

  const byDate = {};
  upcoming.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
  const dates = Object.keys(byDate).sort();

  const schedule = dates.length ? dates.map(d =>
    '<div class="date-row"><div class="date-name">' + fmtDate(d) + '</div><div class="day-cells">' +
    byDate[d].map(s => {
      if (!s.takenBy) {
        return '<div class="day-cell free"><b>' + s.time + '</b><span>свободно</span>' +
          '<button class="btn-mini ghost" onclick="delSlot(' + s.id + ')">Удалить</button></div>';
      }
      const cl = db.users.find(x => x.id === s.takenBy);
      const actions = s.status === 'new'
        ? '<button class="btn-mini" onclick="confirmSlot(' + s.id + ')">Подтвердить</button>' +
          '<button class="btn-mini ghost" onclick="cancelBooking(' + s.id + ')">Отменить</button>'
        : '<button class="btn-mini ghost" onclick="cancelBooking(' + s.id + ')">Отменить</button>';
      return '<div class="day-cell taken"><b>' + s.time + '</b><span>' + esc(cl ? cl.name : '—') + '</span>' +
        stBadge(s.status) + actions + '</div>';
    }).join('') + '</div></div>').join('')
    : '<p class="muted">Расписание пустое — добавьте слоты ниже.</p>';

  const clients = db.users.filter(x => x.role === 'client').map(c => {
    const n = db.slots.filter(s => s.takenBy === c.id).length;
    return '<div class="row-line"><div><b>' + esc(c.name) + '</b><span class="muted"> · ' + esc(c.email) + ' · ' + esc(c.phone) + '</span></div>' +
      '<span class="muted">' + n + ' записей · цель: ' + esc(c.goal || '—') + '</span></div>';
  }).join('');

  document.getElementById('app').innerHTML =
    '<div class="page-head"><h1>Панель тренера</h1><p class="muted">' + esc(u.name) + ' · расписание на ближайшие 7 дней</p></div>' +
    '<div class="stat-row">' + statCard('свободных слотов', free) + statCard('записей', booked) + statCard('ожидают подтверждения', pending) + '</div>' +
    '<section class="card"><h3>Расписание</h3>' + schedule + '</section>' +
    '<section class="card"><h3>Добавить слот</h3>' +
    '<form class="inline-form" onsubmit="addSlot(event)">' +
    '<input id="slDate" type="date" required value="' + todayISO() + '">' +
    '<select id="slTime">' + TIMES.map(t => '<option>' + t + '</option>').join('') + '</select>' +
    '<button class="btn" type="submit">Добавить</button>' +
    '</form></section>' +
    '<section class="card"><h3>Клиенты</h3>' + clients + '</section>';
}

/* ===== Версия АДМИН ===== */
function renderAdmin(db, u) {
  const clients = db.users.filter(x => x.role === 'client');
  const bookings = db.slots.filter(s => s.takenBy)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const confirmed = bookings.filter(s => s.status === 'ok').length;
  const revenue = confirmed * 1500;

  const usersRows = db.users.map(x => {
    const n = db.slots.filter(s => s.takenBy === x.id).length;
    const del = x.role === 'client'
      ? '<button class="btn-mini ghost" onclick="adminDelUser(' + x.id + ')">Удалить</button>'
      : '<span class="muted">системный</span>';
    return '<tr><td><b>' + esc(x.name) + '</b></td><td>' + esc(x.email) + '</td><td>' + esc(x.phone || '—') + '</td><td>' + ROLE_LABEL[x.role] + '</td><td>' + n + '</td><td>' + del + '</td></tr>';
  }).join('');

  const bookRows = bookings.map(s => {
    const c = db.users.find(x => x.id === s.takenBy);
    return '<tr><td>' + fmtDate(s.date) + '</td><td>' + s.time + '</td><td>' + esc(c ? c.name : '—') + '</td><td>' +
      (s.status === 'ok' ? '<span class="st st-ok">подтверждено</span>' : '<span class="st st-new">ожидает</span>') + '</td>' +
      '<td><button class="btn-mini ghost" onclick="cancelBooking(' + s.id + ')">Отменить</button></td></tr>';
  }).join('');

  const progRows = db.programs.map(p =>
    '<div class="row-line"><div><b>' + esc(p.name) + '</b><span class="muted"> · ' + esc(p.desc) + '</span></div>' +
    '<div class="prog-edit"><input id="pr' + p.id + '" type="number" min="0" value="' + p.price + '">' +
    '<button class="btn-mini" onclick="saveProg(' + p.id + ')">Сохранить</button>' +
    '<button class="btn-mini ghost" onclick="delProg(' + p.id + ')">Удалить</button></div></div>').join('');

  document.getElementById('app').innerHTML =
    '<div class="page-head"><h1>Панель администратора</h1><p class="muted">Управление клиентами, записями, программами и ценами</p></div>' +
    '<div class="stat-row">' +
    statCard('клиентов', clients.length) +
    statCard('записей всего', bookings.length) +
    statCard('подтверждено', confirmed) +
    statCard('выручка (оценка), ₽', revenue.toLocaleString('ru-RU')) +
    '</div>' +
    '<section class="card"><h3>Все записи</h3><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
    '<th>Дата</th><th>Время</th><th>Клиент</th><th>Статус</th><th>Действие</th></tr></thead><tbody>' +
    (bookRows || '<tr><td colspan="5" class="muted">Записей пока нет</td></tr>') +
    '</tbody></table></div></section>' +
    '<section class="card"><h3>Пользователи</h3><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
    '<th>Имя</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Записей</th><th></th></tr></thead><tbody>' +
    usersRows + '</tbody></table></div></section>' +
    '<section class="card"><h3>Программы и цены</h3>' + progRows +
    '<form class="inline-form" style="margin-top:20px" onsubmit="addProgram(event)">' +
    '<input id="npName" placeholder="Название программы" required>' +
    '<input id="npPrice" type="number" min="0" placeholder="Цена, ₽" required>' +
    '<input id="npDesc" placeholder="Короткое описание">' +
    '<button class="btn" type="submit">Добавить программу</button>' +
    '</form></section>';
}
