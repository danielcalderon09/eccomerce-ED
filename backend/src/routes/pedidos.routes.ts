import { Router } from 'express';
import { crearPedido, listarPedidos, obtenerPedido, actualizarEstadoPedido } from '../controllers/pedidos.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), listarPedidos);
router.get('/:id', verificarToken(['admin', 'cliente']), obtenerPedido);
router.post('/checkout', verificarToken(['admin', 'cliente']), crearPedido);
router.put('/:id/estado', verificarToken(['admin']), actualizarEstadoPedido);

export default router;
