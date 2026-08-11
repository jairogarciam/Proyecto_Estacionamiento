import { Router } from 'express';
import { actualizarUsuario, eliminarUsuario, listarUsuarios, registrar, login } from './auth.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

// Rutas de autenticación
router.post('/registrar', registrar);
router.post('/usuarios', verificarToken, verificarRol(['ADMIN']), registrar);
router.get('/usuarios', verificarToken, verificarRol(['ADMIN']), listarUsuarios);
router.put('/usuarios/:id', verificarToken, verificarRol(['ADMIN']), actualizarUsuario);
router.delete('/usuarios/:id', verificarToken, verificarRol(['ADMIN']), eliminarUsuario);
router.post('/login', login);

export default router;