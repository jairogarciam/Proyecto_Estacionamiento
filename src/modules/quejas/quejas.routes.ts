import { Router } from 'express';
import { crearQueja, listarQuejas, resolverQueja } from './quejas.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

router.post('/', verificarToken, verificarRol(['DOCENTE']), crearQueja);
router.get('/', verificarToken, verificarRol(['ADMIN']), listarQuejas);
router.put('/:id/resolver', verificarToken, verificarRol(['ADMIN']), resolverQueja);

export default router;