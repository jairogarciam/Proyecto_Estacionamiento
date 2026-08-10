import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extendemos la interfaz Request para poder inyectarle los datos del usuario
export interface AuthRequest extends Request {
    usuario?: any;
}

export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Obtenemos el token del encabezado (formato: "Bearer token...")
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Acceso denegado. No hay token provisto.' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'firma_secreta_por_defecto';
        const payload = jwt.verify(token, secret);
        
        // Guardamos los datos decodificados en la petición para usarlos en el controlador
        req.usuario = payload; 
        next(); // Le decimos a Express que puede continuar a la siguiente ruta
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};