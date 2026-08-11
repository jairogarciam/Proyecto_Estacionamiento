import { logout, session } from './api.js';

export function setupLayout(title) {
  document.querySelector('#user-label').textContent = `${session.user.nombre} · ${session.user.rol}`;
  document.querySelector('#page-title').textContent = title;
  document.querySelector('#logout-button').addEventListener('click', logout);
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('[data-nav]').forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

export function setBusy(button, busy) {
  button.disabled = busy;
  button.dataset.originalText ||= button.textContent;
  button.textContent = busy ? 'Procesando...' : button.dataset.originalText;
}
