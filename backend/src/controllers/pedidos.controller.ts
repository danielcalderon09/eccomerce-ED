import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const crearPedido = async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
        const { direccion_id, direccion_envio, telefono, metodo_pago, cupon_codigo } = req.body;

        if (!metodo_pago) {
            res.status(400).json({ mensaje: 'Metodo de pago es requerido.' });
            return;
        }

        if (!direccion_envio && !direccion_id) {
            res.status(400).json({ mensaje: 'Direccion de envio es requerida.' });
            return;
        }

        let direccionId = direccion_id || null;

        if (direccion_envio && !direccion_id) {
            const nuevaDireccion = await client.query(
                'INSERT INTO direcciones (usuario_id, etiqueta, direccion, ciudad, es_predeterminada) VALUES ($1, $2, $3, $4, FALSE) RETURNING id',
                [req.usuario_id, 'Checkout', direccion_envio, req.body.ciudad || null]
            );
            direccionId = nuevaDireccion.rows[0].id;
        }

        const carrito = await client.query(
            `SELECT c.id, c.cupon_id, c.descuento_aplicado, ic.producto_id, ic.cantidad, ic.precio_unitario, p.stock
             FROM carritos c
             JOIN items_carrito ic ON c.id = ic.carrito_id
             JOIN productos p ON ic.producto_id = p.id
             WHERE c.usuario_id = $1 AND c.estado = 'activo'`,
            [req.usuario_id]
        );

        if (carrito.rows.length === 0) {
            res.status(400).json({ mensaje: 'El carrito esta vacio.' });
            return;
        }

        await client.query('BEGIN');

        let subtotal = 0;
        const items = [];

        for (const item of carrito.rows) {
            const stockDisponible = item.stock - item.stock_reservado;
            if (stockDisponible < item.cantidad) {
                await client.query('ROLLBACK');
                res.status(400).json({ mensaje: `Stock insuficiente para producto ${item.producto_id}. Disponible: ${stockDisponible}` });
                return;
            }

            const subtotalItem = item.cantidad * item.precio_unitario;
            subtotal += subtotalItem;
            items.push(item);

            await client.query(
                'UPDATE productos SET stock_reservado = stock_reservado + $1 WHERE id = $2',
                [item.cantidad, item.producto_id]
            );

            await client.query(
                'INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo) VALUES ($1, \'reserva\', $2, $3, $4, $5, \'pedido\')',
                [item.producto_id, item.cantidad, item.stock, item.stock - item.cantidad, items.length]
            );
        }

        let descuento = carrito.rows[0].descuento_aplicado || 0;
        let cupon_id = carrito.rows[0].cupon_id || null;

        if (cupon_codigo) {
            const cupon = await client.query(
                "SELECT * FROM cupones WHERE codigo = $1 AND activo = TRUE AND (usos_maximos IS NULL OR usos_actuales < usos_maximos) AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE)",
                [cupon_codigo]
            );
            if (cupon.rows.length > 0) {
                const c = cupon.rows[0];
                if (subtotal >= c.minimo_compra) {
                    if (c.tipo === 'porcentaje') descuento = subtotal * (c.valor / 100);
                    else if (c.tipo === 'monto_fijo') descuento = c.valor;
                    else if (c.tipo === 'envio_gratis') descuento = 15000;
                    descuento = Math.min(descuento, subtotal);
                    cupon_id = c.id;
                    await client.query('UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id = $1', [c.id]);
                }
            }
        }

        const total = Math.max(0, subtotal - descuento);

        const pedido = await client.query(
            'INSERT INTO pedidos (usuario_id, direccion_id, total, subtotal, descuento, cupon_id, estado, metodo_pago) VALUES ($1, $2, $3, $4, $5, $6, \'pendiente_pago\', $7) RETURNING *',
            [req.usuario_id, direccionId, total, subtotal, descuento, cupon_id, metodo_pago]
        );

        const pedido_id = pedido.rows[0].id;

        for (const item of items) {
            const subtotalItem = item.cantidad * item.precio_unitario;
            await client.query(
                'INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
                [pedido_id, item.producto_id, item.cantidad, item.precio_unitario, subtotalItem]
            );
        }

        await client.query("UPDATE carritos SET estado = 'abandonado', cupon_id = NULL, descuento_aplicado = 0 WHERE usuario_id = $1", [req.usuario_id]);

        await client.query('COMMIT');

        res.status(201).json({ 
            mensaje: 'Pedido creado con exito', 
            pedido: pedido.rows[0],
            items,
            subtotal,
            descuento,
            total 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    } finally {
        client.release();
    }
};

export const listarPedidos = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let query: string;
        let params: any[];

        if (req.rol === 'admin') {
            query = `SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email, d.direccion as direccion_envio
                     FROM pedidos p
                     JOIN usuarios u ON p.usuario_id = u.id
                     LEFT JOIN direcciones d ON p.direccion_id = d.id
                     ORDER BY p.creado_en DESC`;
            params = [];
        } else {
            query = `SELECT p.*, d.direccion as direccion_envio FROM pedidos p LEFT JOIN direcciones d ON p.direccion_id = d.id WHERE p.usuario_id = $1 ORDER BY p.creado_en DESC`;
            params = [req.usuario_id];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerPedido = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        let query: string;
        let params: any[];

        if (req.rol === 'admin') {
            query = `SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email, d.direccion as direccion_envio
                     FROM pedidos p
                     JOIN usuarios u ON p.usuario_id = u.id
                     LEFT JOIN direcciones d ON p.direccion_id = d.id
                     WHERE p.id = $1`;
            params = [id];
        } else {
            query = `SELECT p.*, d.direccion as direccion_envio FROM pedidos p LEFT JOIN direcciones d ON p.direccion_id = d.id WHERE p.id = $1 AND p.usuario_id = $2`;
            params = [id, req.usuario_id];
        }

        const pedido = await pool.query(query, params);

        if (pedido.rows.length === 0) {
            res.status(404).json({ mensaje: 'Pedido no encontrado.' });
            return;
        }

        const items = await pool.query(
            `SELECT ip.*, p.nombre as producto_nombre, p.imagen_url
             FROM items_pedido ip
             JOIN productos p ON ip.producto_id = p.id
             WHERE ip.pedido_id = $1`,
            [id]
        );

        const pagos = await pool.query('SELECT * FROM pagos WHERE pedido_id = $1', [id]);

        res.json({ pedido: pedido.rows[0], items: items.rows, pagos: pagos.rows });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const actualizarEstadoPedido = async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden actualizar el estado de pedidos.' });
            return;
        }

        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado'];
        if (!estadosValidos.includes(estado)) {
            res.status(400).json({ mensaje: 'Estado invalido.' });
            return;
        }

        await client.query('BEGIN');

        const pedidoAnterior = await client.query('SELECT * FROM pedidos WHERE id = $1', [id]);
        if (pedidoAnterior.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ mensaje: 'Pedido no encontrado.' });
            return;
        }

        if (estado === 'cancelado' && pedidoAnterior.rows[0].estado !== 'cancelado') {
            const items = await client.query('SELECT * FROM items_pedido WHERE pedido_id = $1', [id]);
            for (const item of items.rows) {
                await client.query(
                    'UPDATE productos SET stock_reservado = GREATEST(0, stock_reservado - $1) WHERE id = $2',
                    [item.cantidad, item.producto_id]
                );
                await client.query(
                    'INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, referencia_id, referencia_tipo, motivo) VALUES ($1, \'liberacion\', $2, $3, \'pedido_cancelado\', \'Cancelacion de pedido\')',
                    [item.producto_id, item.cantidad, id]
                );
            }
        }

        if (estado === 'pagado' && pedidoAnterior.rows[0].estado === 'pendiente_pago') {
            const items = await client.query('SELECT * FROM items_pedido WHERE pedido_id = $1', [id]);
            for (const item of items.rows) {
                await client.query(
                    'UPDATE productos SET stock = stock - $1, stock_reservado = GREATEST(0, stock_reservado - $1) WHERE id = $2',
                    [item.cantidad, item.producto_id]
                );
                await client.query(
                    'INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, referencia_id, referencia_tipo, motivo) VALUES ($1, \'salida\', $2, $3, \'pedido_pagado\', \'Venta confirmada\')',
                    [item.producto_id, item.cantidad, id]
                );
            }
        }

        const result = await client.query(
            'UPDATE pedidos SET estado = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [estado, id]
        );

        await client.query('COMMIT');

        res.json({ mensaje: 'Estado actualizado con exito', pedido: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    } finally {
        client.release();
    }
};
