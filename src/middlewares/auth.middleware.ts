import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    usuario?: any;
}

export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Acceso denegado. No hay token provisto.' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'firma_secreta_por_defecto';
        const payload = jwt.verify(token, secret);
        
        req.usuario = payload; 
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};