import { Router } from 'express';
import { listarCupones, crearCupon, actualizarCupon, validarCupon } from '../controllers/cupones.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), listarCupones);
router.post('/', verificarToken(['admin']), crearCupon);
router.put('/:id', verificarToken(['admin']), actualizarCupon);
router.post('/validar', verificarToken(['admin', 'cliente']), validarCupon);

export default router;
