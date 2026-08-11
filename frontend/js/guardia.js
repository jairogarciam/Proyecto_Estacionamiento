import { escapeHtml, request, requireRole, showMessage, formatDate } from './api.js';
import { setBusy, setupLayout } from './layout.js';

if (!requireRole(['GUARDIA', 'ADMIN'])) throw new Error('Rol no autorizado');
setupLayout('Registro de entradas');
const message = document.querySelector('#page-message');
const sections = document.querySelectorAll('.guard-section');
let docentes = [];
const teacherSearch = document.querySelector('#teacher-search');
const teacherOptions = document.querySelector('#teacher-options');
const vehicleSelect = document.querySelector('#vehicle-select');
document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => { sections.forEach((section) => section.classList.toggle('active', section.dataset.panel === button.dataset.section)); document.querySelectorAll('[data-section]').forEach((item) => item.classList.toggle('active', item === button)); if (button.dataset.section === 'parking') loadParking(); }));

async function loadTeacherCatalog() {
  try {
    docentes = await request('/api/docentes/catalogo');
    teacherOptions.innerHTML = docentes.map((docente) => `<option value="${escapeHtml(docente.nombre)}">${escapeHtml(docente.usuario)} · ${docente.vehiculos.length} vehículo(s)</option>`).join('');
  } catch (error) { showMessage(message, error.message, true); }
}

function getSelectedTeacher() {
  return docentes.find((docente) => docente.nombre.toLowerCase() === teacherSearch.value.trim().toLowerCase());
}

function updateVehicleOptions() {
  const docente = getSelectedTeacher();
  vehicleSelect.innerHTML = docente?.vehiculos.length
    ? docente.vehiculos.map((vehicle) => `<option value="${escapeHtml(vehicle.placa)}">${escapeHtml(vehicle.placa)} · ${escapeHtml(vehicle.marca)} ${escapeHtml(vehicle.modelo)}</option>`).join('')
    : '<option value="">Este docente no tiene vehículos registrados</option>';
  vehicleSelect.disabled = !docente || !docente.vehiculos.length;
}

teacherSearch.addEventListener('input', updateVehicleOptions);
teacherSearch.addEventListener('change', updateVehicleOptions);

async function loadActive() {
  try { const accesses = await request('/api/accesos/activos'); document.querySelector('#active-list').innerHTML = accesses.length ? accesses.map((access) => `<div class="table-row"><div><strong>${escapeHtml(access.vehiculo.placa)} · ${escapeHtml(access.docente.nombre)}</strong><small>Cajón ${escapeHtml(access.cajon.identificador)} · entrada ${formatDate(access.fechaHoraEntrada)}</small></div><button class="outline-button exit-button" data-id="${access.id}">Registrar salida</button></div>`).join('') : '<p class="muted">No hay vehículos dentro.</p>'; document.querySelectorAll('.exit-button').forEach((button) => button.addEventListener('click', async () => { try { await request(`/api/accesos/salida/${button.dataset.id}`, { method: 'PUT' }); await loadActive(); await loadParking(); } catch (error) { showMessage(message, error.message, true); } })); } catch (error) { showMessage(message, error.message, true); }
}

async function loadParking() {
  try { const target = document.querySelector('#parking-list'); target.classList.add('parking-map'); const { cajones } = await request('/api/cajones'); target.innerHTML = cajones.map((cajon) => `<article class="parking-slot ${cajon.estado.toLowerCase()}" style="--slot-row:${Math.max(1, String(cajon.fila).charCodeAt(0) - 64)};--slot-column:${cajon.columna}"><strong>${escapeHtml(cajon.identificador)}</strong><span>${cajon.estado.toLowerCase()}</span><small>${escapeHtml(cajon.fila)}-${cajon.columna} · ${cajon.distanciaEntrada} m</small>${cajon.placaOcupante ? `<small>Placa: ${escapeHtml(cajon.placaOcupante)}</small>` : ''}</article>`).join(''); } catch (error) { showMessage(message, error.message, true); }
}

const entryForm = document.querySelector('#entry-form');
entryForm.addEventListener('submit', async (event) => { event.preventDefault(); const docente = getSelectedTeacher(); if (!docente) { showMessage(document.querySelector('#entry-message'), 'Selecciona un docente del catálogo.', true); return; } const button = entryForm.querySelector('button'); setBusy(button, true); try { const result = await request('/api/accesos/entrada', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(entryForm))) }); entryForm.reset(); vehicleSelect.innerHTML = '<option value="">Selecciona primero un docente</option>'; vehicleSelect.disabled = true; showMessage(document.querySelector('#entry-message'), `${result.mensaje} Cajón: ${result.cajon_asignado}`); await loadActive(); await loadParking(); } catch (error) { showMessage(document.querySelector('#entry-message'), error.message, true); } finally { setBusy(button, false); } });
document.querySelector('#refresh-active').addEventListener('click', loadActive);
document.querySelector('#refresh-parking').addEventListener('click', loadParking);
loadTeacherCatalog(); loadActive(); loadParking();
