import { Router } from 'express';
import { listarReseñas, crearReseña, actualizarReseña, eliminarReseña } from '../controllers/reseñas.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), listarReseñas);
router.post('/', verificarToken(['admin', 'cliente']), crearReseña);
router.put('/:id', verificarToken(['admin', 'cliente']), actualizarReseña);
router.delete('/:id', verificarToken(['admin', 'cliente']), eliminarReseña);

export default router;
