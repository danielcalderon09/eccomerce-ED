import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const securityMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { mensaje: 'Demasiadas peticiones, intenta de nuevo en 15 minutos' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { mensaje: 'Demasiados intentos de login, intenta de nuevo en 15 minutos' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const loginSchema = z.object({
    email: z.string().email('Email invalido'),
    password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
});

export const productoSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    descripcion: z.string().optional(),
    precio: z.number().min(0, 'Precio debe ser positivo'),
    categoria: z.string().optional(),
    marca: z.string().optional(),
    imagen_url: z.string().url().optional().or(z.literal('')),
    stock: z.number().int().min(0, 'Stock no puede ser negativo'),
});

export const cuponSchema = z.object({
    codigo: z.string().min(1, 'Codigo requerido'),
    tipo: z.enum(['porcentaje', 'monto_fijo', 'envio_gratis']),
    valor: z.number().min(0),
    minimo_compra: z.number().min(0).default(0),
    usos_maximos: z.number().int().min(1).nullable().default(null),
    fecha_expiracion: z.string().optional(),
});

export const reseñaSchema = z.object({
    producto_id: z.number().int().min(1),
    calificacion: z.number().int().min(1).max(5),
    comentario: z.string().optional(),
});

export const direccionSchema = z.object({
    etiqueta: z.string().default('Casa'),
    direccion: z.string().min(1, 'Direccion requerida'),
    ciudad: z.string().optional(),
    departamento: z.string().optional(),
    codigo_postal: z.string().optional(),
    es_predeterminada: z.boolean().default(false),
});

export function validateSchema(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse(req.body);
            next();
        } catch (error: any) {
            res.status(400).json({ 
                mensaje: 'Datos invalidos', 
                errores: error.errors?.map((e: any) => ({ campo: e.path.join('.'), mensaje: e.message })) 
            });
        }
    };
}
