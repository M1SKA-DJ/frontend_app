// ===== КОНФИГ =====
const API_BASE = "worker-production-c7c1.up.railway.app"; // ЗАМЕНИТЕ НА ВАШУ ССЫЛКУ

// ===== TELEGRAM INIT =====
const tg = window.Telegram.WebApp;
tg.expand();

let currentGroupId = null;
let currentWeek = 0;
let currentDay = 0;
let currentDate = null;
let allGroups = [];
let allTeachers = [];

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async () => {
    if (tg.colorScheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    document.getElementById('datePicker').value = dateStr;
    currentDate = dateStr;
    await loadGroups();
    await loadTeachers();
    await loadUserSettings();
});

// ===== ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ =====
function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[onclick*="${page}"]`).classList.add('active');
    const titles = { schedule: '📚 Расписание', teachers: '👨‍🏫 Преподаватели', settings: '⚙️ Настройки' };
    document.getElementById('pageTitle').textContent = titles[page] || 'Расписание';
    if (page === 'settings') updateSettingsInfo();
}

// ===== ГРУППЫ =====
async function loadGroups() {
    try {
        const res = await fetch(`${API_BASE}/api/groups`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allGroups = data;
        renderGroups(data);
    } catch (e) {
        console.error('Error loading groups:', e);
        document.getElementById('groupsList').innerHTML = `<div class="empty-state"><span class="emoji">❌</span>Ошибка загрузки групп<br><small>${e.message}</small></div>`;
    }
}

function renderGroups(groups) {
    const container = document.getElementById('groupsList');
    if (!groups || groups.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="emoji">📭</span>Нет групп</div>';
        return;
    }
    container.innerHTML = groups.map(g => `
        <div class="group-card" onclick="selectGroup(${g.id})">
            <div><div class="name">${g.name}</div><div class="sub">${g.faculty || 'Основной'}</div></div>
            <span class="arrow">→</span>
        </div>
    `).join('');
}

function searchGroups(query) {
    if (!query.trim()) { renderGroups(allGroups); return; }
    renderGroups(allGroups.filter(g => g.name.toLowerCase().includes(query.toLowerCase())));
}

// ===== ВЫБОР ГРУППЫ =====
async function selectGroup(id) {
    currentGroupId = id;
    document.getElementById('groupsList').style.display = 'none';
    document.getElementById('scheduleView').style.display = 'block';
    const userId = tg.initDataUnsafe?.user?.id || 1;
    try {
        await fetch(`${API_BASE}/api/user-settings/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selected_group_id: id })
        });
    } catch(e) {}
    loadSchedule(id, currentWeek);
}

function backToGroups() {
    document.getElementById('scheduleView').style.display = 'none';
    document.getElementById('groupsList').style.display = 'grid';
    renderGroups(allGroups);
}

// ===== РАСПИСАНИЕ =====
function loadSchedule(groupId, weekType) {
    currentWeek = weekType;
    document.querySelectorAll('.week-tab').forEach((btn, i) => btn.classList.toggle('active', i === weekType));
    const dateObj = new Date(currentDate);
    const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
    currentDay = dayIndex;
    document.querySelectorAll('.day-btn').forEach((btn, i) => btn.classList.toggle('active', i === dayIndex));
    loadDay(currentDay);
}

async function loadDay(dayIndex) {
    currentDay = dayIndex;
    document.querySelectorAll('.day-btn').forEach((btn, i) => btn.classList.toggle('active', i === dayIndex));
    if (!currentGroupId) return;
    try {
        let url = `${API_BASE}/api/schedule?group_id=${currentGroupId}&week_type=${currentWeek}&day_of_week=${dayIndex}`;
        if (currentDate) url += `&specific_date=${currentDate}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const lessons = await res.json();
        renderSchedule(lessons);
    } catch(e) {
        console.error('Error loading schedule:', e);
        document.getElementById('scheduleList').innerHTML = `<div class="empty-state"><span class="emoji">❌</span>Ошибка загрузки</div>`;
    }
}

function renderSchedule(lessons) {
    const container = document.getElementById('scheduleList');
    if (!lessons || lessons.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">🎉</span><span>В этот день пар нет</span></div>`;
        return;
    }
    container.innerHTML = lessons.map(l => {
        let badges = '';
        if (l.is_cancelled) badges += `<span class="cancelled-badge">❌ Отменена</span>`;
        else if (l.has_replacement) badges += `<span class="replacement-badge">🔄 Замена</span>`;
        return `
            <div class="schedule-item${l.is_cancelled ? ' cancelled' : ''}">
                <div class="top">
                    <span class="time">${l.start_time} - ${l.end_time}</span>
                    <span class="subject">${l.subject}</span>
                    <span class="type">${l.lesson_type || 'Лекция'}</span>
                </div>
                <div class="bottom">
                    <span>👨‍🏫 ${l.teacher}</span>
                    <span>🏫 ${l.classroom}</span>
                    ${l.is_online ? '<span class="online">🖥 Онлайн</span>' : ''}
                    ${badges}
                </div>
                ${l.note ? `<div class="note">📌 ${l.note}</div>` : ''}
            </div>
        `;
    }).join('');
}

function selectWeek(weekType) { if (currentGroupId) loadSchedule(currentGroupId, weekType); }
function onDateChange(dateStr) { currentDate = dateStr; if (currentGroupId) loadSchedule(currentGroupId, currentWeek); }
function resetToToday() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    document.getElementById('datePicker').value = dateStr;
    currentDate = dateStr;
    if (currentGroupId) loadSchedule(currentGroupId, currentWeek);
}

// ===== ПРЕПОДАВАТЕЛИ =====
async function loadTeachers() {
    try {
        const res = await fetch(`${API_BASE}/api/teachers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allTeachers = await res.json();
        renderTeachers(allTeachers);
    } catch(e) {
        console.error('Error loading teachers:', e);
    }
}

function renderTeachers(teachers) {
    const container = document.getElementById('teachersList');
    if (!teachers || teachers.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="emoji">👨‍🏫</span>Нет преподавателей</div>';
        return;
    }
    container.innerHTML = teachers.map(t => `
        <div class="teacher-card" onclick="showTeacherSchedule(${t.id}, '${t.name}')">
            <div><div class="name">${t.name}</div><div class="sub">${t.department || 'Кафедра'}</div></div>
            <span class="arrow">→</span>
        </div>
    `).join('');
}

function searchTeachers(query) {
    if (!query.trim()) { renderTeachers(allTeachers); return; }
    renderTeachers(allTeachers.filter(t => t.name.toLowerCase().includes(query.toLowerCase())));
}

async function showTeacherSchedule(id, name) {
    document.getElementById('teachersList').style.display = 'none';
    document.getElementById('teacherScheduleView').style.display = 'block';
    try {
        let url = `${API_BASE}/api/teacher-schedule?teacher_id=${id}`;
        if (currentDate) url += `&specific_date=${currentDate}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const schedule = await res.json();
        const container = document.getElementById('teacherScheduleContent');
        if (!schedule || schedule.length === 0) {
            container.innerHTML = `<div class="empty-state"><span class="emoji">📭</span><span>У ${name} нет пар</span></div>`;
            return;
        }
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        const grouped = {};
        schedule.forEach(l => {
            const key = `${l.week_type === 0 ? 'Четная' : 'Нечетная'} ${days[l.day_of_week]}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(l);
        });
        container.innerHTML = Object.entries(grouped).map(([day, lessons]) => `
            <div style="margin-bottom:12px;">
                <div style="font-weight:700;color:var(--primary);">📅 ${day}</div>
                ${lessons.map(l => `
                    <div class="teacher-schedule-item">
                        <div class="info"><span><strong>${l.start_time}</strong> ${l.subject}</span><span>${l.group}</span></div>
                        <div class="group">🏫 ${l.classroom} ${l.is_cancelled ? ' ❌ Отменена' : ''}</div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch(e) {
        console.error('Error loading teacher schedule:', e);
    }
}

function backToTeachers() {
    document.getElementById('teacherScheduleView').style.display = 'none';
    document.getElementById('teachersList').style.display = 'grid';
}

// ===== НАСТРОЙКИ =====
async function loadUserSettings() {
    try {
        const userId = tg.initDataUnsafe?.user?.id || 1;
        const res = await fetch(`${API_BASE}/api/user-settings/${userId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const settings = await res.json();
        if (settings.theme === 'dark') document.body.setAttribute('data-theme', 'dark');
        if (settings.font_size === 'small') document.body.style.fontSize = '14px';
        else if (settings.font_size === 'large') document.body.style.fontSize = '18px';
        if (settings.selected_group_id) {
            currentGroupId = settings.selected_group_id;
            document.getElementById('groupsList').style.display = 'none';
            document.getElementById('scheduleView').style.display = 'block';
            loadSchedule(currentGroupId, currentWeek);
        }
    } catch(e) {
        console.log('Settings not loaded, using defaults');
    }
}

function updateSettingsInfo() {
    const display = document.getElementById('selectedGroupDisplay');
    if (currentGroupId) {
        const group = allGroups.find(g => g.id === currentGroupId);
        display.textContent = group ? group.name : 'Не выбрана';
    } else {
        display.textContent = 'Не выбрана';
    }
}

function setTheme(theme) {
    if (theme === 'dark') document.body.setAttribute('data-theme', 'dark');
    else document.body.removeAttribute('data-theme');
    document.querySelectorAll('.option-btn[data-setting="theme"]').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    const userId = tg.initDataUnsafe?.user?.id || 1;
    fetch(`${API_BASE}/api/user-settings/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
    });
}

function setFont(size) {
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.body.style.fontSize = sizes[size] || '16px';
    document.querySelectorAll('.option-btn[data-setting="font"]').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    const userId = tg.initDataUnsafe?.user?.id || 1;
    fetch(`${API_BASE}/api/user-settings/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ font_size: size })
    });
}

// ===== АДМИН-ПРОВЕРКА =====
async function checkAdmin() {
    try {
        const userId = tg.initDataUnsafe?.user?.id || 1;
        const res = await fetch(`${API_BASE}/api/admin-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await res.json();
        if (data.is_admin) {
            document.getElementById('adminBtn').style.display = 'flex';
        }
    } catch(e) {}
}
