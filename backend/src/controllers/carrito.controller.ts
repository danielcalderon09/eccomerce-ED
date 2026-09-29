import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const obtenerCarrito = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT ic.id, ic.producto_id, ic.cantidad, ic.precio_unitario, p.nombre, p.imagen_url, p.stock, p.stock_reservado
             FROM items_carrito ic
             JOIN productos p ON ic.producto_id = p.id
             JOIN carritos c ON ic.carrito_id = c.id
             WHERE c.usuario_id = $1 AND c.estado = 'activo'
             ORDER BY ic.creado_en DESC`,
            [req.usuario_id]
        );

        const carrito = await pool.query(
            'SELECT cupon_id, descuento_aplicado FROM carritos WHERE usuario_id = $1 AND estado = \'activo\'',
            [req.usuario_id]
        );

        const subtotal = result.rows.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio_unitario), 0);
        const descuento = carrito.rows[0]?.descuento_aplicado || 0;
        const total = Math.max(0, subtotal - descuento);

        res.json({ items: result.rows, subtotal, descuento, total });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const agregarAlCarrito = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { producto_id, cantidad } = req.body;

        if (!producto_id || !cantidad || cantidad < 1) {
            res.status(400).json({ mensaje: 'producto_id y cantidad valida son requeridos.' });
            return;
        }

        const producto = await pool.query('SELECT * FROM productos WHERE id = $1 AND activo = TRUE', [producto_id]);
        if (producto.rows.length === 0) {
            res.status(404).json({ mensaje: 'Producto no encontrado.' });
            return;
        }

        const stockDisponible = producto.rows[0].stock - producto.rows[0].stock_reservado;
        if (stockDisponible < cantidad) {
            res.status(400).json({ mensaje: `Stock insuficiente. Disponible: ${stockDisponible}` });
            return;
        }

        let carrito = await pool.query('SELECT id FROM carritos WHERE usuario_id = $1 AND estado = \'activo\'', [req.usuario_id]);
        
        let carrito_id;
        if (carrito.rows.length === 0) {
            const nuevoCarrito = await pool.query('INSERT INTO carritos (usuario_id) VALUES ($1) RETURNING id', [req.usuario_id]);
            carrito_id = nuevoCarrito.rows[0].id;
        } else {
            carrito_id = carrito.rows[0].id;
        }

        const itemExistente = await pool.query(
            'SELECT * FROM items_carrito WHERE carrito_id = $1 AND producto_id = $2',
            [carrito_id, producto_id]
        );

        if (itemExistente.rows.length > 0) {
            const nuevaCantidad = itemExistente.rows[0].cantidad + cantidad;
            if (stockDisponible < nuevaCantidad) {
                res.status(400).json({ mensaje: 'Stock insuficiente para la cantidad total.' });
                return;
            }
            await pool.query(
                'UPDATE items_carrito SET cantidad = $1 WHERE id = $2',
                [nuevaCantidad, itemExistente.rows[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO items_carrito (carrito_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [carrito_id, producto_id, cantidad, producto.rows[0].precio]
            );
        }

        await pool.query('UPDATE carritos SET actualizado_en = CURRENT_TIMESTAMP WHERE id = $1', [carrito_id]);

        res.json({ mensaje: 'Producto agregado al carrito' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const actualizarCantidad = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body;

        if (!cantidad || cantidad < 1) {
            res.status(400).json({ mensaje: 'Cantidad valida requerida.' });
            return;
        }

        const item = await pool.query(
            `SELECT ic.*, p.stock, p.stock_reservado FROM items_carrito ic
             JOIN productos p ON ic.producto_id = p.id
             JOIN carritos c ON ic.carrito_id = c.id
             WHERE ic.id = $1 AND c.usuario_id = $2`,
            [id, req.usuario_id]
        );

        if (item.rows.length === 0) {
            res.status(404).json({ mensaje: 'Item no encontrado en el carrito.' });
            return;
        }

        const stockDisponible = item.rows[0].stock - item.rows[0].stock_reservado;
        if (stockDisponible < cantidad) {
            res.status(400).json({ mensaje: `Stock insuficiente. Disponible: ${stockDisponible}` });
            return;
        }

        await pool.query('UPDATE items_carrito SET cantidad = $1 WHERE id = $2', [cantidad, id]);
        await pool.query('UPDATE carritos SET actualizado_en = CURRENT_TIMESTAMP WHERE id = $1', [item.rows[0].carrito_id]);

        res.json({ mensaje: 'Cantidad actualizada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const eliminarDelCarrito = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const item = await pool.query(
            `SELECT ic.carrito_id FROM items_carrito ic
             JOIN carritos c ON ic.carrito_id = c.id
             WHERE ic.id = $1 AND c.usuario_id = $2`,
            [id, req.usuario_id]
        );

        if (item.rows.length === 0) {
            res.status(404).json({ mensaje: 'Item no encontrado en el carrito.' });
            return;
        }

        await pool.query('DELETE FROM items_carrito WHERE id = $1', [id]);
        await pool.query('UPDATE carritos SET actualizado_en = CURRENT_TIMESTAMP WHERE id = $1', [item.rows[0].carrito_id]);

        res.json({ mensaje: 'Item eliminado del carrito' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const limpiarCarrito = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const carrito = await pool.query('SELECT id FROM carritos WHERE usuario_id = $1 AND estado = \'activo\'', [req.usuario_id]);
        
        if (carrito.rows.length > 0) {
            await pool.query('DELETE FROM items_carrito WHERE carrito_id = $1', [carrito.rows[0].id]);
            await pool.query("UPDATE carritos SET estado = 'abandonado', cupon_id = NULL, descuento_aplicado = 0 WHERE id = $1", [carrito.rows[0].id]);
        }

        res.json({ mensaje: 'Carrito limpiado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const aplicarCupon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { codigo } = req.body;

        const carrito = await pool.query("SELECT id FROM carritos WHERE usuario_id = $1 AND estado = 'activo'", [req.usuario_id]);
        if (carrito.rows.length === 0) {
            res.status(400).json({ mensaje: 'No hay carrito activo.' });
            return;
        }

        const itemsResult = await pool.query(
            `SELECT SUM(ic.cantidad * ic.precio_unitario) as subtotal FROM items_carrito ic JOIN carritos c ON ic.carrito_id = c.id WHERE c.usuario_id = $1 AND c.estado = 'activo'`,
            [req.usuario_id]
        );
        const subtotal = parseFloat(itemsResult.rows[0].subtotal) || 0;

        const cupon = await pool.query(
            "SELECT * FROM cupones WHERE codigo = $1 AND activo = TRUE AND (usos_maximos IS NULL OR usos_actuales < usos_maximos) AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE)",
            [codigo]
        );

        if (cupon.rows.length === 0) {
            res.status(404).json({ mensaje: 'Cupon no encontrado o expirado.' });
            return;
        }

        const c = cupon.rows[0];
        if (subtotal < c.minimo_compra) {
            res.status(400).json({ mensaje: `Compra minima de $${c.minimo_compra} para usar este cupon.` });
            return;
        }

        let descuento = 0;
        if (c.tipo === 'porcentaje') descuento = subtotal * (c.valor / 100);
        else if (c.tipo === 'monto_fijo') descuento = c.valor;
        else if (c.tipo === 'envio_gratis') descuento = 15000;
        descuento = Math.min(descuento, subtotal);

        await pool.query(
            'UPDATE carritos SET cupon_id = $1, descuento_aplicado = $2 WHERE id = $3',
            [c.id, descuento, carrito.rows[0].id]
        );

        res.json({ mensaje: 'Cupon aplicado con exito', descuento, total: Math.max(0, subtotal - descuento) });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
