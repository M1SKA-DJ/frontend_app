const tg = window.Telegram.WebApp;
tg.expand();

// Проверка админа (должен совпадать с ADMIN_IDS в config.py)
const USER_ID = tg.initDataUnsafe?.user?.id || 123456789;

// Если не админ - редирект
if (USER_ID !== 123456789) { // Замени на свой ID
    document.body.innerHTML = '<div style="padding:40px;text-align:center;"><h2>⛔ Доступ запрещен</h2><p>Только для администраторов</p></div>';
    throw new Error('Access denied');
}

// Загрузка данных
async function loadAdminData() {
    await loadGroups();
    await loadTeachers();
    await loadClassrooms();
    await loadLessons();
}

// ГРУППЫ
async function loadGroups() {
    const res = await fetch('/api/groups');
    const groups = await res.json();
    const list = document.getElementById('groupsList');
    list.innerHTML = groups.map(g => `
        <div class="admin-list-item">
            <span>${g.name}</span>
            <button class="delete-btn" onclick="deleteGroup(${g.id})">🗑</button>
        </div>
    `).join('');
    
    // Обновляем селекты для пар
    const select = document.getElementById('lessonGroup');
    select.innerHTML = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

async function addGroup() {
    const name = document.getElementById('groupName').value;
    if (!name) return;
    await fetch('/admin/api/groups', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name})
    });
    document.getElementById('groupName').value = '';
    loadGroups();
}

async function deleteGroup(id) {
    if (!confirm('Удалить группу?')) return;
    await fetch(`/admin/api/groups/${id}`, {method: 'DELETE'});
    loadGroups();
}

// ПРЕПОДАВАТЕЛИ
async function loadTeachers() {
    const res = await fetch('/api/teachers');
    const teachers = await res.json();
    const list = document.getElementById('teachersList');
    list.innerHTML = teachers.map(t => `
        <div class="admin-list-item">
            <span>${t.name}</span>
            <button class="delete-btn" onclick="deleteTeacher(${t.id})">🗑</button>
        </div>
    `).join('');
    
    const select = document.getElementById('lessonTeacher');
    select.innerHTML = teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

async function addTeacher() {
    const name = document.getElementById('teacherName').value;
    if (!name) return;
    await fetch('/admin/api/teachers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name})
    });
    document.getElementById('teacherName').value = '';
    loadTeachers();
}

async function deleteTeacher(id) {
    if (!confirm('Удалить преподавателя?')) return;
    await fetch(`/admin/api/teachers/${id}`, {method: 'DELETE'});
    loadTeachers();
}

// АУДИТОРИИ
async function loadClassrooms() {
    // Тут нужен эндпоинт для получения аудиторий, добавим в main.py
    // Пока заглушка
}

async function addClassroom() {
    const number = document.getElementById('classroomNumber').value;
    if (!number) return;
    await fetch('/admin/api/classrooms', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({number})
    });
    document.getElementById('classroomNumber').value = '';
    loadClassrooms();
}

// ПАРЫ
async function loadLessons() {
    // Загружаем пары для отображения
    const groupId = document.getElementById('lessonGroup')?.value;
    if (!groupId) return;
    const res = await fetch(`/api/schedule?group_id=${groupId}`);
    const lessons = await res.json();
    const list = document.getElementById('lessonsList');
    list.innerHTML = lessons.map(l => `
        <div class="admin-list-item">
            <span>${l.start_time} ${l.subject} (${l.teacher})</span>
            <button class="delete-btn" onclick="deleteLesson(${l.id})">🗑</button>
        </div>
    `).join('');
}

async function addLesson() {
    const data = {
        group_id: parseInt(document.getElementById('lessonGroup').value),
        teacher_id: parseInt(document.getElementById('lessonTeacher').value),
        classroom_id: 1, // TODO: добавить выбор аудитории
        subject: document.getElementById('lessonSubject').value,
        lesson_type: document.getElementById('lessonType').value,
        start_time: document.getElementById('lessonStart').value,
        end_time: document.getElementById('lessonEnd').value,
        day_of_week: parseInt(document.getElementById('lessonDay').value),
        week_type: parseInt(document.getElementById('lessonWeek').value),
        is_online: false
    };
    
    if (!data.subject || !data.start_time) return;
    
    await fetch('/admin/api/lessons', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    document.getElementById('lessonSubject').value = '';
    loadLessons();
}

async function deleteLesson(id) {
    if (!confirm('Удалить пару?')) return;
    await fetch(`/admin/api/lessons/${id}`, {method: 'DELETE'});
    loadLessons();
}

// Переключение табов
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
    
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).style.display = 'block';
    
    if (tab === 'lessons') loadLessons();
}

// Инициализация
loadAdminData();