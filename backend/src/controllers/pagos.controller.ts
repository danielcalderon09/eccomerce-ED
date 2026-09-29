import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const procesarPago = async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
        const { pedido_id, metodo_pago } = req.body;

        if (!pedido_id || !metodo_pago) {
            res.status(400).json({ mensaje: 'pedido_id y metodo_pago son requeridos.' });
            return;
        }

        const pedido = await client.query(
            'SELECT * FROM pedidos WHERE id = $1 AND usuario_id = $2 AND estado = \'pendiente_pago\'',
            [pedido_id, req.usuario_id]
        );

        if (pedido.rows.length === 0) {
            res.status(404).json({ mensaje: 'Pedido no encontrado o ya fue procesado.' });
            return;
        }

        await client.query('BEGIN');

        const transaccion_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const aprobado = Math.random() > 0.2;
        const estado_pago = aprobado ? 'aprobado' : 'rechazado';
        const respuesta = aprobado ? 'Pago aprobado por pasarela simulada' : 'Pago rechazado por pasarela simulada';

        await client.query(
            'INSERT INTO pagos (pedido_id, monto, estado, transaccion_id, metodo, respuesta) VALUES ($1, $2, $3, $4, $5, $6)',
            [pedido_id, pedido.rows[0].total, estado_pago, transaccion_id, metodo_pago, respuesta]
        );

        if (aprobado) {
            await client.query(
                'UPDATE pedidos SET estado = \'pagado\', actualizado_en = CURRENT_TIMESTAMP WHERE id = $1',
                [pedido_id]
            );

            const items = await client.query('SELECT ip.*, p.stock as stock_actual FROM items_pedido ip JOIN productos p ON ip.producto_id = p.id WHERE ip.pedido_id = $1', [pedido_id]);
            for (const item of items.rows) {
                await client.query(
                    'UPDATE productos SET stock = stock - $1, stock_reservado = GREATEST(0, stock_reservado - $1) WHERE id = $2',
                    [item.cantidad, item.producto_id]
                );
                await client.query(
                    'INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo) VALUES ($1, \'salida\', $2, $3, $4, $5, \'pago_aprobado\')',
                    [item.producto_id, item.cantidad, item.stock_actual, item.stock_actual - item.cantidad, pedido_id]
                );
            }
        } else {
            await client.query(
                'UPDATE pedidos SET estado = \'cancelado\', actualizado_en = CURRENT_TIMESTAMP WHERE id = $1',
                [pedido_id]
            );

            const items = await client.query('SELECT * FROM items_pedido WHERE pedido_id = $1', [pedido_id]);
            for (const item of items.rows) {
                await client.query(
                    'UPDATE productos SET stock_reservado = GREATEST(0, stock_reservado - $1) WHERE id = $2',
                    [item.cantidad, item.producto_id]
                );
                await client.query(
                    'INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, referencia_id, referencia_tipo, motivo) VALUES ($1, \'liberacion\', $2, $3, \'pedido_cancelado\', \'Pago rechazado\')',
                    [item.producto_id, item.cantidad, pedido_id]
                );
            }
        }

        await client.query('COMMIT');

        res.json({ 
            mensaje: respuesta,
            pago: {
                transaccion_id,
                estado: estado_pago,
                monto: pedido.rows[0].total,
                metodo: metodo_pago
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    } finally {
        client.release();
    }
};

export const listarPagos = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let query: string;
        let params: any[];

        if (req.rol === 'admin') {
            query = `SELECT pg.*, p.id as pedido_id, u.nombre as cliente_nombre
                     FROM pagos pg
                     JOIN pedidos p ON pg.pedido_id = p.id
                     JOIN usuarios u ON p.usuario_id = u.id
                     ORDER BY pg.creado_en DESC`;
            params = [];
        } else {
            query = `SELECT pg.* FROM pagos pg
                     JOIN pedidos p ON pg.pedido_id = p.id
                     WHERE p.usuario_id = $1
                     ORDER BY pg.creado_en DESC`;
            params = [req.usuario_id];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
