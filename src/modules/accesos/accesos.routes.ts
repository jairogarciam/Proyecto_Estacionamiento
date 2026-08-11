import { Router } from 'express';
import { registrarEntrada, registrarSalida, obtenerActivos, obtenerHistorial, obtenerMisAccesos } from './accesos.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

// Endpoint para que el Tótem/Guardia escanee el QR y registre la entrada
router.post(
  '/entrada',
  verificarToken,
  verificarRol(['GUARDIA', 'ADMIN']),
  registrarEntrada
);

// Endpoint para registrar la salida y liberar el cajón
router.put(
  '/salida/:id',
  verificarToken,
  verificarRol(['GUARDIA', 'ADMIN']),
  registrarSalida
);

// Endpoint exclusivo para administradores
router.get(
  '/activos',
  verificarToken,
  verificarRol(['GUARDIA', 'ADMIN']),
  obtenerActivos
);

router.get(
  '/mios',
  verificarToken,
  verificarRol(['DOCENTE']),
  obtenerMisAccesos
);

router.get(
  '/historial',
  verificarToken,
  verificarRol(['ADMIN']), 
  obtenerHistorial
);

export default router;