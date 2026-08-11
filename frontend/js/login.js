import { request, saveSession, session, showMessage } from './api.js';

if (session.token && session.user) {
  window.location.href = `./${session.user.rol.toLowerCase()}.html`;
}

const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  showMessage(error, '');
  const values = Object.fromEntries(new FormData(form));
  try {
    const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(values) });
    saveSession(result);
    window.location.href = `./${result.usuario.rol.toLowerCase()}.html`;
  } catch (requestError) {
    showMessage(error, requestError.message, true);
  } finally {
    button.disabled = false;
  }
});