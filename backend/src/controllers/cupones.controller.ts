import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const listarCupones = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            "SELECT * FROM cupones WHERE activo = TRUE AND (usos_maximos IS NULL OR usos_actuales < usos_maximos) AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE) ORDER BY creado_en DESC"
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const crearCupon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden crear cupones.' });
            return;
        }

        const { codigo, tipo, valor, minimo_compra, usos_maximos, fecha_expiracion } = req.body;

        const result = await pool.query(
            'INSERT INTO cupones (codigo, tipo, valor, minimo_compra, usos_maximos, fecha_expiracion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [codigo, tipo, valor, minimo_compra || 0, usos_maximos, fecha_expiracion]
        );

        res.status(201).json({ mensaje: 'Cupon creado con exito', cupon: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({ mensaje: 'El codigo del cupon ya existe.' });
            return;
        }
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const actualizarCupon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden actualizar cupones.' });
            return;
        }

        const { id } = req.params;
        const { codigo, tipo, valor, minimo_compra, usos_maximos, fecha_expiracion, activo } = req.body;

        const result = await pool.query(
            'UPDATE cupones SET codigo = COALESCE($1, codigo), tipo = COALESCE($2, tipo), valor = COALESCE($3, valor), minimo_compra = COALESCE($4, minimo_compra), usos_maximos = COALESCE($5, usos_maximos), fecha_expiracion = COALESCE($6, fecha_expiracion), activo = COALESCE($7, activo) WHERE id = $8 RETURNING *',
            [codigo, tipo, valor, minimo_compra, usos_maximos, fecha_expiracion, activo, id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Cupon no encontrado.' });
            return;
        }

        res.json({ mensaje: 'Cupon actualizado con exito', cupon: result.rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const validarCupon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { codigo, subtotal } = req.body;

        const result = await pool.query(
            "SELECT * FROM cupones WHERE codigo = $1 AND activo = TRUE AND (usos_maximos IS NULL OR usos_actuales < usos_maximos) AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE)",
            [codigo]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Cupon no encontrado o expirado.' });
            return;
        }

        const cupon = result.rows[0];

        if (subtotal < cupon.minimo_compra) {
            res.status(400).json({ mensaje: `Compra minima de $${cupon.minimo_compra} para usar este cupon.` });
            return;
        }

        let descuento = 0;
        if (cupon.tipo === 'porcentaje') {
            descuento = subtotal * (cupon.valor / 100);
        } else if (cupon.tipo === 'monto_fijo') {
            descuento = cupon.valor;
        } else if (cupon.tipo === 'envio_gratis') {
            descuento = 15000;
        }

        const descuentoFinal = Math.min(descuento, subtotal);

        res.json({
            mensaje: 'Cupon valido',
            descuento: descuentoFinal,
            cupon: {
                codigo: cupon.codigo,
                tipo: cupon.tipo,
                descuento: descuentoFinal
            }
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
