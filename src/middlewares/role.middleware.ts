import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const verificarRol = (rolesPermitidos: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const usuario = req.usuario;

        // Comprobamos si el usuario existe y si su rol está dentro de los permitidos
        if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
            res.status(403).json({ error: 'Acceso denegado. Rol no autorizado para esta acción.' });
            return;
        }

        next(); // Tiene permiso, continúa
    };
};