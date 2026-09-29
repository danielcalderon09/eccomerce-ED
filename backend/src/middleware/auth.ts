import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    usuario_id?: number;
    rol?: string;
}

export const verificarToken = (rolesPermitidos: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token) {
            res.status(403).json({ mensaje: 'Acceso denegado. Token no provisto.' });
            return;
        }

        try {
            const verificado = jwt.verify(token, process.env.JWT_SECRET || 'FirmaSecretaInstitucional2026') as any;
            req.usuario_id = verificado.id;
            req.rol = verificado.rol;

            if (!rolesPermitidos.includes(req.rol!)) {
                res.status(401).json({ mensaje: 'No tiene permisos para esta accion.' });
                return;
            }
            next();
        } catch (error) {
            res.status(400).json({ mensaje: 'Token invalido o expirado.' });
        }
    };
};
