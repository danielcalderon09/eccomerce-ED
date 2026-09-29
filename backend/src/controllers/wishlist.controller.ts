import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const obtenerWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT w.id, w.producto_id, w.creado_en, p.nombre, p.descripcion, p.precio, p.imagen_url, p.stock, p.categoria, p.marca
             FROM wishlist_items w
             JOIN productos p ON w.producto_id = p.id
             WHERE w.usuario_id = $1 AND p.activo = TRUE
             ORDER BY w.creado_en DESC`,
            [req.usuario_id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const agregarAWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { producto_id } = req.body;

        if (!producto_id) {
            res.status(400).json({ mensaje: 'producto_id es requerido.' });
            return;
        }

        const producto = await pool.query('SELECT id FROM productos WHERE id = $1 AND activo = TRUE', [producto_id]);
        if (producto.rows.length === 0) {
            res.status(404).json({ mensaje: 'Producto no encontrado.' });
            return;
        }

        const result = await pool.query(
            'INSERT INTO wishlist_items (usuario_id, producto_id) VALUES ($1, $2) RETURNING *',
            [req.usuario_id, producto_id]
        );

        res.status(201).json({ mensaje: 'Producto agregado a wishlist', item: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({ mensaje: 'El producto ya esta en tu wishlist.' });
            return;
        }
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const eliminarDeWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM wishlist_items WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [id, req.usuario_id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Item no encontrado en wishlist.' });
            return;
        }

        res.json({ mensaje: 'Producto eliminado de wishlist' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const moverACarrito = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { producto_id } = req.body;

        if (!producto_id) {
            res.status(400).json({ mensaje: 'producto_id es requerido.' });
            return;
        }

        const producto = await pool.query('SELECT * FROM productos WHERE id = $1 AND activo = TRUE', [producto_id]);
        if (producto.rows.length === 0) {
            res.status(404).json({ mensaje: 'Producto no encontrado.' });
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
            await pool.query(
                'UPDATE items_carrito SET cantidad = cantidad + 1 WHERE id = $1',
                [itemExistente.rows[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO items_carrito (carrito_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, 1, $3)',
                [carrito_id, producto_id, producto.rows[0].precio]
            );
        }

        await pool.query('DELETE FROM wishlist_items WHERE usuario_id = $1 AND producto_id = $2', [req.usuario_id, producto_id]);

        res.json({ mensaje: 'Producto movido al carrito' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
