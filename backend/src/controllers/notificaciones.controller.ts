import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const listarNotificaciones = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY creado_en DESC',
            [req.usuario_id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const marcarComoLeida = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE notificaciones SET leido = TRUE WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [id, req.usuario_id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Notificacion no encontrada.' });
            return;
        }

        res.json({ mensaje: 'Notificacion marcada como leida' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const marcarTodasLeidas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await pool.query(
            'UPDATE notificaciones SET leido = TRUE WHERE usuario_id = $1 AND leido = FALSE',
            [req.usuario_id]
        );
        res.json({ mensaje: 'Todas las notificaciones marcadas como leidas' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerEstadisticas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden ver estadisticas.' });
            return;
        }

        const totalProductos = await pool.query('SELECT COUNT(*) FROM productos WHERE activo = TRUE');
        const totalPedidos = await pool.query('SELECT COUNT(*) FROM pedidos');
        const pedidosPagados = await pool.query('SELECT COUNT(*) FROM pedidos WHERE estado = \'pagado\'');
        const ingresosTotales = await pool.query('SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE estado = \'pagado\'');
        const totalClientes = await pool.query('SELECT COUNT(*) FROM usuarios WHERE rol = \'cliente\' AND activo = TRUE');

        res.json({
            productos: parseInt(totalProductos.rows[0].count),
            pedidos: parseInt(totalPedidos.rows[0].count),
            pedidos_pagados: parseInt(pedidosPagados.rows[0].count),
            ingresos_totales: parseFloat(ingresosTotales.rows[0].coalesce),
            clientes: parseInt(totalClientes.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
