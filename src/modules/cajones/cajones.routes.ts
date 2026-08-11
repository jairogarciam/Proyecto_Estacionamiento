import { Router } from 'express';
import { listarCajones, crearCajon, actualizarCajon, actualizarEstado } from './cajones.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

// GET público: consultar estado en tiempo real de todos los cajones
router.get('/', listarCajones);

// POST: crear cajón (Solo ADMIN)
router.post('/', verificarToken, verificarRol(['ADMIN']), crearCajon);
router.put('/:id', verificarToken, verificarRol(['ADMIN']), actualizarCajon);

// PUT: actualizar estado (ADMIN o GUARDIA)
router.put('/:id/estado', verificarToken, verificarRol(['ADMIN', 'GUARDIA']), actualizarEstado);

export default router;
