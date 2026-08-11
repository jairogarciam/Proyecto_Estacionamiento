import { Router } from 'express';
import { 
    listarDocentes, listarCatalogoAcceso, registrarDocente, verPerfil,
    registrarVehiculo, listarVehiculos, actualizarVehiculo, eliminarVehiculo
} from './docentes.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

router.get('/', verificarToken, verificarRol(['ADMIN']), listarDocentes);
router.post('/', verificarToken, verificarRol(['ADMIN']), registrarDocente);
router.get('/catalogo', verificarToken, verificarRol(['ADMIN', 'GUARDIA']), listarCatalogoAcceso);

router.get('/perfil', verificarToken, verificarRol(['DOCENTE']), verPerfil);
router.post('/vehiculos', verificarToken, verificarRol(['DOCENTE']), registrarVehiculo);
router.get('/vehiculos', verificarToken, verificarRol(['DOCENTE']), listarVehiculos);
router.put('/vehiculos/:id', verificarToken, verificarRol(['DOCENTE']), actualizarVehiculo);
router.delete('/vehiculos/:id', verificarToken, verificarRol(['DOCENTE']), eliminarVehiculo);

export default router;