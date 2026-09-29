import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const listarDirecciones = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT * FROM direcciones WHERE usuario_id = $1 ORDER BY es_predeterminada DESC, creado_en DESC',
            [req.usuario_id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const crearDireccion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { etiqueta, direccion, ciudad, departamento, codigo_postal, es_predeterminada } = req.body;

        if (es_predeterminada) {
            await pool.query(
                'UPDATE direcciones SET es_predeterminada = FALSE WHERE usuario_id = $1',
                [req.usuario_id]
            );
        }

        const result = await pool.query(
            'INSERT INTO direcciones (usuario_id, etiqueta, direccion, ciudad, departamento, codigo_postal, es_predeterminada) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.usuario_id, etiqueta, direccion, ciudad, departamento, codigo_postal, es_predeterminada]
        );

        res.status(201).json({ mensaje: 'Direccion creada con exito', direccion: result.rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const actualizarDireccion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { etiqueta, direccion, ciudad, departamento, codigo_postal, es_predeterminada } = req.body;

        if (es_predeterminada) {
            await pool.query(
                'UPDATE direcciones SET es_predeterminada = FALSE WHERE usuario_id = $1 AND id != $2',
                [req.usuario_id, id]
            );
        }

        const result = await pool.query(
            'UPDATE direcciones SET etiqueta = COALESCE($1, etiqueta), direccion = COALESCE($2, direccion), ciudad = COALESCE($3, ciudad), departamento = COALESCE($4, departamento), codigo_postal = COALESCE($5, codigo_postal), es_predeterminada = COALESCE($6, es_predeterminada) WHERE id = $7 AND usuario_id = $8 RETURNING *',
            [etiqueta, direccion, ciudad, departamento, codigo_postal, es_predeterminada, id, req.usuario_id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Direccion no encontrada.' });
            return;
        }

        res.json({ mensaje: 'Direccion actualizada con exito', direccion: result.rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const eliminarDireccion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM direcciones WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [id, req.usuario_id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Direccion no encontrada.' });
            return;
        }

        res.json({ mensaje: 'Direccion eliminada con exito' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
