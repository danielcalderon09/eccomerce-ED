import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes';
import productosRoutes from './routes/productos.routes';
import carritoRoutes from './routes/carrito.routes';
import pedidosRoutes from './routes/pedidos.routes';
import pagosRoutes from './routes/pagos.routes';
import direccionesRoutes from './routes/direcciones.routes';
import cuponesRoutes from './routes/cupones.routes';
import reseñasRoutes from './routes/reseñas.routes';
import wishlistRoutes from './routes/wishlist.routes';
import inventarioRoutes from './routes/inventario.routes';
import usuariosRoutes from './routes/usuarios.routes';
import reportesRoutes from './routes/reportes.routes';
import { securityMiddleware, apiLimiter, authLimiter } from './middleware/security';
import pool from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(securityMiddleware);
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// app.use(apiLimiter);

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'E-Commerce API',
        version: '2.0.0',
        description: 'API REST para sistema de comercio electronico distribuido',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
    },
    paths: {
        '/api/auth/login': { post: { summary: 'Iniciar sesion', tags: ['Auth'], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { '200': { description: 'Login exitoso' } } } },
        '/api/productos': { get: { summary: 'Listar productos', tags: ['Productos'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Lista de productos' } } } },
        '/api/carrito': { get: { summary: 'Obtener carrito', tags: ['Carrito'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Carrito del usuario' } } } },
        '/api/pedidos/checkout': { post: { summary: 'Crear pedido', tags: ['Pedidos'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Pedido creado' } } } },
        '/api/pagos/procesar': { post: { summary: 'Procesar pago', tags: ['Pagos'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Pago procesado' } } } },
        '/api/direcciones': { get: { summary: 'Listar direcciones', tags: ['Direcciones'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Direcciones del usuario' } } } },
        '/api/cupones': { get: { summary: 'Listar cupones', tags: ['Cupones'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Cupones disponibles' } } } },
        '/api/reseñas': { get: { summary: 'Listar reseñas', tags: ['Reseñas'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Reseñas' } } } },
        '/api/wishlist': { get: { summary: 'Obtener wishlist', tags: ['Wishlist'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Wishlist del usuario' } } } },
        '/api/inventario/estadisticas': { get: { summary: 'Estadisticas inventario', tags: ['Inventario'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Estadisticas' } } } },
        '/api/usuarios': { get: { summary: 'Listar usuarios', tags: ['Usuarios'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Usuarios' } } } },
        '/api/reportes/dashboard': { get: { summary: 'Dashboard admin', tags: ['Reportes'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Dashboard' } } } },
    }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/cupones', cuponesRoutes);
app.use('/api/resenas', reseñasRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/reportes', reportesRoutes);

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'OK', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'disconnected' });
    }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        res.status(400).json({ mensaje: 'JSON invalido en el cuerpo de la peticion.' });
        return;
    }
    console.error('Error no manejado:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor', error: err.message });
});

app.listen(PORT, () => {
    console.log(`Servidor e-commerce corriendo en http://localhost:${PORT}`);
    console.log(`Swagger docs en http://localhost:${PORT}/api-docs`);
});
