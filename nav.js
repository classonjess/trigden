(function () {
  const dropdown = document.querySelector('.nav-dropdown');
  const toggle = dropdown && dropdown.querySelector('.nav-dropdown__toggle');
  const menuToggle = document.getElementById('menu-toggle');
  if (!dropdown || !toggle) return;

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
    setOpen(false);
    if (window.innerWidth <= 768 && menuToggle) menuToggle.checked = false;
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    if (link.classList.contains('nav-dropdown__toggle')) return;
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768 && menuToggle) menuToggle.checked = false;
      setOpen(false);
    });
  });
})();
