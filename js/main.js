/* js/main.js */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle (Foundation for responsiveness)
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinksContainer = document.querySelector('.nav-links');

  if (mobileMenuBtn && navLinksContainer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);

      // Toggle a utility class instead of inline styles for cleaner scaling
      if (!isExpanded) {
        navLinksContainer.style.display = 'flex';
        navLinksContainer.style.flexDirection = 'column';
        navLinksContainer.style.position = 'absolute';
        navLinksContainer.style.top = '100%';
        navLinksContainer.style.left = '0';
        navLinksContainer.style.right = '0';
        navLinksContainer.style.backgroundColor = 'var(--color-background)';
        navLinksContainer.style.padding = 'var(--space-1)';
        navLinksContainer.style.boxShadow = 'var(--shadow-soft)';
      } else {
        navLinksContainer.style.display = '';
        navLinksContainer.style.flexDirection = '';
        navLinksContainer.style.position = '';
      }
    });
  }

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
});
