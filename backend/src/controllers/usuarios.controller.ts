import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const listarUsuarios = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rol, busqueda } = req.query;
        let query = 'SELECT id, nombre, email, rol, telefono, activo, creado_en FROM usuarios';
        const params: any[] = [];
        const conditions: string[] = [];

        if (rol) {
            conditions.push(`rol = $${params.length + 1}`);
            params.push(rol);
        }

        if (busqueda) {
            conditions.push(`(nombre ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`);
            params.push(`%${busqueda}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY creado_en DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, nombre, email, rol, telefono, activo, creado_en FROM usuarios WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Usuario no encontrado.' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const actualizarUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden actualizar usuarios.' });
            return;
        }

        const { id } = req.params;
        const { nombre, email, rol, telefono, activo } = req.body;

        const result = await pool.query(
            'UPDATE usuarios SET nombre = COALESCE($1, nombre), email = COALESCE($2, email), rol = COALESCE($3, rol), telefono = COALESCE($4, telefono), activo = COALESCE($5, activo) WHERE id = $6 RETURNING id, nombre, email, rol, telefono, activo',
            [nombre, email, rol, telefono, activo, id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Usuario no encontrado.' });
            return;
        }

        res.json({ mensaje: 'Usuario actualizado con exito', usuario: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({ mensaje: 'El email ya esta registrado.' });
            return;
        }
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const eliminarUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden eliminar usuarios.' });
            return;
        }

        const { id } = req.params;

        if (parseInt(id) === req.usuario_id) {
            res.status(400).json({ mensaje: 'No puedes eliminar tu propio usuario.' });
            return;
        }

        const result = await pool.query(
            'UPDATE usuarios SET activo = FALSE WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Usuario no encontrado.' });
            return;
        }

        res.json({ mensaje: 'Usuario desactivado con exito' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
