import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const obtenerReporteVentas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden ver reportes.' });
            return;
        }

        const { fecha_inicio, fecha_fin } = req.query;
        let query = `SELECT DATE(p.creado_en) as fecha, COUNT(*) as total_pedidos, 
                     SUM(p.total) as ingresos_totales, AVG(p.total) as ticket_promedio
                     FROM pedidos p WHERE p.estado = 'pagado'`;
        const params: any[] = [];

        if (fecha_inicio) {
            params.push(fecha_inicio);
            query += ` AND p.creado_en >= $${params.length}`;
        }
        if (fecha_fin) {
            params.push(fecha_fin);
            query += ` AND p.creado_en <= $${params.length}`;
        }

        query += ' GROUP BY DATE(p.creado_en) ORDER BY fecha DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerTopProductos = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden ver reportes.' });
            return;
        }

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const result = await pool.query(`
            SELECT p.id, p.nombre, p.categoria, SUM(ip.cantidad) as unidades_vendidas, 
                   SUM(ip.subtotal) as ingresos_totales, COUNT(DISTINCT ip.pedido_id) as num_pedidos
            FROM items_pedido ip
            JOIN productos p ON ip.producto_id = p.id
            JOIN pedidos ped ON ip.pedido_id = ped.id
            WHERE ped.estado = 'pagado'
            GROUP BY p.id, p.nombre, p.categoria
            ORDER BY unidades_vendidas DESC
            LIMIT $1
        `, [limit]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerReporteCategorias = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden ver reportes.' });
            return;
        }

        const result = await pool.query(`
            SELECT p.categoria, COUNT(DISTINCT ip.pedido_id) as num_pedidos,
                   SUM(ip.cantidad) as unidades_vendidas,
                   SUM(ip.subtotal) as ingresos_totales
            FROM items_pedido ip
            JOIN productos p ON ip.producto_id = p.id
            JOIN pedidos ped ON ip.pedido_id = ped.id
            WHERE ped.estado = 'pagado'
            GROUP BY p.categoria
            ORDER BY ingresos_totales DESC
        `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden ver el dashboard.' });
            return;
        }

        const [totalProductos, totalPedidos, pedidosPagados, ingresosTotales, totalClientes, pedidosPendientes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM productos WHERE activo = TRUE'),
            pool.query('SELECT COUNT(*) FROM pedidos'),
            pool.query('SELECT COUNT(*) FROM pedidos WHERE estado = \'pagado\''),
            pool.query('SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE estado = \'pagado\''),
            pool.query('SELECT COUNT(*) FROM usuarios WHERE rol = \'cliente\' AND activo = TRUE'),
            pool.query('SELECT COUNT(*) FROM pedidos WHERE estado = \'pendiente_pago\''),
        ]);

        const ventasHoy = await pool.query(`
            SELECT COALESCE(SUM(total), 0) FROM pedidos 
            WHERE estado = 'pagado' AND DATE(creado_en) = CURRENT_DATE
        `);

        const ventasMes = await pool.query(`
            SELECT COALESCE(SUM(total), 0) FROM pedidos 
            WHERE estado = 'pagado' AND EXTRACT(MONTH FROM creado_en) = EXTRACT(MONTH FROM CURRENT_DATE)
        `);

        res.json({
            productos: parseInt(totalProductos.rows[0].count),
            pedidos: parseInt(totalPedidos.rows[0].count),
            pedidos_pagados: parseInt(pedidosPagados.rows[0].count),
            pedidos_pendientes: parseInt(pedidosPendientes.rows[0].count),
            ingresos_totales: parseFloat(ingresosTotales.rows[0].coalesce),
            clientes: parseInt(totalClientes.rows[0].count),
            ventas_hoy: parseFloat(ventasHoy.rows[0].coalesce),
            ventas_mes: parseFloat(ventasMes.rows[0].coalesce)
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
