import { escapeHtml, formatDate, request, requireRole, showMessage } from './api.js';
import { setBusy, setupLayout } from './layout.js';

if (!requireRole(['DOCENTE'])) throw new Error('Rol no autorizado');
setupLayout('Mi cuenta');
const message = document.querySelector('#page-message');
const sections = document.querySelectorAll('.teacher-section');
const vehicleForm = document.querySelector('#vehicle-form');
const vehicleMessage = document.querySelector('#vehicle-message');
const vehicleSubmit = document.querySelector('#vehicle-submit');
const cancelVehicleEdit = document.querySelector('#cancel-vehicle-edit');
document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => { sections.forEach((section) => section.classList.toggle('active', section.dataset.panel === button.dataset.section)); document.querySelectorAll('[data-section]').forEach((item) => item.classList.toggle('active', item === button)); if (button.dataset.section === 'access') loadAccess(); }));

async function loadProfile() { try { const profile = await request('/api/docentes/perfil'); document.querySelector('#profile-card').innerHTML = `<p class="eyebrow">PERFIL</p><h3>${escapeHtml(profile.nombre)}</h3><p class="muted">Usuario: ${escapeHtml(profile.usuario)}</p><p class="qr-value">QR: ${escapeHtml(profile.qrToken || 'Pendiente')}</p>`; } catch (error) { showMessage(message, error.message, true); } }
function resetVehicleForm() {
	vehicleForm.reset();
	vehicleForm.elements.id.value = '';
	vehicleSubmit.textContent = 'Registrar vehículo';
	document.querySelector('#vehicle-form-title').textContent = 'Perfil y vehículos';
	cancelVehicleEdit.classList.add('hidden');
}

function editVehicle(vehicle) {
	vehicleForm.elements.id.value = vehicle.id;
	vehicleForm.elements.placa.value = vehicle.placa;
	vehicleForm.elements.marca.value = vehicle.marca;
	vehicleForm.elements.modelo.value = vehicle.modelo;
	vehicleForm.elements.color.value = vehicle.color;
	vehicleSubmit.textContent = 'Guardar cambios';
	document.querySelector('#vehicle-form-title').textContent = 'Editar vehículo';
	cancelVehicleEdit.classList.remove('hidden');
	vehicleForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadVehicles() { try { const { vehiculos } = await request('/api/docentes/vehiculos'); document.querySelector('#vehicles-list').innerHTML = vehiculos.length ? vehiculos.map((vehicle) => `<div class="table-row"><div><strong>${escapeHtml(vehicle.placa)}</strong><small>${escapeHtml(vehicle.marca)} ${escapeHtml(vehicle.modelo)} · ${escapeHtml(vehicle.color)}</small></div><div class="row-actions"><button class="outline-button edit-vehicle" data-id="${vehicle.id}">Editar</button><button class="danger-button delete-button" data-id="${vehicle.id}">Eliminar</button></div></div>`).join('') : '<p class="muted">No tienes vehículos registrados.</p>'; document.querySelectorAll('.edit-vehicle').forEach((button) => button.addEventListener('click', () => editVehicle(vehiculos.find((vehicle) => vehicle.id === Number(button.dataset.id))))); document.querySelectorAll('.delete-button').forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('¿Eliminar este vehículo?')) return; try { await request(`/api/docentes/vehiculos/${button.dataset.id}`, { method: 'DELETE' }); await loadVehicles(); } catch (error) { showMessage(message, error.message, true); } })); } catch (error) { showMessage(message, error.message, true); } }
async function loadAccess() { try { const accesses = await request('/api/accesos/mios'); document.querySelector('#access-list').innerHTML = accesses.length ? accesses.map((access) => `<div class="table-row"><div><strong>${escapeHtml(access.vehiculo.placa)} · Cajón ${escapeHtml(access.cajon.identificador)}</strong><small>Entrada ${formatDate(access.fechaHoraEntrada)}${access.cajon.placaOcupante ? ` · placa en cajón: ${escapeHtml(access.cajon.placaOcupante)}` : ''}</small></div><span class="status-text">${access.fechaHoraSalida ? `Salida ${formatDate(access.fechaHoraSalida)}` : 'Activo'}</span></div>`).join('') : '<p class="muted">Aún no tienes accesos.</p>'; } catch (error) { showMessage(message, error.message, true); } }

vehicleForm.addEventListener('submit', async (event) => { event.preventDefault(); setBusy(vehicleSubmit, true); try { const values = Object.fromEntries(new FormData(vehicleForm)); const id = values.id; delete values.id; await request(id ? `/api/docentes/vehiculos/${id}` : '/api/docentes/vehiculos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(values) }); showMessage(vehicleMessage, id ? 'Vehículo actualizado correctamente.' : 'Vehículo registrado correctamente.'); resetVehicleForm(); await loadVehicles(); } catch (error) { showMessage(vehicleMessage, error.message, true); } finally { setBusy(vehicleSubmit, false); } });
cancelVehicleEdit.addEventListener('click', resetVehicleForm);
document.querySelector('#complaint-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); setBusy(button, true); try { const result = await request('/api/quejas', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); showMessage(document.querySelector('#complaint-message'), `${result.message}${result.nuevoCajon ? ` Nuevo cajón: ${result.nuevoCajon.identificador}` : ''}`); await loadAccess(); } catch (error) { showMessage(document.querySelector('#complaint-message'), error.message, true); } finally { setBusy(button, false); } });
document.querySelector('#refresh-access').addEventListener('click', loadAccess);
loadProfile(); loadVehicles(); loadAccess();
