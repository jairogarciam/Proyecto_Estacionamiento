import { Router } from 'express';
import { 
    listarDocentes, registrarDocente, verPerfil, 
    registrarVehiculo, listarVehiculos, eliminarVehiculo 
} from './docentes.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

// ==========================================
// RUTAS PARA EL ADMINISTRADOR
// ==========================================
// Solo los usuarios con rol 'ADMIN' pueden listar y crear docentes
router.get('/', verificarToken, verificarRol(['ADMIN']), listarDocentes);
router.post('/', verificarToken, verificarRol(['ADMIN']), registrarDocente);

// ==========================================
// RUTAS PARA EL DOCENTE
// ==========================================
// Solo los usuarios con rol 'DOCENTE' pueden gestionar su propio perfil y autos
router.get('/perfil', verificarToken, verificarRol(['DOCENTE']), verPerfil);
router.post('/vehiculos', verificarToken, verificarRol(['DOCENTE']), registrarVehiculo);
router.get('/vehiculos', verificarToken, verificarRol(['DOCENTE']), listarVehiculos);
router.delete('/vehiculos/:id', verificarToken, verificarRol(['DOCENTE']), eliminarVehiculo);

export default router;