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
    const bookingForm = document.querySelector('.booking-form');
    const attrId = bookingForm ? (bookingForm.getAttribute('data-apartment-id') || bookingForm.dataset.apartmentId) : null;
    const apartmentNumber = attrId ? parseInt(attrId, 10) : 1;

    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    let selectionStart = null;
    let selectionEnd = null;

    // Blocked intervals loaded from API: [{checkIn: Date, checkOut: Date}]
    let blockedIntervals = [];

    const monthsRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const monthsRuDeclined = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    async function fetchCalendar() {
      try {
        const res = await fetch(`/api/calendar?apartment_number=${apartmentNumber}`);
        if (!res.ok) return;
        const data = await res.json();
        blockedIntervals = data.map(item => ({
          checkIn: new Date(item.check_in + 'T00:00:00'),
          checkOut: new Date(item.check_out + 'T00:00:00'),
        }));
        renderCalendar();
      } catch (e) {
        // silently fail — calendar still works without backend data
      }
    }

    function isDateBlocked(cellDate) {
      const cellTime = cellDate.getTime();
      return blockedIntervals.some(interval => {
        return cellTime >= interval.checkIn.getTime() && cellTime < interval.checkOut.getTime();
      });
    }

    function isStrictlyBlocked(cellDate) {
      const cellTime = cellDate.getTime();
      return blockedIntervals.some(interval => {
        return cellTime > interval.checkIn.getTime() && cellTime < interval.checkOut.getTime();
      });
    }

    function hasBlockedDatesInRange(start, end) {
      const s = Math.min(start.getTime(), end.getTime());
      const e = Math.max(start.getTime(), end.getTime());
      return blockedIntervals.some(interval => {
        return interval.checkIn.getTime() < e && interval.checkOut.getTime() > s;
      });
    }

    function toggleCalendar() {
      const isOpen = customCalendarPopup.classList.contains('is-open');
      if (isOpen) {
        customCalendarPopup.classList.remove('is-open');
      } else {
        customCalendarPopup.classList.add('is-open');
        fetchCalendar();
      }
    }

    customDateTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCalendar();
    });

    customCalendarPopup.addEventListener('click', (e) => {
      e.stopPropagation();
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

    function formatYMD(date) {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
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
        checkinInput.value = formatYMD(tempStart);

        checkoutDisplay.textContent = formatDate(tempEnd);
        if (checkoutDisplay.textContent !== 'Выберите дату') checkoutDisplay.style.color = 'var(--color-primary)';
        checkoutInput.value = formatYMD(tempEnd);
      } else if (selectionStart) {
        calendarSelectedRange.textContent = `${selectionStart.getDate()} ${monthsRuDeclined[selectionStart.getMonth()]} ${selectionStart.getFullYear()} – ...`;
        checkinDisplay.textContent = formatDate(selectionStart);
        checkinDisplay.style.color = 'var(--color-primary)';
        checkinInput.value = formatYMD(selectionStart);
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

    async function checkAvailability(start, end) {
      const from = formatYMD(start);
      const to = formatYMD(end);
      try {
        const res = await fetch(`/api/availability?from=${from}&to=${to}&apartment_number=${apartmentNumber}`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.available === true;
      } catch (e) {
        return false;
      }
    }

    async function handleDayClick(dayDate) {
      const selectedTime = dayDate.getTime();

      if (!selectionStart || (selectionStart && selectionEnd)) {
        if (isDateBlocked(dayDate)) return;
        selectionStart = dayDate;
        selectionEnd = null;
      } else {
        if (selectedTime === selectionStart.getTime()) {
          selectionStart = null;
        } else {
          const tempEnd = dayDate;
          const tempStart = selectionStart;

          if (hasBlockedDatesInRange(tempStart, tempEnd)) {
            selectionStart = dayDate;
            selectionEnd = null;
          } else {
            const sortedStart = tempStart < tempEnd ? tempStart : tempEnd;
            const sortedEnd = tempStart < tempEnd ? tempEnd : tempStart;

            const available = await checkAvailability(sortedStart, sortedEnd);
            if (!available) {
              alert('Выбранные даты недоступны. Пожалуйста, выберите другие даты.');
              selectionStart = null;
              selectionEnd = null;
            } else {
              selectionStart = sortedStart;
              selectionEnd = sortedEnd;
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

      let startingDay = firstDayOfMonth.getDay() - 1;
      if (startingDay === -1) startingDay = 6;

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

        let isBlocked = isDateBlocked(cellDate);
        let isHalfBlocked = false;

        if (isBlocked) {
          if (selectionEnd && cellTime === selectionEnd.getTime()) {
            isBlocked = false;
            // if this is the start of a blocked booking, we want it to look half blocked
            const prevDate = new Date(currentYear, currentMonth, i - 1);
            if (!isDateBlocked(prevDate)) {
              isHalfBlocked = true;
            }
          } else if (selectionStart && !selectionEnd && cellTime > selectionStart.getTime()) {
            if (!isStrictlyBlocked(cellDate) && !hasBlockedDatesInRange(selectionStart, cellDate)) {
              isBlocked = false;
              // if this is a click-able target on a blocked booking boundary
              const prevDate = new Date(currentYear, currentMonth, i - 1);
              if (!isDateBlocked(prevDate)) {
                isHalfBlocked = true;
              }
            }
          }
        }

        if (cellTime < today.getTime() || isBlocked) {
          dayCell.classList.add('disabled');
          if (isBlocked) {
            dayCell.classList.add('blocked-date');
            const prevDate = new Date(currentYear, currentMonth, i - 1);
            const nextDate = new Date(currentYear, currentMonth, i + 1);
            if (!isDateBlocked(prevDate)) {
              // Only add full blocked-start if it's not a half-blocked scenario
              if (isBlocked && !isHalfBlocked) {
                dayCell.classList.add('blocked-start');
              }
            }
            if (!isDateBlocked(nextDate)) dayCell.classList.add('blocked-end');
          }
        } else {
          dayCell.addEventListener('click', () => handleDayClick(cellDate));

          const isStart = selectionStart && cellTime === selectionStart.getTime();
          const isEnd = selectionEnd && cellTime === selectionEnd.getTime();
          const inRange = selectionStart && selectionEnd && cellTime > selectionStart.getTime() && cellTime < selectionEnd.getTime();

          if (isStart || isEnd) dayCell.classList.add('selected');
          if (inRange) dayCell.classList.add('in-range');
          if (isStart && selectionEnd) dayCell.classList.add('in-range', 'range-start');
          if (isEnd && selectionStart) dayCell.classList.add('in-range', 'range-end');

          if (isHalfBlocked) {
            dayCell.classList.add('blocked-date');
            dayCell.classList.add('blocked-start-half');
            dayCell.classList.remove('blocked-start'); // ensure it doesn't conflict
          }
        }

        calendarDaysGrid.appendChild(dayCell);
      }
    }

    // --- UI Logic ---
    renderCalendar();
    formatRangeDisplay();

    // === Booking Form Modal Logic ===
    const bookingModal = document.getElementById('booking-modal');
    const bookingModalClose = document.getElementById('booking-modal-close');
    const bookingConfirmForm = document.getElementById('booking-confirmation-form');

    if (bookingForm && bookingModal) {
      bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!checkinInput.value || !checkoutInput.value) {
          alert('Пожалуйста, выберите даты заезда и выезда.');
          return;
        }

        bookingModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });

      const closeBookingModal = () => {
        bookingModal.classList.remove('active');
        document.body.style.overflow = '';
      };

      if (bookingModalClose) {
        bookingModalClose.addEventListener('click', closeBookingModal);
      }

      bookingModal.addEventListener('click', (e) => {
        if (e.target === bookingModal) {
          closeBookingModal();
        }
      });

      if (bookingConfirmForm) {
        const phoneInput = document.getElementById('booking-phone');
        const phoneError = document.createElement('div');
        phoneError.className = 'field-error';
        phoneError.textContent = 'Введите корректный номер телефона';
        phoneInput.parentNode.appendChild(phoneError);

        phoneInput.addEventListener('input', () => {
          phoneInput.classList.remove('input-error');
          phoneError.classList.remove('visible');
        });

        function isValidPhone(value) {
          const digits = value.replace(/\D/g, '');
          if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return true;
          if (digits.length >= 10 && digits.length <= 15) return true;
          return false;
        }

        bookingConfirmForm.addEventListener('submit', async (e) => {
          e.preventDefault();

          const phoneVal = phoneInput.value.trim();
          if (!isValidPhone(phoneVal)) {
            phoneInput.classList.add('input-error');
            phoneError.classList.add('visible');
            phoneInput.focus();
            return;
          }

          const submitBtn = bookingConfirmForm.querySelector('button[type="submit"]');
          const originalBtnText = submitBtn.textContent;
          submitBtn.disabled = true;
          submitBtn.textContent = 'Отправка...';

          const payload = {
            name: document.getElementById('booking-name').value.trim(),
            phone: phoneVal,
            email: document.getElementById('booking-email').value.trim(),
            telegram: document.getElementById('booking-telegram').value.trim(),
            apartment_number: apartmentNumber,
            check_in: checkinInput.value,
            check_out: checkoutInput.value,
          };

          try {
            const res = await fetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (res.status === 201) {
              alert(`Спасибо, ${payload.name}! Ваша заявка успешно отправлена. Мы свяжемся с вами в ближайшее время.`);
              closeBookingModal();
              bookingForm.reset();
              bookingConfirmForm.reset();
              phoneInput.classList.remove('input-error');
              phoneError.classList.remove('visible');
              selectionStart = null;
              selectionEnd = null;
              formatRangeDisplay();
              renderCalendar();
            } else if (res.status === 409) {
              alert('К сожалению, выбранные даты уже заняты. Пожалуйста, выберите другие даты.');
              closeBookingModal();
              selectionStart = null;
              selectionEnd = null;
              formatRangeDisplay();
              renderCalendar();
            } else {
              const data = await res.json().catch(() => ({}));
              alert(`Произошла ошибка: ${data.error || 'Попробуйте позже.'}`);
            }
          } catch (err) {
            alert('Не удалось отправить заявку. Проверьте соединение и попробуйте снова.');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        });
      }
    }
  }
});

