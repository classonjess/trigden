/* Shared safeguards; existing forms retain their endpoints and success handling. */
(() => {
  function validate(form) {
    form.querySelectorAll('input, select, textarea').forEach(field => {
      if (['hidden', 'checkbox', 'radio'].includes(field.type) || field.name === '_gotcha') return;
      if (field.dataset.whitespaceError === 'true') {
        field.setCustomValidity('');
        delete field.dataset.whitespaceError;
      }
      if (field.required && !['checkbox', 'radio'].includes(field.type) && !field.value.trim()) {
        field.setCustomValidity('Please complete this field.');
        field.dataset.whitespaceError = 'true';
      }
      field.setAttribute('aria-invalid', String(!field.checkValidity()));
    });
    return form.checkValidity();
  }
  async function request(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const result = await response.json().catch(error => {
        if (error.name === 'AbortError') throw error;
        return null;
      });
      return { response, result };
    } finally { clearTimeout(timeout); }
  }
  function focusStatus(status) {
    status.setAttribute('tabindex', '-1');
    status.focus();
  }
  function blocked(status) {
    status.classList.remove('is-success');
    status.classList.add('is-error');
    status.textContent = 'Unable to submit this inquiry. Please email hello@trigdenstudio.com.';
    focusStatus(status);
  }
  window.trigdenForms = { validate, request, focusStatus, blocked };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form input, form select, form textarea').forEach(field => {
      const clear = () => {
        field.setCustomValidity('');
        delete field.dataset.whitespaceError;
        field.removeAttribute('aria-invalid');
      };
      field.addEventListener('input', clear);
      field.addEventListener('change', clear);
    });
  });
})();
