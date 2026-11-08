'use strict';

/* ===== MASUTA — демо-логика: тарифы, запись, чат, баланс, анкеты ===== */

const DBKEY = 'masuta_db_v2';
const TIMES = ['09:00', '11:00', '13:00', '17:00', '19:00'];
const WEEK = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const PAGE_BY_ROLE = { client: 'index-client.html', trainer: 'index-trainer.html', admin: 'index-admin.html' };
const ROLE_LABEL = { client: 'клиент', trainer: 'тренер', admin: 'админ' };

const TIERS = {
  starter: { name: 'Начальный', max: 3,  perDay: 1, price: 1000, note: 'до 3 активных записей, 1 занятие в день' },
  pro:     { name: 'Опытный',   max: 8,  perDay: 2, price: 1500, note: 'до 8 активных записей, 2 занятия в день' },
  prime:   { name: 'Прайм',     max: 99, perDay: 3, price: 2000, note: 'без лимита записей, 3 занятия в день, приоритет' }
};

let CURRENT_ROLE = null;

function save(db) { localStorage.setItem(DBKEY, JSON.stringify(db)); }
function load() { try { return JSON.parse(localStorage.getItem(DBKEY)); } catch (e) { return null; } }

/* ===== Первичное наполнение ===== */
function seed() {
  if (localStorage.getItem(DBKEY)) return;
  const users = [
    { id: 1, role: 'admin',   name: 'Администратор', email: 'admin@mail.ru',   phone: '',                 password: '123' },
    { id: 2, role: 'trainer', name: 'Дмитрий',       email: 'trainer@mail.ru', phone: '+7 999 000-00-00', password: '123' },
    { id: 3, role: 'client',  name: 'Анна Смирнова', email: 'client@mail.ru',  phone: '+7 999 111-11-11', password: '123',
      tier: 'pro', balance: 4500,
      questionnaire: { weight: '62', height: '168', age: '29', exp: 'нет опыта', goal: 'Похудение',
        health: 'ограничений нет', comment: 'Хочу привести себя в форму к лету',
        ts: Date.now(), sent: true, reviewed: false } }
  ];
  const slots = []; let id = 1;
  for (let d = 0; d < 7; d++) {
    const dt = new Date(); dt.setDate(dt.getDate() + d);
    TIMES.forEach(t => slots.push({ id: id++, date: isoOf(dt), time: t, takenBy: null, status: null, paid: null }));
  }
  const chat = { 3: [ { from: 'trainer', text: 'Здравствуйте! Вижу вашу анкету — разбираю, ответ пришлю здесь.', ts: Date.now() - 3600000, read: false } ] };
  const payments = [ { id: 1, clientId: 3, amount: 5000, date: isoOf(new Date()), note: 'Пополнение баланса' } ];
  save({ users, slots, chat, payments, current: null });
}

/* ===== Утилиты ===== */
function isoOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const todayISO = () => isoOf(new Date());
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return WEEK[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
}
function fmtTime(ts) {
  const d = new Date(ts), now = new Date();
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return d.toDateString() === now.toDateString() ? hm : WEEK[d.getDay()] + ', ' + hm;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const val = id => (document.getElementById(id) || {}).value || '';
function weekStartISO() { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoOf(d); }
const statCard = (label, v) => '<div class="stat-card"><b>' + v + '</b><span>' + label + '</span></div>';

function stBadge(st) {
  if (!st) return '';
  return '<span class="st ' + (st === 'ok' ? 'st-ok' : 'st-new') + '">' +
    (st === 'ok' ? 'подтверждено' : 'ожидает подтверждения') + '</span>';
}
function qBadge(q) {
  if (!q || !q.sent) return '<span class="st st-warn">не заполнена</span>';
  return q.reviewed ? '<span class="st st-ok">разобрана</span>' : '<span class="st st-new">ждёт разбора</span>';
}
function tierBadge(t) { return '<span class="tier-badge t-' + t + '">' + TIERS[t].name + '</span>'; }

function userChip(u) {
  let extra = '';
  if (u.role === 'client') extra = tierBadge(u.tier) + '<span class="chip-balance">' + u.balance + ' ₽</span>';
  return '<div class="chip"><b>' + esc(u.name) + '</b><span>' + ROLE_LABEL[u.role] + '</span>' + extra +
    '<button class="link-btn" onclick="logout()">Выйти</button></div>';
}

/* ===== Запуск страницы ===== */
function initPage(role) {
  CURRENT_ROLE = role;
  seed();
  const db = load();
  if (!db) return;
  document.getElementById('userBox').innerHTML = '';
  if (db.current) {
    const u = db.users.find(x => x.id === db.current);
    if (!u) { db.current = null; save(db); return renderAuth(role); }
    document.getElementById('userBox').innerHTML = userChip(u);
    if (u.role === role) {
      if (role === 'client') renderClient(db, u);
      else if (role === 'trainer') renderTrainer(db, u);
      else renderAdmin(db, u);
      const cb = document.getElementById('chatBox');
      if (cb) cb.scrollTop = cb.scrollHeight;
    } else showWrongRole(role, u);
  } else renderAuth(role);
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
    '<div class="err" id="rErr"></div>' +
    '<button class="btn" type="submit">Зарегистрироваться</button>' +
    '<p class="muted" style="font-size:12px;margin-top:8px">Новые клиенты стартуют на тарифе «Начальный» — тариф можно сменить в профиле.</p>' +
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
  const email = val('liEmail').trim().toLowerCase();
  const u = db.users.find(x => x.email.toLowerCase() === email && x.password === val('liPass'));
  if (!u) { document.getElementById('liErr').textContent = 'Неверный email или пароль'; return; }
  db.current = u.id; save(db);
  location.href = PAGE_BY_ROLE[u.role];
}

function doRegister(e) {
  e.preventDefault();
  const db = load();
  const email = val('rEmail').trim().toLowerCase();
  if (db.users.some(x => x.email.toLowerCase() === email)) {
    document.getElementById('rErr').textContent = 'Этот email уже зарегистрирован'; return;
  }
  db.users.push({
    id: Math.max(0, ...db.users.map(x => x.id)) + 1,
    role: 'client', name: val('rName').trim(), email: email,
    phone: val('rPhone').trim(), password: val('rPass'),
    tier: 'starter', balance: 0, questionnaire: null
  });
  db.current = db.users[db.users.length - 1].id;
  save(db);
  location.href = PAGE_BY_ROLE.client;
}

function logout() { const db = load(); db.current = null; save(db); location.reload(); }

/* ===== Вспомогательное по записям ===== */
const me = db => db.users.find(x => x.id === db.current);
const activeSlots = (db, uid) => db.slots.filter(s => s.takenBy === uid && s.status !== 'cancel');
const weeklyCount = (db, uid) => activeSlots(db, uid).filter(s => s.date >= weekStartISO()).length;
function nextPayId(db) { return db.payments.length ? Math.max(...db.payments.map(p => p.id)) + 1 : 1; }
function byDate(a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }

function scheduleHTML(db, u) {
  const dates = [...new Set(db.slots.map(s => s.date))].filter(d => d >= todayISO()).sort();
  if (!dates.length) return '<p class="muted">Свободных слотов пока нет — загляните позже.</p>';
  return dates.map(d => {
    const cells = db.slots.filter(s => s.date === d).map(s => {
      if (!s.takenBy) return '<button class="slot-chip free" onclick="bookSlot(' + s.id + ')">' + s.time + '</button>';
      if (u && s.takenBy === u.id)
        return '<span class="slot-chip mine">' + s.time + stBadge(s.status) +
          '<button class="link-btn" onclick="cancelBooking(' + s.id + ')">отменить</button></span>';
      return '<span class="slot-chip busy">' + s.time + '</span>';
    }).join('');
    return '<div class="date-row"><div class="date-name">' + fmtDate(d) + '</div><div class="slot-row">' + cells + '</div></div>';
  }).join('');
}

/* ===== КЛИЕНТ: вкладки ===== */
function clientTab(name) {
  sessionStorage.setItem('masuta_tab', name);
  ['book', 'my', 'chat', 'pay', 'quest', 'prof'].forEach(t => {
    const sec = document.getElementById('tab-' + t);
    if (sec) sec.hidden = t !== name;
  });
  document.querySelectorAll('.pnav').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
}
function pnavBtn(tab, label, current) {
  return '<button class="pnav' + (tab === current ? ' active' : '') + '" data-tab="' + tab + '" onclick="clientTab(\'' + tab + '\')">' + label + '</button>';
}
function row(k, v) { return '<div class="row"><span class="muted">' + k + '</span><b>' + v + '</b></div>'; }

function renderClient(db, u) {
  const t = TIERS[u.tier] || TIERS.starter;
  const active = activeSlots(db, u.id);
  const unread = chatUnread(db, u.id, 'trainer');
  const q = u.questionnaire;
  const tab = sessionStorage.getItem('masuta_tab') || 'book';
  const lowBalance = u.balance < t.price;

  document.getElementById('app').innerHTML =
    '<div class="page-head"><h1>Личный кабинет</h1>' +
    '<p class="muted">' + tierBadge(u.tier) + ' — ' + t.note + '. Цена занятия: <b>' + t.price + ' ₽</b>' +
    (lowBalance ? ' · <span class="warn-text">баланса не хватает на занятие — пополните вкладку «Баланс»</span>' : '') + '</p></div>' +

    '<nav class="page-nav">' +
    pnavBtn('book', 'Запись', tab) +
    pnavBtn('my', 'Мои записи (' + active.length + ')', tab) +
    pnavBtn('chat', 'Чат с тренером' + (unread ? ' (' + unread + ')' : ''), tab) +
    pnavBtn('pay', 'Баланс: ' + u.balance + ' ₽', tab) +
    pnavBtn('quest', 'Анкета' + (q && !q.sent ? ' ⚠' : ''), tab) +
    pnavBtn('prof', 'Профиль', tab) +
    '</nav>' +

    '<section id="tab-book" class="tabpanel">' +
    '<div class="card"><h3>Свободные слоты</h3>' + scheduleHTML(db, u) + '</div></section>' +

    '<section id="tab-my" class="tabpanel" hidden><div class="card"><h3>Мои записи</h3>' +
    (active.length
      ? active.slice().sort(byDate).map(s =>
        '<div class="list-row"><b>' + fmtDate(s.date) + ' · ' + s.time + '</b>' + stBadge(s.status) +
        '<span class="muted">списано: ' + (s.paid || 0) + ' ₽</span>' +
        '<button class="btn-mini ghost" onclick="cancelBooking(' + s.id + ')">Отменить</button></div>').join('')
      : '<p class="muted">Записей пока нет. Откройте вкладку «Запись» и выберите время.</p>') +
    '</div></section>' +

    '<section id="tab-chat" class="tabpanel" hidden><div class="card chat-card"><h3>Чат с тренером</h3>' +
    '<div class="chat-window" id="chatBox">' + chatHTML(db, u.id, false) + '</div>' +
    '<form onsubmit="sendMsgClient(event)"><div class="chat-input">' +
    '<input id="msgText" placeholder="Сообщение тренеру..." required>' +
    '<button class="btn-mini" type="submit">Отправить</button></div></form></div></section>' +

    '<section id="tab-pay" class="tabpanel" hidden>' +
    '<div class="card"><h3>Баланс</h3><div class="balance-big">' + u.balance + ' ₽</div>' +
    '<p class="muted">При записи списывается ' + t.price + ' ₽ (цена тарифа «' + t.name + '»). Отмена — деньги возвращаются.</p>' +
    '<div class="topup-row">' +
    '<button class="btn-mini" onclick="topUp(1000)">+1 000 ₽</button>' +
    '<button class="btn-mini" onclick="topUp(3000)">+3 000 ₽</button>' +
    '<button class="btn-mini" onclick="topUp(5000)">+5 000 ₽</button></div>' +
    '<form onsubmit="topUpCustom(event)" class="topup-form">' +
    '<input id="topAmount" type="number" min="100" step="100" placeholder="Своя сумма, ₽" required>' +
    '<button class="btn-mini" type="submit">Пополнить</button></form>' +
    '<p class="muted" style="font-size:12px;margin-top:10px">Демо-режим: реальные деньги не списываются.</p></div>' +
    '<div class="card"><h3>История операций</h3>' +
    (db.payments.filter(p => p.clientId === u.id).length
      ? db.payments.filter(p => p.clientId === u.id).slice().reverse().map(p =>
        '<div class="list-row"><span class="muted">' + p.date + '</span><span>' + esc(p.note) + '</span>' +
        '<b class="' + (p.amount > 0 ? 'pay-pos' : 'pay-neg') + '">' + (p.amount > 0 ? '+' : '') + p.amount + ' ₽</b></div>').join('')
      : '<p class="muted">Операций пока нет.</p>') +
    '</div></section>' +

    '<section id="tab-quest" class="tabpanel" hidden><div class="card"><h3>Анкета клиента ' + qBadge(q) + '</h3>' +
    '<p class="muted">Заполните анкету — тренер увидит её у себя и подберёт программу.</p>' +
    '<form onsubmit="saveQuestionnaire(event)"><div class="form-grid">' +
    '<label>Вес, кг<input id="qWeight" type="number" min="30" max="300" value="' + esc(q.weight || '') + '" placeholder="70"></label>' +
    '<label>Рост, см<input id="qHeight" type="number" min="120" max="230" value="' + esc(q.height || '') + '" placeholder="175"></label>' +
    '<label>Возраст<input id="qAge" type="number" min="10" max="100" value="' + esc(q.age || '') + '" placeholder="25"></label>' +
    '<label>Опыт тренировок<input id="qExp" value="' + esc(q.exp || '') + '" placeholder="например: 2 года в зале"></label>' +
    '<label>Цель<select id="qGoal">' + ['Похудение', 'Набор массы', 'Рельеф', 'Тонус и здоровье', 'Подготовка к соревнованиям']
      .map(g => '<option' + (q.goal === g ? ' selected' : '') + '>' + g + '</option>').join('') + '</select></label>' +
    '<label>Ограничения по здоровью<input id="qHealth" value="' + esc(q.health || '') + '" placeholder="травмы, диагнозы или «нет»"></label>' +
    '</div>' +
    '<label style="margin-top:12px">Комментарий тренеру<textarea id="qComment" rows="3" placeholder="Пожелания, график, вопросы...">' + esc(q.comment || '') + '</textarea></label>' +
    '<button class="btn" type="submit" style="margin-top:14px">' + (q && q.sent ? 'Обновить анкету' : 'Отправить анкету') + '</button></form>' +
    (q && q.sent && q.reviewed ? '<p class="muted" style="margin-top:12px">Тренер разобрал вашу анкету — детали в чате.</p>' : '') +
    '</div></section>' +

    '<section id="tab-prof" class="tabpanel" hidden>' +
    '<div class="card"><h3>Профиль</h3><div class="info-rows">' +
    row('Имя', esc(u.name)) + row('Email', esc(u.email)) + row('Телефон', esc(u.phone || '—')) +
    row('Роль', ROLE_LABEL[u.role]) + row('Тариф', TIERS[u.tier].name) + row('Баланс', u.balance + ' ₽') +
    '</div></div>' +
    '<div class="card"><h3>Тарифы</h3>' +
    '<p class="muted">Смена тарифа в демо-режиме бесплатна. Прайм даёт приоритет: больше записей и занятий в день.</p>' +
    '<div class="plan-row">' +
    ['starter', 'pro', 'prime'].map(k => {
      const p = TIERS[k];
      return '<div class="plan-card' + (u.tier === k ? ' current' : '') + '">' +
        '<b>' + p.name + '</b><p>' + p.note + '</p>' +
        '<div class="plan-price">' + p.price + ' ₽ <span>/ занятие</span></div>' +
        (u.tier === k ? '<button class="btn-mini ghost" disabled>Текущий тариф</button>'
          : '<button class="btn-mini" onclick="changeTier(\'' + k + '\')">Перейти</button>') +
        '</div>';
    }).join('') + '</div></div>' +
    '<button class="btn-mini ghost" onclick="logout()">Выйти из аккаунта</button></section>';

  clientTab(tab);
}

/* ===== ТРЕНЕР: вкладки ===== */
function trainerTab(name) {
  sessionStorage.setItem('masuta_ttab', name);
  ['schedule', 'clients', 'quests', 'chat'].forEach(t => {
    const sec = document.getElementById('ttab-' + t);
    if (sec) sec.hidden = t !== name;
  });
  document.querySelectorAll('.pnav').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
}
function tnavBtn(tab, label, current) {
  return '<button class="pnav' + (tab === current ? ' active' : '') + '" data-tab="' + tab + '" onclick="trainerTab(\'' + tab + '\')">' + label + '</button>';
}
function qItem(k, v) { return '<div class="q-item"><span class="muted">' + k + '</span><b>' + esc(v || '—') + '</b></div>'; }

function openChat(cid) {
  sessionStorage.setItem('masuta_chat', String(cid));
  initPage('trainer'); trainerTab('chat');
}

function renderTrainer(db, u) {
  const future = db.slots.filter(s => s.date >= todayISO());
  const busy = future.filter(s => s.takenBy);
  const pending = busy.filter(s => s.status === 'new').length;
  const clients = db.users.filter(x => x.role === 'client');
  const newQ = clients.filter(c => c.questionnaire && c.questionnaire.sent && !c.questionnaire.reviewed).length;
  const sel = parseInt(sessionStorage.getItem('masuta_chat') || 0, 10);
  const current = clients.some(c => c.id === sel) ? sel : (clients[0] ? clients[0].id : 0);
  const tab = sessionStorage.getItem('masuta_ttab') || 'schedule';

  document.getElementById('app').innerHTML =
    '<div class="page-head"><h1>Панель тренера</h1><p class="muted">Расписание, клиенты, анкеты и чаты — всё под рукой.</p></div>' +

    '<div class="stat-row">' +
    statCard('свободных слотов', future.filter(s => !s.takenBy).length) +
    statCard('записей впереди', busy.length) +
    statCard('ожидают подтверждения', pending) +
    statCard('новых анкет', newQ) +
    '</div>' +

    '<nav class="page-nav">' +
    tnavBtn('schedule', 'Расписание', tab) +
    tnavBtn('clients', 'Клиенты (' + clients.length + ')', tab) +
    tnavBtn('quests', 'Анкеты', tab) +
    tnavBtn('chat', 'Чаты', tab) +
    '</nav>' +

    '<section id="ttab-schedule" class="tabpanel">' +
    '<div class="card"><h3>Расписание</h3><div class="day-cells">' +
    ([...new Set(db.slots.map(s => s.date))].filter(d => d >= todayISO()).sort().map(d =>
      '<div class="day-cell"><div class="cell-date">' + fmtDate(d) + '</div>' +
      db.slots.filter(s => s.date === d).map(s => {
        const c = s.takenBy ? db.users.find(x => x.id === s.takenBy) : null;
        if (!s.takenBy)
          return '<div class="cell-slot"><b>' + s.time + '</b><span class="muted">свободно</span>' +
            '<button class="btn-mini ghost" onclick="delSlot(' + s.id + ')">удалить</button></div>';
        return '<div class="cell-slot taken"><b>' + s.time + '</b><span>' + esc(c ? c.name : '—') + '</span>' + stBadge(s.status) +
          '<div class="cell-btns">' +
          (s.status === 'new' ? '<button class="btn-mini" onclick="confirmSlot(' + s.id + ')">✓ подтвердить</button>' : '') +
          '<button class="btn-mini ghost" onclick="trainerCancel(' + s.id + ')">✕ отменить</button></div></div>';
      }).join('') + '</div>').join('') || '<p class="muted">Слотов нет</p>') +
    '</div>' +
    '<form onsubmit="addSlot(event)" class="add-slot"><label>Дата<input id="slDate" type="date" min="' + todayISO() + '" required></label>' +
    '<label>Время<select id="slTime">' + TIMES.map(t => '<option>' + t + '</option>').join('') + '</select></label>' +
    '<button class="btn-mini" type="submit">+ Добавить слот</button></form></div></section>' +

    '<section id="ttab-clients" class="tabpanel" hidden><div class="card"><h3>Клиенты</h3>' +
    (clients.length ? clients.map(c => {
      const n = chatUnread(db, c.id, 'client');
      return '<div class="list-row"><b>' + esc(c.name) + '</b>' + tierBadge(c.tier) +
        '<span class="muted">тел: ' + esc(c.phone || '—') + ' · баланс: ' + c.balance + ' ₽ · записей: ' + activeSlots(db, c.id).length + '</span>' +
        '<button class="btn-mini ghost" onclick="trainerTab(\'quests\')">Анкета ' + qBadge(c.questionnaire) + '</button>' +
        '<button class="btn-mini" onclick="openChat(' + c.id + ')">Чат' + (n ? ' (' + n + ')' : '') + '</button></div>';
    }).join('') : '<p class="muted">Клиентов пока нет.</p>') +
    '</div></section>' +

    '<section id="ttab-quests" class="tabpanel" hidden>' +
    (clients.filter(c => c.questionnaire && c.questionnaire.sent).length
      ? clients.filter(c => c.questionnaire && c.questionnaire.sent).map(c =>
        '<div class="card"><h3>' + esc(c.name) + ' ' + tierBadge(c.tier) + ' ' + qBadge(c.questionnaire) + '</h3>' +
        '<div class="q-grid">' +
        qItem('Вес', c.questionnaire.weight) + qItem('Рост', c.questionnaire.height) + qItem('Возраст', c.questionnaire.age) +
        qItem('Опыт', c.questionnaire.exp) + qItem('Цель', c.questionnaire.goal) + qItem('Ограничения', c.questionnaire.health) +
        '</div>' + (c.questionnaire.comment ? '<p class="muted">Комментарий: ' + esc(c.questionnaire.comment) + '</p>' : '') +
        (!c.questionnaire.reviewed ? '<button class="btn-mini" style="margin-top:12px" onclick="markReviewed(' + c.id + ')">Отметить разобранной</button>' : '') +
        '</div>').join('')
      : '<div class="card"><p class="muted">Отправленных анкет пока нет.</p></div>') +
    '</section>' +

    '<section id="ttab-chat" class="tabpanel" hidden>' +
    '<div class="card chat-card"><h3>Чаты с клиентами</h3>' +
    (clients.length
      ? '<div class="chat-tabs">' + clients.map(c => {
        const n = chatUnread(db, c.id, 'client');
        return '<button class="tab' + (c.id === current ? ' active' : '') + '" onclick="openChat(' + c.id + ')">' +
          esc(c.name.split(' ')[0]) + (n ? ' (' + n + ')' : '') + '</button>';
      }).join('') + '</div>'
      : '<p class="muted">Клиентов пока нет.</p>') +
    (current
      ? '<div class="chat-window" id="chatBox">' + chatHTML(db, current, true) + '</div>' +
      '<form onsubmit="trainerSend(' + current + ', event)"><div class="chat-input">' +
      '<input id="msgText" placeholder="Ответить клиенту..." required>' +
      '<button class="btn-mini" type="submit">Отправить</button></div></form>'
      : '') +
    '</div></section>';

  trainerTab(tab);
}

/* ===== АДМИН ===== */
function tierOptions(cur) {
  return Object.keys(TIERS).map(k => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + TIERS[k].name + '</option>').join('');
}

function renderAdmin(db) {
  const clients = db.users.filter(x => x.role === 'client');
  const active = db.slots.filter(s => s.takenBy);
  const revenue = db.payments.filter(p => p.amount > 0).reduce((a, p) => a + p.amount, 0);
  const totalBalance = clients.reduce((a, c) => a + c.balance, 0);

  document.getElementById('app').innerHTML =
    '<div class="page-head"><h1>Панель администратора</h1><p class="muted">Пользователи, записи и деньги — общий контроль.</p></div>' +

    '<div class="stat-row">' +
    statCard('клиентов', clients.length) +
    statCard('активных записей', active.length) +
    statCard('пополнений всего', revenue + ' ₽') +
    statCard('баланс клиентов', totalBalance + ' ₽') +
    '</div>' +

    '<div class="card"><h3>Пользователи</h3>' +
    '<table class="table"><thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Тариф</th><th>Баланс</th><th></th></tr></thead><tbody>' +
    db.users.map(u =>
      '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + ROLE_LABEL[u.role] + '</td>' +
      (u.role === 'client'
        ? '<td><select class="tier-select" onchange="setTier(' + u.id + ', this.value)">' + tierOptions(u.tier) + '</select></td>' +
        '<td>' + u.balance + ' ₽</td>' +
        '<td><button class="btn-mini ghost" onclick="adminDelUser(' + u.id + ')">удалить</button></td>'
        : '<td>—</td><td>—</td><td></td>') +
      '</tr>').join('') +
    '</tbody></table></div>' +

    '<div class="card"><h3>Все записи</h3>' +
    (active.length
      ? '<table class="table"><thead><tr><th>Дата</th><th>Время</th><th>Клиент</th><th>Статус</th><th>Списано</th></tr></thead><tbody>' +
      active.slice().sort(byDate).map(s => {
        const c = db.users.find(x => x.id === s.takenBy);
        return '<tr><td>' + fmtDate(s.date) + '</td><td>' + s.time + '</td><td>' + esc(c ? c.name : '—') + '</td>' +
          '<td>' + (s.status === 'ok' ? 'подтверждено' : 'ожидает') + '</td><td>' + (s.paid || 0) + ' ₽</td></tr>';
      }).join('') + '</tbody></table>'
      : '<p class="muted">Записей пока нет.</p>') +
    '</div>' +

    '<div class="card"><h3>Финансы</h3>' +
    (db.payments.length
      ? '<table class="table"><thead><tr><th>Дата</th><th>Клиент</th><th>Операция</th><th>Сумма</th></tr></thead><tbody>' +
      db.payments.slice().reverse().map(p => {
        const c = db.users.find(x => x.id === p.clientId);
        return '<tr><td>' + p.date + '</td><td>' + esc(c ? c.name : '—') + '</td><td>' + esc(p.note) + '</td>' +
          '<td class="' + (p.amount > 0 ? 'pay-pos' : 'pay-neg') + '">' + (p.amount > 0 ? '+' : '') + p.amount + ' ₽</td></tr>';
      }).join('') + '</tbody></table>'
      : '<p class="muted">Операций пока нет.</p>') +
    '</div>';
}

/* ===== Действия клиента ===== */
function bookSlot(id) {
  const db = load(); const u = me(db);
  if (!u || u.role !== 'client') return;
  const s = db.slots.find(x => x.id === id);
  if (!s || s.takenBy) return;
  const t = TIERS[u.tier] || TIERS.starter;
  if (weeklyCount(db, u.id) >= t.max) {
    alert('Лимит тарифа «' + t.name + '»: ' + t.note + '. Перейдите на тариф выше в разделе «Профиль».');
    return;
  }
  if (activeSlots(db, u.id).filter(x => x.date === s.date).length >= t.perDay) {
    alert('На тарифе «' + t.name + '» можно не больше ' + t.perDay + ' зан. в день.');
    return;
  }
  if (u.balance < t.price) {
    alert('Недостаточно средств: занятие стоит ' + t.price + ' ₽, на балансе ' + u.balance + ' ₽. Пополните вкладку «Баланс».');
    return;
  }
  u.balance -= t.price;
  s.takenBy = u.id; s.status = 'new'; s.paid = t.price;
  db.payments.push({ id: nextPayId(db), clientId: u.id, amount: -t.price, date: todayISO(), note: 'Оплата занятия ' + s.date + ' ' + s.time });
  save(db); initPage('client'); clientTab('my');
}

function cancelBooking(id) {
  const db = load(); const u = me(db); if (!u) return;
  const s = db.slots.find(x => x.id === id);
  if (!s || s.takenBy !== u.id) return;
  if (!confirm('Отменить запись ' + fmtDate(s.date) + ' ' + s.time + '? Средства вернутся на баланс.')) return;
  if (s.paid) {
    u.balance += s.paid;
    db.payments.push({ id: nextPayId(db), clientId: u.id, amount: s.paid, date: todayISO(), note: 'Возврат за отмену ' + s.date + ' ' + s.time });
  }
  s.takenBy = null; s.status = null; s.paid = null;
  save(db); initPage('client'); clientTab('my');
}

function topUp(amount) {
  const db = load(); const u = me(db); if (!u) return;
  amount = parseInt(amount, 10);
  if (!amount || amount < 100) { alert('Минимальная сумма пополнения — 100 ₽'); return; }
  u.balance += amount;
  db.payments.push({ id: nextPayId(db), clientId: u.id, amount, date: todayISO(), note: 'Пополнение баланса' });
  save(db); initPage('client'); clientTab('pay');
}
function topUpCustom(e) { e.preventDefault(); topUp(val('topAmount')); }

function changeTier(t) {
  const db = load(); const u = me(db);
  if (!u || u.role !== 'client' || !TIERS[t]) return;
  if (!confirm('Перейти на тариф «' + TIERS[t].name + '»? В демо-режиме — бесплатно.')) return;
  u.tier = t; save(db); initPage('client'); clientTab('prof');
}

function saveQuestionnaire(e) {
  e.preventDefault();
  const db = load(); const u = me(db); if (!u) return;
  u.questionnaire = {
    weight: val('qWeight'), height: val('qHeight'), age: val('qAge'),
    exp: val('qExp'), goal: val('qGoal'), health: val('qHealth'), comment: val('qComment'),
    ts: Date.now(), sent: true, reviewed: false
  };
  save(db); initPage('client'); clientTab('quest');
}

function sendMsgClient(e) {
  e.preventDefault();
  const db = load(); const u = me(db);
  const text = val('msgText').trim(); if (!text) return;
  if (!db.chat[u.id]) db.chat[u.id] = [];
  db.chat[u.id].push({ from: 'client', text, ts: Date.now(), read: false });
  save(db); initPage('client'); clientTab('chat');
}

/* ===== Действия тренера ===== */
function confirmSlot(id) {
  const db = load(); const s = db.slots.find(x => x.id === id);
  if (s && s.takenBy) { s.status = 'ok'; save(db); initPage('trainer'); }
}
function trainerCancel(id) {
  const db = load(); const s = db.slots.find(x => x.id === id);
  if (!s || !s.takenBy) return;
  const c = db.users.find(x => x.id === s.takenBy);
  if (s.paid && c) {
    c.balance += s.paid;
    db.payments.push({ id: nextPayId(db), clientId: c.id, amount: s.paid, date: todayISO(), note: 'Возврат (отмена тренером) ' + s.date + ' ' + s.time });
  }
  s.takenBy = null; s.status = null; s.paid = null;
  save(db); initPage('trainer');
}
function delSlot(id) {
  const db = load(); const s = db.slots.find(x => x.id === id);
  if (s && !s.takenBy) { db.slots = db.slots.filter(x => x.id !== id); save(db); initPage('trainer'); }
}
function addSlot(e) {
  e.preventDefault();
  const db = load();
  const date = val('slDate'), time = val('slTime');
  if (!date) return;
  if (db.slots.some(s => s.date === date && s.time === time)) { alert('Такой слот уже есть'); return; }
  db.slots.push({ id: Math.max(0, ...db.slots.map(s => s.id)) + 1, date, time, takenBy: null, status: null, paid: null });
  save(db); initPage('trainer');
}
function markReviewed(id) {
  const db = load(); const u = db.users.find(x => x.id === id);
  if (u && u.questionnaire) { u.questionnaire.reviewed = true; save(db); initPage('trainer'); }
}
function trainerSend(cid, e) {
  e.preventDefault();
  const db = load();
  const text = val('msgText').trim(); if (!text) return;
  if (!db.chat[cid]) db.chat[cid] = [];
  db.chat[cid].push({ from: 'trainer', text, ts: Date.now(), read: false });
  save(db); openChat(cid);
}

/* ===== Чат ===== */
function chatUnread(db, cid, fromRole) {
  return (db.chat[cid] || []).filter(m => m.from === fromRole && !m.read).length;
}
function chatHTML(db, cid, viewerTrainer) {
  if (!db.chat[cid]) db.chat[cid] = [];
  let changed = false;
  db.chat[cid].forEach(m => {
    const fromOther = viewerTrainer ? m.from === 'client' : m.from === 'trainer';
    if (fromOther && !m.read) { m.read = true; changed = true; }
  });
  if (changed) save(db);
  if (!db.chat[cid].length) return '<p class="muted">Сообщений пока нет — напишите первым!</p>';
  return db.chat[cid].map(m => {
    const mine = viewerTrainer ? m.from === 'trainer' : m.from === 'client';
    return '<div class="msg ' + (mine ? 'msg-mine' : 'msg-other') + '"><span>' + esc(m.text) + '</span><time>' + fmtTime(m.ts) + '</time></div>';
  }).join('');
}

/* ===== Действия админа ===== */
function setTier(id, t) {
  const db = load(); const u = db.users.find(x => x.id === id);
  if (u && TIERS[t]) { u.tier = t; save(db); initPage('admin'); }
}
function adminDelUser(id) {
  const db = load(); const u = db.users.find(x => x.id === id);
  if (!u || u.role !== 'client') return;
  if (!confirm('Удалить клиента «' + u.name + '»? Его записи будут освобождены, чат удалён.')) return;
  db.slots.forEach(s => { if (s.takenBy === id) { s.takenBy = null; s.status = null; s.paid = null; } });
  delete db.chat[id];
  db.users = db.users.filter(x => x.id !== id);
  save(db); initPage('admin');
}
