import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const listarReseñas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { producto_id } = req.query;
        
        let query = `SELECT r.*, u.nombre as usuario_nombre 
                     FROM reseñas r 
                     JOIN usuarios u ON r.usuario_id = u.id`;
        const params: any[] = [];

        if (producto_id) {
            query += ' WHERE r.producto_id = $1';
            params.push(producto_id);
        }

        query += ' ORDER BY r.creado_en DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const crearReseña = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { producto_id, calificacion, comentario } = req.body;

        if (!producto_id || !calificacion) {
            res.status(400).json({ mensaje: 'producto_id y calificacion son requeridos.' });
            return;
        }

        const producto = await pool.query('SELECT id FROM productos WHERE id = $1 AND activo = TRUE', [producto_id]);
        if (producto.rows.length === 0) {
            res.status(404).json({ mensaje: 'Producto no encontrado.' });
            return;
        }

        const result = await pool.query(
            'INSERT INTO reseñas (producto_id, usuario_id, calificacion, comentario) VALUES ($1, $2, $3, $4) RETURNING *',
            [producto_id, req.usuario_id, calificacion, comentario]
        );

        res.status(201).json({ mensaje: 'Reseña creada con exito', reseña: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({ mensaje: 'Ya has reseñado este producto.' });
            return;
        }
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const actualizarReseña = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { calificacion, comentario } = req.body;

        const result = await pool.query(
            'UPDATE reseñas SET calificacion = COALESCE($1, calificacion), comentario = COALESCE($2, comentario) WHERE id = $3 AND usuario_id = $4 RETURNING *',
            [calificacion, comentario, id, req.usuario_id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Reseña no encontrada.' });
            return;
        }

        res.json({ mensaje: 'Reseña actualizada con exito', reseña: result.rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const eliminarReseña = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        let query = 'DELETE FROM reseñas WHERE id = $1';
        const params: any[] = [id];

        if (req.rol !== 'admin') {
            query += ' AND usuario_id = $2';
            params.push(req.usuario_id);
        }

        const result = await pool.query(query, params);

        if (result.rowCount === 0) {
            res.status(404).json({ mensaje: 'Reseña no encontrada.' });
            return;
        }

        res.json({ mensaje: 'Reseña eliminada con exito' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
