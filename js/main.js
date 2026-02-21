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

  // Native CSS scroll-behavior smooth is used instead
});
