import { Router } from 'express';
import { listarNotificaciones, marcarComoLeida, marcarTodasLeidas, obtenerEstadisticas } from '../controllers/notificaciones.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), listarNotificaciones);
router.put('/:id/leida', verificarToken(['admin', 'cliente']), marcarComoLeida);
router.put('/leidas', verificarToken(['admin', 'cliente']), marcarTodasLeidas);
router.get('/admin/estadisticas', verificarToken(['admin']), obtenerEstadisticas);

export default router;
