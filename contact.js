(() => {
  const form = document.getElementById('project-inquiry');
  if (!form || !window.trigdenForms) return;
  const status = document.getElementById('inquiry-status');
  const button = form.querySelector('button[type="submit"]');
  const controls = [...form.querySelectorAll('input:not([type="hidden"]), select, textarea')];
  // Native validation remains available when JavaScript is disabled.
  controls.forEach(field => field.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    field.setCustomValidity('');
  }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    status.classList.remove('is-error');
    status.textContent = '';
    controls.forEach(field => {
      field.setCustomValidity('');
      if (field.required && !field.value.trim()) field.setCustomValidity('Please complete this field.');
      field.setAttribute('aria-invalid', String(!field.checkValidity()));
    });
    if (!form.checkValidity()) {
      status.classList.add('is-error');
      status.textContent = 'Please complete the required fields and enter a valid email address.';
      form.querySelector(':invalid').focus();
      form.reportValidity();
      return;
    }
    if (form.elements._gotcha.value) {
      window.trigdenForms.blocked(status);
      return;
    }
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your inquiry…';
    try {
      const { response, result } = await window.trigdenForms.request(form.action, {
        method: 'POST', body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!response.ok || result?.ok !== true) {
        throw new Error(response.status === 429 ? 'Too many attempts. Please wait a few minutes before trying again.' : 'Your inquiry could not be confirmed. Please try again or email hello@trigdenstudio.com.');
      }
      form.reset();
      controls.forEach(field => field.removeAttribute('aria-invalid'));
      status.textContent = 'Thank you! Your inquiry has been received. I’ll be in touch soon.';
      status.focus();
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = error.name === 'AbortError' ? 'The request timed out. Please email hello@trigdenstudio.com if you’re unsure whether it was received.' : error.message;
      status.focus();
    } finally {
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
  form.noValidate = true;
})();
