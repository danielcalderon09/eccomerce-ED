import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ mensaje: 'Email y password son requeridos.' });
            return;
        }

        const result = await pool.query(
            'SELECT id, nombre, email, password_hash, rol, telefono FROM usuarios WHERE email = $1 AND activo = TRUE',
            [email]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ mensaje: 'Credenciales invalidas.' });
            return;
        }

        const usuario = result.rows[0];
        const passwordValido = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValido) {
            res.status(401).json({ mensaje: 'Credenciales invalidas.' });
            return;
        }

        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET || 'FirmaSecretaInstitucional2026',
            { expiresIn: '8h' }
        );

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                telefono: usuario.telefono
            }
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const registrarUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { nombre, email, password, rol, direccion, telefono } = req.body;

        if (!nombre || !email || !password) {
            res.status(400).json({ mensaje: 'Nombre, email y password son requeridos.' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ mensaje: 'El password debe tener minimo 6 caracteres.' });
            return;
        }

        if (req.rol && req.rol !== 'admin') {
            res.status(403).json({ mensaje: 'Solo administradores pueden registrar usuarios con roles personalizados.' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);
        const rolFinal = (req.rol === 'admin' && rol) ? rol : 'cliente';

        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol',
            [nombre, email, password_hash, rolFinal, telefono]
        );

        res.status(201).json({ mensaje: 'Usuario registrado con exito', usuario: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({ mensaje: 'El email ya esta registrado.' });
            return;
        }
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};

export const obtenerPerfil = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, email, rol, telefono FROM usuarios WHERE id = $1',
            [req.usuario_id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: 'Usuario no encontrado.' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno del servidor', error });
    }
};
