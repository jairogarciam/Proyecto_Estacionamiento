import { escapeHtml, formatDate, request, requireRole, showMessage } from './api.js';
import { setBusy, setupLayout } from './layout.js';

if (!requireRole(['ADMIN'])) throw new Error('Rol no autorizado');
setupLayout('Panel de administración');
document.querySelector('[data-panel="overview"] .muted').textContent = 'Consulta el estado de los cajones y las actividades del sistema.';

const message = document.querySelector('#page-message');
const sections = document.querySelectorAll('.admin-section');
document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => {
  sections.forEach((section) => section.classList.toggle('active', section.dataset.panel === button.dataset.section));
  document.querySelectorAll('[data-section]').forEach((item) => item.classList.toggle('active', item === button));
  if (button.dataset.section === 'overview' || button.dataset.section === 'parking') loadParking();
  if (button.dataset.section === 'users') loadUsers();
  if (button.dataset.section === 'teachers') loadTeachers();
  if (button.dataset.section === 'complaints') loadComplaints();
  if (button.dataset.section === 'history') loadHistory();
}));

function report(error) { showMessage(message, error.message, true); }
const parkingForm = document.querySelector('#parking-form');
const parkingMessage = document.querySelector('#parking-message');
const parkingSubmit = document.querySelector('#parking-submit');
const cancelParkingEdit = document.querySelector('#cancel-parking-edit');
const userForm = document.querySelector('#user-form');
const userMessage = document.querySelector('#user-message');
const userSubmit = document.querySelector('#user-submit');
const cancelUserEdit = document.querySelector('#cancel-user-edit');

function resetUserForm() {
  userForm.reset();
  userForm.elements.id.value = '';
  userForm.elements.password.placeholder = 'Solo para cambiarla';
  userSubmit.textContent = 'Crear usuario';
  document.querySelector('#user-form-title').textContent = 'Crear usuario';
  cancelUserEdit.classList.add('hidden');
}

function editUser(user) {
  userForm.elements.id.value = user.id;
  userForm.elements.nombre.value = user.nombre;
  userForm.elements.usuario.value = user.usuario;
  userForm.elements.password.value = '';
  userForm.elements.rol.value = user.rol;
  userForm.elements.password.placeholder = 'Dejar vacío para conservarla';
  userSubmit.textContent = 'Guardar cambios';
  document.querySelector('#user-form-title').textContent = 'Editar usuario';
  cancelUserEdit.classList.remove('hidden');
  userForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadUsers() {
  try {
    const users = await request('/api/auth/usuarios');
    document.querySelector('#users-list').innerHTML = users.length ? users.map((user) => `<div class="table-row"><div><strong>${escapeHtml(user.nombre)}</strong><small>${escapeHtml(user.usuario)} · ${user.rol}</small></div><div class="row-actions"><button class="outline-button edit-user" data-id="${user.id}">Editar</button><button class="danger-button delete-user" data-id="${user.id}">Eliminar</button></div></div>`).join('') : '<p class="muted">No hay usuarios registrados.</p>';
    document.querySelectorAll('.edit-user').forEach((button) => button.addEventListener('click', () => editUser(users.find((user) => user.id === Number(button.dataset.id)))));
    document.querySelectorAll('.delete-user').forEach((button) => button.addEventListener('click', async () => {
      if (!window.confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
      try { await request(`/api/auth/usuarios/${button.dataset.id}`, { method: 'DELETE' }); showMessage(userMessage, 'Usuario eliminado correctamente.'); await loadUsers(); } catch (error) { showMessage(userMessage, error.message, true); }
    }));
  } catch (error) { report(error); }
}
function resetParkingForm() {
  parkingForm.reset();
  parkingForm.elements.id.value = '';
  parkingSubmit.textContent = 'Crear cajón';
  document.querySelector('#parking-form-title').textContent = 'Administrar cajones';
  cancelParkingEdit.classList.add('hidden');
}

function editParking(cajon) {
  parkingForm.elements.id.value = cajon.id;
  parkingForm.elements.identificador.value = cajon.identificador;
  parkingForm.elements.fila.value = cajon.fila;
  parkingForm.elements.columna.value = cajon.columna;
  parkingForm.elements.distanciaEntrada.value = cajon.distanciaEntrada;
  parkingSubmit.textContent = 'Guardar cambios';
  document.querySelector('#parking-form-title').textContent = 'Editar cajón';
  cancelParkingEdit.classList.remove('hidden');
  parkingForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderParking(cajones, target) {
  target.classList.add('parking-map');
  target.innerHTML = cajones.length ? cajones.map((cajon) => `<article class="parking-slot ${cajon.estado.toLowerCase()}" style="--slot-row:${Math.max(1, String(cajon.fila).charCodeAt(0) - 64)};--slot-column:${cajon.columna}"><strong>${escapeHtml(cajon.identificador)}</strong><span>${cajon.estado.toLowerCase()}</span><small>${escapeHtml(cajon.fila)}-${cajon.columna} · ${cajon.distanciaEntrada} m</small>${cajon.placaOcupante ? `<small>Placa: ${escapeHtml(cajon.placaOcupante)}</small>` : ''}<select class="slot-state" data-id="${cajon.id}"><option ${cajon.estado === 'LIBRE' ? 'selected' : ''}>LIBRE</option><option ${cajon.estado === 'OCUPADO' ? 'selected' : ''}>OCUPADO</option><option ${cajon.estado === 'MANTENIMIENTO' ? 'selected' : ''}>MANTENIMIENTO</option></select><button class="edit-slot outline-button" data-id="${cajon.id}">Editar</button></article>`).join('') : '<p class="muted">No hay cajones registrados.</p>';
  target.querySelectorAll('.slot-state').forEach((select) => select.addEventListener('change', async () => {
    try { await request(`/api/cajones/${select.dataset.id}/estado`, { method: 'PUT', body: JSON.stringify({ estado: select.value }) }); await loadParking(); } catch (error) { report(error); }
  }));
  target.querySelectorAll('.edit-slot').forEach((button) => button.addEventListener('click', () => editParking(cajones.find((cajon) => cajon.id === Number(button.dataset.id)))));
}

async function loadParking() {
  try {
    const { cajones } = await request('/api/cajones');
    const counts = cajones.reduce((result, item) => ({ ...result, [item.estado]: (result[item.estado] || 0) + 1 }), {});
    document.querySelector('#free-count').textContent = counts.LIBRE || 0;
    document.querySelector('#occupied-count').textContent = counts.OCUPADO || 0;
    document.querySelector('#maintenance-count').textContent = counts.MANTENIMIENTO || 0;
    document.querySelector('#capacity-count').textContent = cajones.length;
    renderParking(cajones, document.querySelector('#overview-grid'));
    renderParking(cajones, document.querySelector('#parking-list'));
  } catch (error) { report(error); }
}

async function loadTeachers() {
  try { const teachers = await request('/api/docentes'); document.querySelector('#teachers-list').innerHTML = teachers.length ? teachers.map((teacher) => `<div class="table-row"><div><strong>${escapeHtml(teacher.nombre)}</strong><small>${escapeHtml(teacher.usuario)}</small></div><code>${escapeHtml(teacher.qrToken || 'sin QR')}</code></div>`).join('') : '<p class="muted">No hay docentes.</p>'; } catch (error) { report(error); }
}

async function loadComplaints() {
  try { const { quejas } = await request('/api/quejas'); document.querySelector('#complaints-list').innerHTML = quejas.length ? quejas.map((queja) => `<div class="table-row"><div><strong>${escapeHtml(queja.docente.nombre)} · Cajón ${escapeHtml(queja.cajon.identificador)}</strong><small>Placa invasora: ${escapeHtml(queja.placaOcupante || 'No registrada')} · ${escapeHtml(queja.descripcion)}</small></div><button class="outline-button resolve-button" data-id="${queja.id}">Resolver</button></div>`).join('') : '<p class="muted">No hay quejas pendientes.</p>'; document.querySelectorAll('.resolve-button').forEach((button) => button.addEventListener('click', async () => { try { await request(`/api/quejas/${button.dataset.id}/resolver`, { method: 'PUT' }); await loadComplaints(); } catch (error) { report(error); } })); } catch (error) { report(error); }
}

async function loadHistory() {
  try { const history = await request('/api/accesos/historial'); document.querySelector('#history-list').innerHTML = history.length ? history.map((access) => `<div class="table-row"><div><strong>${escapeHtml(access.vehiculo?.placa)} · ${escapeHtml(access.cajon?.identificador)}</strong><small>${escapeHtml(access.docente?.nombre)} · entrada ${formatDate(access.fechaHoraEntrada)}</small></div><span class="status-text">${access.fechaHoraSalida ? `salida ${formatDate(access.fechaHoraSalida)}` : 'Dentro'}</span></div>`).join('') : '<p class="muted">No hay accesos registrados.</p>'; } catch (error) { report(error); }
}

async function submitForm(selector, path, successSelector, after) {
  const form = document.querySelector(selector); const button = form.querySelector('button');
  form.addEventListener('submit', async (event) => { event.preventDefault(); setBusy(button, true); try { await request(path, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); showMessage(document.querySelector(successSelector), 'Guardado correctamente.'); await after(); } catch (error) { showMessage(document.querySelector(successSelector), error.message, true); } finally { setBusy(button, false); } });
}

userForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(userSubmit, true);
  try {
    const values = Object.fromEntries(new FormData(userForm));
    const id = values.id;
    delete values.id;
    if (!values.password) delete values.password;
    await request(id ? `/api/auth/usuarios/${id}` : '/api/auth/usuarios', { method: id ? 'PUT' : 'POST', body: JSON.stringify(values) });
    showMessage(userMessage, id ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
    resetUserForm();
    await loadUsers();
  } catch (error) { showMessage(userMessage, error.message, true); } finally { setBusy(userSubmit, false); }
});
cancelUserEdit.addEventListener('click', resetUserForm);
submitForm('#teacher-form', '/api/docentes', '#teacher-message', loadTeachers);
parkingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = parkingForm.querySelector('button');
  setBusy(button, true);
  try {
    const values = Object.fromEntries(new FormData(parkingForm));
    const id = values.id;
    delete values.id;
    const payload = { ...values, columna: Number(values.columna), distanciaEntrada: Number(values.distanciaEntrada) };
    await request(id ? `/api/cajones/${id}` : '/api/cajones', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    showMessage(parkingMessage, id ? 'Cajón actualizado correctamente.' : 'Cajón creado correctamente.');
    resetParkingForm();
    await loadParking();
  } catch (error) {
    showMessage(document.querySelector('#parking-message'), error.message, true);
  } finally {
    setBusy(button, false);
  }
});
cancelParkingEdit.addEventListener('click', resetParkingForm);
document.querySelector('#refresh-overview').addEventListener('click', loadParking);
document.querySelector('#refresh-complaints').addEventListener('click', loadComplaints);
document.querySelector('#refresh-history').addEventListener('click', loadHistory);
loadParking();
