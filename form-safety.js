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
  function isSuccess(response, result) {
    return response.ok && result?.ok === true;
  }
  async function animate(element, frames, duration) {
    if (!element.animate) return;
    let effect, timeout;
    try {
      effect = element.animate(frames, { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
      await Promise.race([effect.finished, new Promise(resolve => { timeout = setTimeout(resolve, duration + 150); })]);
    } catch (_) {
      // Submission already succeeded; animation failure must never hide confirmation.
    } finally {
      clearTimeout(timeout);
      effect?.cancel();
    }
  }
  async function success(form, status) {
    if (form.dataset.submitted === 'true') return;
    form.dataset.submitted = 'true';
    form.inert = true;
    status.textContent = '';
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    const confirmation = document.createElement('div');
    confirmation.className = 'inquiry-confirmation';
    confirmation.setAttribute('role', 'status');
    confirmation.setAttribute('aria-live', 'polite');
    confirmation.setAttribute('aria-atomic', 'true');
    const icon = document.createElement('span');
    icon.className = 'inquiry-confirmation__check';
    icon.setAttribute('aria-hidden', 'true');
    const heading = document.createElement('h2');
    heading.id = form.id + '-thanks-heading';
    heading.tabIndex = -1;
    heading.textContent = 'Thank You!';
    const message = document.createElement('p');
    message.id = form.id + '-thanks-message';
    message.textContent = "Your inquiry has been sent successfully. I'll be in touch soon.";
    heading.setAttribute('aria-describedby', message.id);
    confirmation.setAttribute('aria-labelledby', heading.id);
    confirmation.append(icon, heading, message);
    if (!reduced) await animate(form, [{ opacity: 1 }, { opacity: 0 }], 220);
    form.classList.add('inquiry-submitted');
    form.hidden = true;
    // Remove only the form card's introductory prompts, not section content.
    form.parentElement.querySelectorAll(':scope > .contact-card-intro, :scope.inquiry-card > h2, :scope.inquiry-card > p').forEach(element => { element.hidden = true; });
    form.before(confirmation);
    form.reset();
    heading.focus({ preventScroll: true });
    const bounds = confirmation.getBoundingClientRect();
    if (bounds.top < 80 || bounds.bottom > window.innerHeight) {
      confirmation.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }
    if (!reduced) await animate(confirmation, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 440);
  }
  function blocked(status) {
    status.classList.remove('is-success');
    status.classList.add('is-error');
    status.textContent = 'Unable to submit this inquiry. Please email hello@trigdenstudio.com.';
    focusStatus(status);
  }
  window.trigdenForms = { validate, request, focusStatus, blocked, isSuccess, success };
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
