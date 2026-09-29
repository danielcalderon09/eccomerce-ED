import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const listarMovimientos = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { producto_id } = req.query;
        let query = `SELECT im.*, p.nombre as producto_nombre 
                     FROM inventario_movimientos im
                     JOIN productos p ON im.producto_id = p.id`;
        const params: any[] = [];

        if (producto_id) {
            query += ' WHERE im.producto_id = $1';
            params.push(producto_id);
        }

        query += ' ORDER BY im.creado_en DESC LIMIT 100';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const ajustarInventario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden ajustar inventario.' });
            return;
        }

        const { producto_id, tipo, cantidad, motivo } = req.body;

        if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
            res.status(400).json({ mensaje: 'Tipo de movimiento invalido. Use: entrada, salida, ajuste.' });
            return;
        }

        const producto = await pool.query('SELECT * FROM productos WHERE id = $1', [producto_id]);
        if (producto.rows.length === 0) {
            res.status(404).json({ mensaje: 'Producto no encontrado.' });
            return;
        }

        const stockAnterior = producto.rows[0].stock;
        let stockNuevo = stockAnterior;

        if (tipo === 'entrada') {
            stockNuevo = stockAnterior + cantidad;
        } else if (tipo === 'salida' || tipo === 'ajuste') {
            stockNuevo = Math.max(0, stockAnterior - cantidad);
        }

        await pool.query(
            'UPDATE productos SET stock = $1 WHERE id = $2',
            [stockNuevo, producto_id]
        );

        await pool.query(
            'INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo) VALUES ($1, $2, $3, $4, $5, $6)',
            [producto_id, tipo, cantidad, stockAnterior, stockNuevo, motivo]
        );

        res.json({ 
            mensaje: 'Inventario ajustado con exito',
            producto_id,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            tipo
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerAlertasStock = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const umbral = parseInt(req.query.umbral as string) || 10;
        const result = await pool.query(
            'SELECT id, nombre, stock, stock_reservado, categoria FROM productos WHERE activo = TRUE AND stock <= $1 ORDER BY stock ASC',
            [umbral]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerEstadisticasInventario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const totalProductos = await pool.query('SELECT COUNT(*) FROM productos WHERE activo = TRUE');
        const stockTotal = await pool.query('SELECT COALESCE(SUM(stock), 0) as total FROM productos WHERE activo = TRUE');
        const valorInventario = await pool.query('SELECT COALESCE(SUM(stock * precio), 0) as valor FROM productos WHERE activo = TRUE');
        const productosBajoStock = await pool.query('SELECT COUNT(*) FROM productos WHERE activo = TRUE AND stock <= 10');

        res.json({
            total_productos: parseInt(totalProductos.rows[0].count),
            stock_total: parseInt(stockTotal.rows[0].total),
            valor_inventario: parseFloat(valorInventario.rows[0].valor),
            productos_bajo_stock: parseInt(productosBajoStock.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
