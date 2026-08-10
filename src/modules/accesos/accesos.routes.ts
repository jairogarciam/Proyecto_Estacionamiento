import { Router } from 'express';
import { registrarEntrada, registrarSalida, obtenerHistorial } from './accesos.controller';
import { verificarJWT } from '../../middlewares/auth.middleware';
import { verificarRol } from '../../middlewares/role.middleware';

const router = Router();

// Endpoint para que el Tótem/Guardia escanee el QR y registre la entrada
router.post(
  '/entrada', 
  verificarJWT, 
  verificarRol(['GUARDIA', 'TOTEM', 'ADMIN']), 
  registrarEntrada
);

// Endpoint para registrar la salida y liberar el cajón
router.put(
  '/salida/:id', 
  verificarJWT, 
  verificarRol(['GUARDIA', 'TOTEM', 'ADMIN']), 
  registrarSalida
);

// Endpoint exclusivo para administradores
router.get(
  '/historial', 
  verificarJWT, 
  verificarRol(['ADMIN']), 
  obtenerHistorial
);

export default router;