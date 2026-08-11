const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;

export const session = {
  token: localStorage.getItem('parking_token'),
  user: JSON.parse(localStorage.getItem('parking_user') || 'null')
};

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) logout();
    throw new Error(body.error || body.message || 'No se pudo completar la solicitud.');
  }
  return body;
}

export function saveSession(result) {
  session.token = result.token;
  session.user = result.usuario;
  localStorage.setItem('parking_token', session.token);
  localStorage.setItem('parking_user', JSON.stringify(session.user));
}

export function logout() {
  session.token = null;
  session.user = null;
  localStorage.removeItem('parking_token');
  localStorage.removeItem('parking_user');
  window.location.href = './';
}

export function requireRole(roles) {
  if (!session.token || !session.user || !roles.includes(session.user.rol)) {
    window.location.href = './';
    return false;
  }
  return true;
}

export function showMessage(element, message, isError = false) {
  element.textContent = message || '';
  element.classList.toggle('success-message', Boolean(message) && !isError);
  element.classList.toggle('form-error', isError);
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-';
}
