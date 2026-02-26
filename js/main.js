/* js/main.js */

document.addEventListener('DOMContentLoaded', () => {
  // === Active Nav Link on Scroll ===
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  // Build a map: sectionId -> navLink (preserving DOM order)
  const sectionMap = new Map();
  navLinks.forEach(link => {
    const id = link.getAttribute('href').slice(1);
    const section = document.getElementById(id);
    if (section) sectionMap.set(id, link);
  });

  const visibleSections = new Set();
  let isScrollingByClick = false; // freeze observer during click-triggered scroll
  let scrollEndTimer = null;

  function setActiveLink(link) {
    navLinks.forEach(l => l.classList.remove('active'));
    if (link) link.classList.add('active');
  }

  // When clicking a nav link — set active immediately and freeze observer
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('href').slice(1);
      if (document.getElementById(id)) {
        setActiveLink(link);
        isScrollingByClick = true;

        // Unfreeze when scroll comes to rest
        clearTimeout(scrollEndTimer);
        const onScroll = () => {
          clearTimeout(scrollEndTimer);
          scrollEndTimer = setTimeout(() => {
            isScrollingByClick = false;
            window.removeEventListener('scroll', onScroll);
          }, 150);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
      }
    });
  });

  const headerHeight = document.querySelector('.site-header')?.offsetHeight ?? 72;

  const observer = new IntersectionObserver((entries) => {
    if (isScrollingByClick) return; // frozen during click scroll

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        visibleSections.add(entry.target.id);
      } else {
        visibleSections.delete(entry.target.id);
      }
    });

    // Activate the topmost visible section (DOM order)
    let activeId = null;
    sectionMap.forEach((link, id) => {
      if (visibleSections.has(id) && activeId === null) activeId = id;
    });

    if (activeId) setActiveLink(sectionMap.get(activeId));
  }, {
    threshold: 0,
    rootMargin: `-${headerHeight}px 0px -50% 0px`
  });

  sectionMap.forEach((link, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });

  // === Apartment Filter Tabs ===
  const tabBtns = document.querySelectorAll('.tabs-nav .tab-btn');
  const apartmentCards = document.querySelectorAll('#apartment-list [data-category]');

  const categoryMap = {
    'Все': null,
    'Вид на море': 'sea',
    'Вид на горы': 'mountain',
  };

  function filterCards(category) {
    apartmentCards.forEach(card => {
      if (!category || card.dataset.category === category) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterCards(categoryMap[btn.textContent.trim()]);
    });
  });

  // === "Еще" Dropdown Toggle ===
  const dropdownTriggers = document.querySelectorAll('.nav-dropdown__trigger');

  dropdownTriggers.forEach(trigger => {
    const menu = trigger.nextElementSibling;
    if (!menu) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('is-open');

      // Close any other open dropdowns first
      document.querySelectorAll('.nav-dropdown__menu.is-open').forEach(m => {
        m.classList.remove('is-open');
        m.previousElementSibling?.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        menu.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-dropdown__menu.is-open').forEach(m => {
      m.classList.remove('is-open');
      m.previousElementSibling?.setAttribute('aria-expanded', 'false');
    });
  });

  // Close dropdown on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-dropdown__menu.is-open').forEach(m => {
        m.classList.remove('is-open');
        m.previousElementSibling?.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // === Lightbox Gallery ===
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const galleryItems = document.querySelectorAll('.lightbox-trigger');

  if (lightbox && galleryItems.length > 0) {
    let currentIndex = 0;
    const images = Array.from(galleryItems).map(item => item.querySelector('img').src);

    function openLightbox(index) {
      currentIndex = index;
      lightboxImg.src = images[currentIndex];
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }

    function showNext() {
      currentIndex = (currentIndex + 1) % images.length;
      lightboxImg.src = images[currentIndex];
    }

    function showPrev() {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      lightboxImg.src = images[currentIndex];
    }

    // Add click events to gallery items
    galleryItems.forEach((item, index) => {
      item.addEventListener('click', () => openLightbox(index));
    });

    // Controls
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
    lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });

    // Close when clicking outside image
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;

      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    });
  }

  // === Custom Calendar Widget ===
  const customDateTrigger = document.getElementById('custom-date-trigger');
  const customCalendarPopup = document.getElementById('custom-calendar-popup');
  const checkinDisplay = document.getElementById('checkin-display');
  const checkoutDisplay = document.getElementById('checkout-display');
  const checkinInput = document.getElementById('checkin');
  const checkoutInput = document.getElementById('checkout');
  const calendarDaysGrid = document.getElementById('calendar-days-grid');
  const calendarCurrentMonth = document.getElementById('calendar-current-month');
  const calendarSelectedRange = document.getElementById('calendar-selected-range');
  const btnPrevMonth = document.getElementById('cal-prev-month');
  const btnNextMonth = document.getElementById('cal-next-month');
  const btnContinue = document.getElementById('calendar-continue-btn');

  if (customDateTrigger && customCalendarPopup) {
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    let selectionStart = null;
    let selectionEnd = null;

    const monthsRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const monthsRuDeclined = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    // Example unavailable dates in March 2026 (12-18, 22-24)
    const blockedDates = [
      new Date(2026, 2, 12).getTime(),
      new Date(2026, 2, 13).getTime(),
      new Date(2026, 2, 14).getTime(),
      new Date(2026, 2, 15).getTime(),
      new Date(2026, 2, 16).getTime(),
      new Date(2026, 2, 17).getTime(),
      new Date(2026, 2, 18).getTime(),

      new Date(2026, 2, 22).getTime(),
      new Date(2026, 2, 23).getTime(),
      new Date(2026, 2, 24).getTime(),
    ];

    function isDateBlocked(time) {
      return blockedDates.includes(time);
    }

    function hasBlockedDatesInRange(start, end) {
      const s = Math.min(start.getTime(), end.getTime());
      const e = Math.max(start.getTime(), end.getTime());
      for (const time of blockedDates) {
        if (time >= s && time <= e) return true;
      }
      return false;
    }

    function toggleCalendar() {
      const isOpen = customCalendarPopup.classList.contains('is-open');
      // simple toggle
      if (isOpen) {
        customCalendarPopup.classList.remove('is-open');
      } else {
        customCalendarPopup.classList.add('is-open');
        renderCalendar();
      }
    }

    customDateTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCalendar();
    });

    customCalendarPopup.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent closing when clicking inside
    });

    document.addEventListener('click', () => {
      customCalendarPopup.classList.remove('is-open');
    });

    btnContinue.addEventListener('click', () => {
      customCalendarPopup.classList.remove('is-open');
    });

    btnPrevMonth.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });

    btnNextMonth.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });

    function formatDate(date) {
      if (!date) return 'Выберите дату';
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}.${m}.${y}`;
    }

    function formatRangeDisplay() {
      if (selectionStart && selectionEnd) {
        const tempStart = new Date(Math.min(selectionStart, selectionEnd));
        const tempEnd = new Date(Math.max(selectionStart, selectionEnd));

        if (tempStart.getMonth() === tempEnd.getMonth() && tempStart.getFullYear() === tempEnd.getFullYear()) {
          calendarSelectedRange.textContent = `${tempStart.getDate()} – ${tempEnd.getDate()} ${monthsRuDeclined[tempStart.getMonth()]} ${tempStart.getFullYear()}`;
        } else {
          calendarSelectedRange.textContent = `${tempStart.getDate()} ${monthsRuDeclined[tempStart.getMonth()]} – ${tempEnd.getDate()} ${monthsRuDeclined[tempEnd.getMonth()]} ${tempEnd.getFullYear()}`;
        }

        checkinDisplay.textContent = formatDate(tempStart);
        if (checkinDisplay.textContent !== 'Выберите дату') checkinDisplay.style.color = 'var(--color-primary)';
        checkinInput.value = tempStart.toISOString().split('T')[0];

        checkoutDisplay.textContent = formatDate(tempEnd);
        if (checkoutDisplay.textContent !== 'Выберите дату') checkoutDisplay.style.color = 'var(--color-primary)';
        checkoutInput.value = tempEnd.toISOString().split('T')[0];
      } else if (selectionStart) {
        calendarSelectedRange.textContent = `${selectionStart.getDate()} ${monthsRuDeclined[selectionStart.getMonth()]} ${selectionStart.getFullYear()} – ...`;
        checkinDisplay.textContent = formatDate(selectionStart);
        checkinDisplay.style.color = 'var(--color-primary)';
        checkinInput.value = selectionStart.toISOString().split('T')[0];
        checkoutDisplay.textContent = 'Выберите дату';
        checkoutDisplay.style.color = 'var(--color-text-secondary)';
        checkoutInput.value = '';
      } else {
        calendarSelectedRange.textContent = 'Заезд — Выезд';
        checkinDisplay.textContent = 'Выберите дату';
        checkinDisplay.style.color = 'var(--color-text-secondary)';
        checkoutDisplay.textContent = 'Выберите дату';
        checkoutDisplay.style.color = 'var(--color-text-secondary)';
        checkinInput.value = '';
        checkoutInput.value = '';
      }
    }

    function handleDayClick(dayDate) {
      const selectedTime = dayDate.getTime();

      if (!selectionStart || (selectionStart && selectionEnd)) {
        // Start new selection
        selectionStart = dayDate;
        selectionEnd = null;
      } else {
        // End selection
        if (selectedTime === selectionStart.getTime()) {
          // unselect if clicking same day
          selectionStart = null;
        } else {
          const tempEnd = dayDate;
          const tempStart = selectionStart;

          if (hasBlockedDatesInRange(tempStart, tempEnd)) {
            selectionStart = dayDate;
            selectionEnd = null;
          } else {
            selectionEnd = tempEnd;
            if (selectionEnd < selectionStart) {
              selectionStart = selectionEnd;
              selectionEnd = tempStart;
            }
          }
        }
      }

      formatRangeDisplay();
      renderCalendar();
    }

    function renderCalendar() {
      calendarDaysGrid.innerHTML = '';
      calendarCurrentMonth.textContent = `${monthsRu[currentMonth]} ${currentYear}`;

      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // Adjust for Monday start (0=Monday, 6=Sunday)
      let startingDay = firstDayOfMonth.getDay() - 1;
      if (startingDay === -1) startingDay = 6;

      // Empty cells before start
      for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('cal-day', 'empty');
        calendarDaysGrid.appendChild(emptyCell);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('cal-day');
        dayCell.textContent = i;

        const cellDate = new Date(currentYear, currentMonth, i);
        const cellTime = cellDate.getTime();

        // Check if disabled (past dates or blocked dates)
        const isBlocked = isDateBlocked(cellTime);
        if (cellTime < today.getTime() || isBlocked) {
          dayCell.classList.add('disabled');
          if (isBlocked) {
            dayCell.classList.add('blocked-date');

            const prevDayTime = new Date(currentYear, currentMonth, i - 1).getTime();
            const nextDayTime = new Date(currentYear, currentMonth, i + 1).getTime();

            if (!isDateBlocked(prevDayTime)) {
              dayCell.classList.add('blocked-start');
            }
            if (!isDateBlocked(nextDayTime)) {
              dayCell.classList.add('blocked-end');
            }
          }
        } else {
          dayCell.addEventListener('click', () => handleDayClick(cellDate));

          // Selection Highlights
          const isStart = selectionStart && cellTime === selectionStart.getTime();
          const isEnd = selectionEnd && cellTime === selectionEnd.getTime();
          const inRange = selectionStart && selectionEnd && cellTime > selectionStart.getTime() && cellTime < selectionEnd.getTime();

          if (isStart || isEnd) {
            dayCell.classList.add('selected');
          }
          if (inRange) {
            dayCell.classList.add('in-range');
          }

          if (isStart && selectionEnd) dayCell.classList.add('in-range', 'range-start');
          if (isEnd && selectionStart) dayCell.classList.add('in-range', 'range-end');
        }

        calendarDaysGrid.appendChild(dayCell);
      }
    }

    // Initial setup
    renderCalendar();
    formatRangeDisplay(); // Fix colors of placeholders
  }
});
