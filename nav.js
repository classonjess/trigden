(function () {
  const dropdown = document.querySelector('.nav-dropdown');
  const toggle = dropdown && dropdown.querySelector('.nav-dropdown__toggle');
  const menuToggle = document.getElementById('menu-toggle');
  const menuButton = document.querySelector('.hamburger');
  const updateMenuButton = () => {
    if (!menuButton || !menuToggle) return;
    menuButton.setAttribute('aria-expanded', String(menuToggle.checked));
    menuButton.setAttribute('aria-label', menuToggle.checked ? 'Close menu' : 'Open menu');
    const locked = window.innerWidth <= 768 && menuToggle.checked;
    document.documentElement.classList.toggle('mobile-menu-open', locked);
    document.body.classList.toggle('mobile-menu-open', locked);
  };
  if (menuButton && menuToggle) {
    menuButton.addEventListener('click', () => {
      menuToggle.checked = !menuToggle.checked;
      updateMenuButton();
      if (!menuToggle.checked && dropdown) setOpen(false);
    });
    menuToggle.addEventListener('change', updateMenuButton);
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) menuToggle.checked = false;
      updateMenuButton();
    });
    window.addEventListener('pageshow', updateMenuButton);
    updateMenuButton();
  }
  if (!dropdown || !toggle) return;

  dropdown.classList.add('nav-ready');
  const setOpen = (open) => {
    dropdown.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', (event) => {
    if (window.innerWidth > 768) return;
    event.preventDefault();
    setOpen(!dropdown.classList.contains('is-open'));
  });

  dropdown.addEventListener('mouseenter', () => {
    if (window.innerWidth > 768) setOpen(true);
  });

  dropdown.addEventListener('mouseleave', () => {
    if (window.innerWidth > 768) setOpen(false);
  });

  dropdown.addEventListener('focusout', (event) => {
    if (!dropdown.contains(event.relatedTarget)) setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const wasMobileOpen = window.innerWidth <= 768 && menuToggle?.checked;
    setOpen(false);
    if (window.innerWidth <= 768 && menuToggle) menuToggle.checked = false;
    updateMenuButton();
    if (wasMobileOpen) menuButton?.focus();
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    if (link.classList.contains('nav-dropdown__toggle')) return;
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768 && menuToggle) menuToggle.checked = false;
      updateMenuButton();
      setOpen(false);
    });
  });
})();

// Keep current-page treatment consistent across the shared primary header.
(() => {
  const header = document.getElementById('nav');
  if (!header) return;
  const normalizePath = path => {
    const clean = path.replace(/\/+$|\.html$/gi, '');
    return clean === '' || clean === '/index' ? '/' : clean;
  };
  const path = normalizePath(location.pathname);
  header.querySelectorAll('a[href]').forEach(link => {
    const destination = new URL(link.href);
    const current = normalizePath(destination.pathname) === path && !destination.hash;
    if (current) link.setAttribute('aria-current', 'page');
    else { link.removeAttribute('aria-current'); link.classList.remove('active'); }
  });
  const toggle = header.querySelector('.nav-dropdown__toggle');
  const menu = header.querySelector('.nav-dropdown__menu');
  if (!toggle || !menu) return;
  if (menu.querySelector('[aria-current="page"]')) toggle.classList.add('is-current-parent');
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.contains(document.activeElement)) toggle.focus();
  });
  toggle.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    toggle.closest('.nav-dropdown').classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    Array.from(menu.querySelectorAll('a')).find(link => link.getClientRects().length)?.focus();
  });
})();
