import { Router } from 'express';
import { listarCajones, crearCajon, actualizarCajon, actualizarEstado } from './cajones.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

router.get('/', listarCajones);
router.post('/', verificarToken, verificarRol(['ADMIN']), crearCajon);
router.put('/:id', verificarToken, verificarRol(['ADMIN']), actualizarCajon);
router.put('/:id/estado', verificarToken, verificarRol(['ADMIN', 'GUARDIA']), actualizarEstado);

export default router;
