import { Router } from 'express';
import { registrar, login } from './auth.controller';

const router = Router();

// Rutas de autenticación
router.post('/registrar', registrar);
router.post('/login', login);

export default router;