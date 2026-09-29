import { Router } from 'express';
import { obtenerCarrito, agregarAlCarrito, actualizarCantidad, eliminarDelCarrito, limpiarCarrito, aplicarCupon } from '../controllers/carrito.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), obtenerCarrito);
router.post('/items', verificarToken(['admin', 'cliente']), agregarAlCarrito);
router.put('/items/:id', verificarToken(['admin', 'cliente']), actualizarCantidad);
router.delete('/items/:id', verificarToken(['admin', 'cliente']), eliminarDelCarrito);
router.delete('/', verificarToken(['admin', 'cliente']), limpiarCarrito);
router.post('/cupon', verificarToken(['admin', 'cliente']), aplicarCupon);

export default router;
