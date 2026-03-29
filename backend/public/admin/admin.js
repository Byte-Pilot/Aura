// frontend/admin/admin.js

const API_BASE = '/api';

// --- API Client ---
// Helper to perform fetch requests with auto-refresh logic
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    // Ensure credentials are sent (cookies)
    options.credentials = 'include';

    // Default headers for JSON
    if (!options.headers) {
        options.headers = {};
    }
    if (!(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, options);

    // Auto-refresh logic (interceptor)
    if (response.status === 401 && endpoint !== '/admin/login' && endpoint !== '/admin/refresh' && endpoint !== '/admin/logout') {
        const refreshSuccess = await refreshTokens();
        if (refreshSuccess) {
            // Retry original request
            response = await fetch(url, options);
        } else {
            // Refresh failed, logout
            handleLogoutAction();
            throw new Error('Session expired');
        }
    }

    // Attempt to parse JSON response safely
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch (e) {
            console.error("Failed to parse JSON response:", e);
        }
    }

    if (!response.ok) {
        const message = (data && data.error) ? data.error : `HTTP error! status: ${response.status}`;
        throw new Error(message);
    }

    return data;
}

// --- Auth Actions ---
async function refreshTokens() {
    try {
        const response = await fetch(`${API_BASE}/admin/refresh`, {
            method: 'POST',
            credentials: 'include'
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function loginUser(username, password) {
    return await apiFetch('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
}

async function logoutUser() {
    return await apiFetch('/admin/logout', {
        method: 'POST'
    });
}

function handleLogoutAction() {
    logoutUser().catch(console.error).finally(() => {
        showLogin();
    });
}

// --- Data Fetching Actions ---
async function getBookings() {
    return await apiFetch('/admin/bookings');
}

async function getCalendar(apartment_number) {
    return await apiFetch(`/calendar?apartment_number=${apartment_number}`);
}

async function updateBookingStatus(id, status) {
    return await apiFetch(`/admin/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
}

async function blockDates(apartment_number, check_in, check_out) {
    return await apiFetch('/admin/block', {
        method: 'POST',
        body: JSON.stringify({
            apartment_number: parseInt(apartment_number),
            check_in,
            check_out
        })
    });
}

async function unblockDates(apartment_number, check_in, check_out) {
    return await apiFetch('/admin/blocked-dates', {
        method: 'PATCH',
        body: JSON.stringify({
            apartment_number: parseInt(apartment_number),
            check_in,
            check_out
        })
    });
}

// --- UI Logic ---

// Elements
const loginOverlay = document.getElementById('login-overlay');
const adminContainer = document.getElementById('admin-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

const bookingsTableBody = document.getElementById('bookings-table-body');
const refreshBookingsBtn = document.getElementById('refresh-bookings-btn');

// Search
const bookingSearchContainer = document.getElementById('booking-search-container');
const bookingSearchBtn = document.getElementById('booking-search-btn');
const bookingSearchInput = document.getElementById('booking-search-input');

// Filters
const toggleFilterBtn = document.getElementById('toggle-filter-btn');
const filterDropdownMenu = document.getElementById('filter-dropdown-menu');
const filterAptCheckboxes = document.querySelectorAll('#filter-dropdown-menu .filter-apts input[type="checkbox"]');
const filterDateFrom = document.getElementById('filter-date-from');
const filterDateTo = document.getElementById('filter-date-to');
const filterStatus = document.getElementById('filter-status');
let allBookingsCache = [];

const blockDatesForm = document.getElementById('block-dates-form');
const blockMessage = document.getElementById('block-message');
const unblockDatesForm = document.getElementById('unblock-dates-form');
const unblockMessage = document.getElementById('unblock-message');

// View Switching
function showLogin() {
    loginOverlay.classList.remove('hidden');
    adminContainer.classList.add('hidden');
}

function hideLogin() {
    loginOverlay.classList.add('hidden');
    adminContainer.classList.remove('hidden');
}

function switchView(targetId) {
    // Update nav active state
    navItems.forEach(item => {
        if (item.getAttribute('data-target') === targetId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update section active state
    viewSections.forEach(section => {
        if (section.id === targetId) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });

    // Trigger data load if needed
    if (targetId === 'bookings-view') {
        loadBookings();
    } else if (targetId === 'calendar-view') {
        loadAdminCalendar();
    }
}

// Initial session check
async function checkInitialSession() {
    // Attempt to load bookings. If it fails with 401, the interceptor will try to refresh.
    // If refresh fails, it will logout and show login screen.
    try {
        await loadBookings();
        hideLogin(); // If successful, hide login
    } catch (e) {
        // Interceptor handles the ui shift
        if (e.message !== 'Session expired') {
            console.error(e);
        }
    }
}

// --- Event Listeners ---

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('data-target');
        switchView(targetId);
    });
});

// Login Form
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.textContent = 'Вход...';
    loginError.classList.add('hidden');

    try {
        await loginUser(username, password);
        hideLogin();
        loadBookings(); // load data upon successful login
    } catch (error) {
        loginError.textContent = error.message || 'Ошибка авторизации';
        loginError.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Войти';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    handleLogoutAction();
});

// Refresh Bookings
refreshBookingsBtn.addEventListener('click', () => {
    loadBookings();
});

// Search Toggle
if (bookingSearchBtn && bookingSearchContainer && bookingSearchInput) {
    bookingSearchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = bookingSearchContainer.classList.toggle('active');
        if (isActive) {
            bookingSearchInput.focus();
        } else {
            // If collapsing and there was a search, clear it
            if (bookingSearchInput.value) {
                bookingSearchInput.value = '';
                applyFilters();
            }
        }
    });

    bookingSearchInput.addEventListener('click', (e) => e.stopPropagation());
    
    bookingSearchInput.addEventListener('input', applyFilters);

    bookingSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            bookingSearchContainer.classList.remove('active');
            if (bookingSearchInput.value) {
                bookingSearchInput.value = '';
                applyFilters();
            }
        }
    });
}

// Filter Dropdown Toggle
if (toggleFilterBtn && filterDropdownMenu) {
    toggleFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!filterDropdownMenu.classList.contains('hidden') && 
            !filterDropdownMenu.contains(e.target) &&
            e.target !== toggleFilterBtn) {
            filterDropdownMenu.classList.add('hidden');
        }
    });
}

// Reset Bookings Filter
const resetBookingsFilterBtn = document.getElementById('reset-bookings-filter-btn');
if (resetBookingsFilterBtn) {
    resetBookingsFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterAptCheckboxes.forEach(cb => cb.checked = false);
        filterDateFrom.value = '';
        filterDateTo.value = '';
        filterStatus.value = '';
        if (bookingSearchInput) bookingSearchInput.value = '';
        applyFilters();
    });
}

// Filters Auto-apply
filterAptCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
filterDateFrom.addEventListener('change', applyFilters);
filterDateTo.addEventListener('change', applyFilters);
filterStatus.addEventListener('change', applyFilters);

function applyFilters() {
    if (!allBookingsCache) return;
    
    // Get selected apartments
    const selectedApts = Array.from(filterAptCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
        
    const fromDate = filterDateFrom.value ? new Date(filterDateFrom.value) : null;
    if (fromDate) fromDate.setHours(0,0,0,0);
    
    const toDate = filterDateTo.value ? new Date(filterDateTo.value) : null;
    if (toDate) toDate.setHours(23,59,59,999);
    
    const status = filterStatus.value;
    const searchTerm = bookingSearchInput ? bookingSearchInput.value.toLowerCase().trim() : '';
    
    const filtered = allBookingsCache.filter(b => {
        // Search filter
        if (searchTerm) {
            const nameMatch = (b.name || '').toLowerCase().includes(searchTerm);
            const phoneMatch = (b.phone || '').toLowerCase().includes(searchTerm);
            const emailMatch = (b.email || '').toLowerCase().includes(searchTerm);
            const telegramMatch = (b.telegram || '').toLowerCase().includes(searchTerm);
            
            if (!nameMatch && !phoneMatch && !emailMatch && !telegramMatch) {
                return false;
            }
        }

        // Apt filter
        if (selectedApts.length > 0 && !selectedApts.includes(String(b.apartment_number))) {
            return false;
        }
        
        // Status filter
        if (status && b.status !== status) {
            return false;
        }
        
        // Date filter
        if (fromDate || toDate) {
            const bCheckIn = new Date(b.check_in);
            const bCheckOut = new Date(b.check_out);
            
            if (fromDate && bCheckOut < fromDate) return false;
            if (toDate && bCheckIn > toDate) return false;
        }
        
        return true;
    });
    
    renderBookingsTable(filtered);
}

// Form Validation for active buttons
function resetBlockButtonState() {
    const btn = document.getElementById('btn-submit-block');
    btn.classList.remove('is-empty');
    btn.disabled = false;
}
document.getElementById('block-apt').addEventListener('change', resetBlockButtonState);
document.getElementById('block-from').addEventListener('input', resetBlockButtonState);
document.getElementById('block-to').addEventListener('input', resetBlockButtonState);

function resetUnblockButtonState() {
    const btn = document.getElementById('btn-submit-unblock');
    btn.classList.remove('is-empty');
    btn.disabled = false;
}
document.getElementById('unblock-apt').addEventListener('change', resetUnblockButtonState);
document.getElementById('unblock-from').addEventListener('input', resetUnblockButtonState);
document.getElementById('unblock-to').addEventListener('input', resetUnblockButtonState);

// Block Dates Form
blockDatesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apt = document.getElementById('block-apt').value;
    const from = document.getElementById('block-from').value;
    const to = document.getElementById('block-to').value;
    const btn = blockDatesForm.querySelector('button');

    btn.disabled = true;
    blockMessage.className = '';
    blockMessage.textContent = 'Отправка...';

    try {
        await blockDates(apt, from, to);
        blockMessage.className = 'success-message';
        blockMessage.textContent = 'Успешно заблокировано';
        
        // Оставляем введенные данные. Делаем кнопку серой и неактивной.
        btn.classList.add('is-empty');
        // Кнопка остается disabled (т.к. была заблокирована перед try)
        
        // pre-fetch bookings to reflect changes visually if they switch tabs
        loadBookings();
    } catch (error) {
        blockMessage.className = 'error-message';
        blockMessage.textContent = error.message || 'Ошибка создания блокировки';
        
        btn.disabled = false;
        btn.classList.remove('is-empty');
    } finally {
        setTimeout(() => blockMessage.classList.add('hidden'), 5000);
    }
});

// Unblock Dates Form
unblockDatesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apt = document.getElementById('unblock-apt').value;
    const from = document.getElementById('unblock-from').value;
    const to = document.getElementById('unblock-to').value;
    const btn = unblockDatesForm.querySelector('button');

    btn.disabled = true;
    unblockMessage.className = '';
    unblockMessage.textContent = 'Отправка...';

    try {
        await unblockDates(apt, from, to);
        unblockMessage.className = 'success-message';
        unblockMessage.textContent = 'Успешно разблокировано';
        
        // Оставляем введенные данные. Делаем кнопку серой и неактивной.
        btn.classList.add('is-empty');
        // Кнопка остается disabled
        
        loadBookings();
    } catch (error) {
        unblockMessage.className = 'error-message';
        unblockMessage.textContent = error.message || 'Ошибка при разблокировке';
        
        btn.disabled = false;
        btn.classList.remove('is-empty');
    } finally {
        setTimeout(() => unblockMessage.classList.add('hidden'), 5000);
    }
});


// --- Render Rendering logic ---

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
}

function truncate(str, max = 30) {
    if (!str) return '-';
    return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

function formatStatus(status) {
    const map = {
        'pending': 'Ожидает',
        'confirmed': 'Подтверждено',
        'cancelled': 'Отменено',
        'blocked': 'Заблокировано'
    };
    return map[status] || status;
}

// Global action handlers for table inline buttons
window.handleStatusChange = async function (id, newStatus) {
    if (!confirm(`Вы уверены, что хотите изменить статус брони #${id} на "${formatStatus(newStatus)}"?`)) return;
    try {
        await updateBookingStatus(id, newStatus);
        loadBookings(); // Refresh table
    } catch (error) {
        alert('Ошибка обновления: ' + error.message);
    }
}

window.handleUnblock = async function (id, apartmentNumber, checkIn, checkOut) {
    if (!confirm(`Разблокировать запись #${id}? Даты будут открыты для бронирования.`)) return;
    try {
        await unblockDates(apartmentNumber, checkIn, checkOut);
        loadBookings(); // Refresh table
    } catch (error) {
        alert('Ошибка разблокировки: ' + error.message);
    }
}

async function loadBookings() {
    bookingsTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Загрузка данных...</td></tr>';

    try {
        const bookings = await getBookings();
        allBookingsCache = bookings || [];
        applyFilters();
    } catch (error) {
        if (error.message !== 'Session expired') {
            bookingsTableBody.innerHTML = `<tr><td colspan="7" class="error-message">Ошибка загрузки: ${error.message}</td></tr>`;
        }
    }
}

function renderBookingsTable(bookings) {
    if (!bookings || bookings.length === 0) {
        bookingsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">Нет данных</td></tr>';
        return;
    }

    bookingsTableBody.innerHTML = '';

    // Sort descending by id (newest first)
    bookings.sort((a, b) => b.id - a.id);

    bookings.forEach(b => {
        const tr = document.createElement('tr');

        let actionsHtml = '';
        if (b.status === 'pending') {
            actionsHtml = `
                <div class="action-btns">
                    <button class="btn-small btn-confirm" onclick="handleStatusChange(${b.id}, 'confirmed')">Подтвердить</button>
                    <button class="btn-small btn-cancel" onclick="handleStatusChange(${b.id}, 'cancelled')">Отменить</button>
                </div>
            `;
        } else if (b.status === 'confirmed') {
            actionsHtml = `
                <div class="action-btns">
                    <button class="btn-small btn-cancel" onclick="handleStatusChange(${b.id}, 'cancelled')">Отменить</button>
                </div>
            `;
        } else if (b.status === 'blocked') {
            actionsHtml = `
                <div class="action-btns">
                    <button class="btn-small btn-cancel" onclick="handleUnblock(${b.id}, ${b.apartment_number}, '${b.check_in}', '${b.check_out}')">Разблокировать</button>
                </div>
            `;
        } else if (b.status === 'cancelled') {
            actionsHtml = `
                <div class="action-btns">
                    <button class="btn-small btn-confirm" onclick="handleStatusChange(${b.id}, 'confirmed')">Восстановить</button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td>${b.id}</td>
            <td>${b.apartment_number}</td>
            <td title="${b.name || ''}">${truncate(b.name)}</td>
            <td>
                <div title="${b.phone || ''}">tel: ${truncate(b.phone, 20)}</div>
                <div style="color:var(--color-text-secondary);font-size:0.8em" title="${b.telegram || ''}">tg: ${truncate(b.telegram, 20)}</div>
                <div style="color:var(--color-text-secondary);font-size:0.8em" title="${b.email || ''}">email: ${truncate(b.email, 20)}</div>
            </td>
            <td>${formatDate(b.check_in)} — ${formatDate(b.check_out)}</td>
            <td><span class="status-badge status-${b.status}">${formatStatus(b.status)}</span></td>
            <td>${actionsHtml}</td>
        `;
        bookingsTableBody.appendChild(tr);
    });
}

// --- Admin Calendar Renders ---
const adminApartments = [57, 58, 59, 163, 164];
let adminCalendarMonthOffsets = { 57: 0, 58: 0, 59: 0, 163: 0, 164: 0 };
let currentBlockedIntervalsByApt = {};

// Calendar Filter
const toggleCalFilterBtn = document.getElementById('toggle-cal-filter-btn');
const calFilterDropdownMenu = document.getElementById('cal-filter-dropdown-menu');
const calAptCheckboxes = document.querySelectorAll('#cal-filter-dropdown-menu .cal-apt-checkbox');

if (toggleCalFilterBtn && calFilterDropdownMenu) {
    toggleCalFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        calFilterDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!calFilterDropdownMenu.classList.contains('hidden') &&
            !calFilterDropdownMenu.contains(e.target) &&
            e.target !== toggleCalFilterBtn) {
            calFilterDropdownMenu.classList.add('hidden');
        }
    });
}

calAptCheckboxes.forEach(cb => cb.addEventListener('change', () => {
    renderAdminCalendars();
}));

// Reset Calendar Filter
const resetCalFilterBtn = document.getElementById('reset-cal-filter-btn');
if (resetCalFilterBtn) {
    resetCalFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        calAptCheckboxes.forEach(cb => cb.checked = true);
        renderAdminCalendars();
    });
}

function getSelectedCalApts() {
    const selected = Array.from(calAptCheckboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));
    return selected.length > 0 ? selected : adminApartments;
}

async function loadAdminCalendar() {
    const container = document.getElementById('calendars-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">Загрузка календарей...</div>';

    try {
        const responses = await Promise.all(adminApartments.map(apt => getCalendar(apt)));
        
        currentBlockedIntervalsByApt = {};
        for(let i=0; i<adminApartments.length; i++) {
            const apt = adminApartments[i];
            const data = responses[i];
            currentBlockedIntervalsByApt[apt] = data.map(item => ({
                checkIn: new Date(item.check_in + 'T00:00:00'),
                checkOut: new Date(item.check_out + 'T00:00:00'),
            }));
        }
        
        adminCalendarMonthOffsets = { 57: 0, 58: 0, 59: 0, 163: 0, 164: 0 };
        renderAdminCalendars();
    } catch (error) {
        if (error.message !== 'Session expired') {
            container.innerHTML = `<div style="color: red;">Ошибка загрузки календарей: ${error.message}</div>`;
        }
    }
}

function renderAdminCalendars() {
    const container = document.getElementById('calendars-container');
    if (!container) return;
    container.innerHTML = '';

    const visibleApts = getSelectedCalApts();

    visibleApts.forEach(apt => {
        // Создаем отдельный белый блок (виджет) для каждого апартамента
        const widget = document.createElement('div');
        widget.className = 'calendar-admin-container';

        // Шапка с заголовком и кнопками навигации
        const header = document.createElement('div');
        header.style.marginBottom = 'var(--space-4)';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';

        const title = document.createElement('h3');
        title.style.margin = '0';
        title.style.fontSize = 'var(--font-size-lg)';
        title.textContent = `Апартаменты №${apt}`;

        const controls = document.createElement('div');
        controls.className = 'calendar-nav-controls';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn-icon';
        prevBtn.title = 'На месяц назад';
        prevBtn.innerHTML = '&#10094;';

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-icon';
        nextBtn.title = 'На месяц вперед';
        nextBtn.innerHTML = '&#10095;';

        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);

        header.appendChild(title);
        header.appendChild(controls);
        widget.appendChild(header);

        // Контейнер самой сетки
        const grid = document.createElement('div');
        grid.className = 'calendar-grid-4';
        widget.appendChild(grid);

        // Привязываем события к кнопкам именно для этого апартамента
        prevBtn.addEventListener('click', () => {
            adminCalendarMonthOffsets[apt]--;
            renderGenericCalendarGrid(grid, apt);
        });
        nextBtn.addEventListener('click', () => {
            adminCalendarMonthOffsets[apt]++;
            renderGenericCalendarGrid(grid, apt);
        });

        // Первичный рендер сетки
        renderGenericCalendarGrid(grid, apt);

        container.appendChild(widget);
    });
}

function renderGenericCalendarGrid(gridElement, apt) {
    const blockedIntervals = currentBlockedIntervalsByApt[apt] || [];
    gridElement.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startYear = today.getFullYear();
    const startMonth = today.getMonth() + adminCalendarMonthOffsets[apt];

    const monthsRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const weekdaysRu = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    function isDateBlocked(cellDate) {
        const cellTime = cellDate.getTime();
        return blockedIntervals.some(interval => {
            return cellTime >= interval.checkIn.getTime() && cellTime < interval.checkOut.getTime();
        });
    }

    for (let offset = 0; offset < 4; offset++) {
        const displayDate = new Date(startYear, startMonth + offset, 1);
        const y = displayDate.getFullYear();
        const m = displayDate.getMonth();

        const daysInMonth = new Date(y, m + 1, 0).getDate();
        let startingDay = new Date(y, m, 1).getDay() - 1;
        if (startingDay === -1) startingDay = 6; 

        const monthWrapper = document.createElement('div');
        monthWrapper.className = 'admin-cal-month';

        const title = document.createElement('div');
        title.className = 'admin-cal-title';
        title.textContent = `${monthsRu[m]} ${y}`;
        monthWrapper.appendChild(title);

        const weekdaysGrid = document.createElement('div');
        weekdaysGrid.className = 'admin-cal-weekdays';
        weekdaysRu.forEach(dayName => {
            const w = document.createElement('div');
            w.textContent = dayName;
            weekdaysGrid.appendChild(w);
        });
        monthWrapper.appendChild(weekdaysGrid);

        const daysGrid = document.createElement('div');
        daysGrid.className = 'admin-cal-days';

        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'admin-cal-day empty';
            daysGrid.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            const cellDate = new Date(y, m, day);
            const isBlocked = isDateBlocked(cellDate);
            const isPast = cellDate.getTime() < today.getTime();

            dayCell.textContent = day;

            if (isPast) {
                if (isBlocked) {
                    dayCell.className = 'admin-cal-day past-booked';
                    dayCell.title = 'Прошедшая дата (было занято)';
                } else {
                    dayCell.className = 'admin-cal-day past-free';
                    dayCell.title = 'Прошедшая дата (было свободно)';
                }
            } else if (isBlocked) {
                dayCell.className = 'admin-cal-day booked';
                dayCell.title = 'Занято / Заблокировано';
            } else {
                dayCell.className = 'admin-cal-day free';
                dayCell.title = 'Свободно';
            }

            daysGrid.appendChild(dayCell);
        }

        monthWrapper.appendChild(daysGrid);
        gridElement.appendChild(monthWrapper);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkInitialSession();
});
