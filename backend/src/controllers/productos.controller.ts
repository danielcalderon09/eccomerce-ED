import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

interface AuthRequestWithFile extends AuthRequest {
    file?: Express.Multer.File;
}

export const listarProductos = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { categoria, busqueda, min_precio, max_precio, marca, ordenar } = req.query;
        
        let query = 'SELECT p.*, COALESCE(AVG(r.calificacion), 0) as calificacion_promedio, COUNT(r.id) as num_reseñas FROM productos p LEFT JOIN reseñas r ON p.id = r.producto_id WHERE p.activo = TRUE';
        const params: any[] = [];
        let paramIndex = 0;

        if (busqueda) {
            paramIndex++;
            query += ` AND p.search_vector @@ plainto_tsquery('spanish', $${paramIndex})`;
            params.push(busqueda);
        }

        if (categoria) {
            paramIndex++;
            query += ` AND p.categoria = $${paramIndex}`;
            params.push(categoria);
        }

        if (marca) {
            paramIndex++;
            query += ` AND p.marca = $${paramIndex}`;
            params.push(marca);
        }

        if (min_precio) {
            paramIndex++;
            query += ` AND p.precio >= $${paramIndex}`;
            params.push(min_precio);
        }

        if (max_precio) {
            paramIndex++;
            query += ` AND p.precio <= $${paramIndex}`;
            params.push(max_precio);
        }

        query += ' GROUP BY p.id';

        const orden = ordenar === 'precio_asc' ? 'p.precio ASC' : 
                      ordenar === 'precio_desc' ? 'p.precio DESC' : 
                      ordenar === 'rating' ? 'calificacion_promedio DESC' : 'p.nombre';
        query += ` ORDER BY ${orden}`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerProducto = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT p.*, COALESCE(AVG(r.calificacion), 0) as calificacion_promedio, COUNT(r.id) as num_reseñas
            FROM productos p LEFT JOIN reseñas r ON p.id = r.producto_id
            WHERE p.id = $1 AND p.activo = TRUE
            GROUP BY p.id
        `, [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Producto no encontrado.' });
            return;
        }

        const reseñas = await pool.query(`
            SELECT r.*, u.nombre as usuario_nombre 
            FROM reseñas r JOIN usuarios u ON r.usuario_id = u.id 
            WHERE r.producto_id = $1 ORDER BY r.creado_en DESC
        `, [id]);

        res.json({ ...result.rows[0], reseñas: reseñas.rows });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const crearProducto = async (req: AuthRequestWithFile, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden crear productos.' });
            return;
        }

        const { nombre, descripcion, precio, categoria, marca, stock } = req.body;

        if (!nombre || !nombre.trim()) {
            res.status(400).json({ mensaje: 'El nombre es requerido.' });
            return;
        }

        const precioNum = Number(precio);
        if (precio === undefined || precio === '' || Number.isNaN(precioNum) || precioNum < 0) {
            res.status(400).json({ mensaje: 'El precio es requerido y debe ser un numero mayor o igual a 0.' });
            return;
        }

        const stockNum = Number(stock);
        if (stock === undefined || stock === '' || Number.isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
            res.status(400).json({ mensaje: 'El stock es requerido y debe ser un numero entero mayor o igual a 0.' });
            return;
        }

        const imagen_url = req.file
            ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
            : (req.body.imagen_url || null);

        const result = await pool.query(
            'INSERT INTO productos (nombre, descripcion, precio, categoria, marca, imagen_url, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [nombre, descripcion, precioNum, categoria, marca, imagen_url, stockNum]
        );

        res.status(201).json({ mensaje: 'Producto creado con exito', producto: result.rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const actualizarProducto = async (req: AuthRequestWithFile, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden actualizar productos.' });
            return;
        }

        const { id } = req.params;
        const { nombre, descripcion, precio, categoria, marca, stock, activo } = req.body;

        const precioNum = (precio === undefined || precio === null || precio === '') ? undefined : Number(precio);
        if (precio !== undefined && precio !== null && precio !== '' && (Number.isNaN(precioNum) || (precioNum as number) < 0)) {
            res.status(400).json({ mensaje: 'El precio debe ser un numero mayor o igual a 0.' });
            return;
        }

        const stockNum = (stock === undefined || stock === null || stock === '') ? undefined : Number(stock);
        if (stock !== undefined && stock !== null && stock !== '' && (Number.isNaN(stockNum) || !Number.isInteger(stockNum) || (stockNum as number) < 0)) {
            res.status(400).json({ mensaje: 'El stock debe ser un numero entero mayor o igual a 0.' });
            return;
        }

        const imagen_url = req.file
            ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
            : (req.body.imagen_url !== undefined ? req.body.imagen_url : undefined);

        const result = await pool.query(
            'UPDATE productos SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion), precio = COALESCE($3, precio), categoria = COALESCE($4, categoria), marca = COALESCE($5, marca), imagen_url = COALESCE($6, imagen_url), stock = COALESCE($7, stock), activo = COALESCE($8, activo) WHERE id = $9 RETURNING *',
            [nombre, descripcion, precioNum, categoria, marca, imagen_url, stockNum, activo, id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Producto no encontrado.' });
            return;
        }

        res.json({ mensaje: 'Producto actualizado con exito', producto: result.rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerCategorias = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT DISTINCT categoria FROM productos WHERE activo = TRUE ORDER BY categoria');
        res.json(result.rows.map(row => row.categoria));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerMarcas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT DISTINCT marca FROM productos WHERE activo = TRUE AND marca IS NOT NULL ORDER BY marca');
        res.json(result.rows.map(row => row.marca));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
