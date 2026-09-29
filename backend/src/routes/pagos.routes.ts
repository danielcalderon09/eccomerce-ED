import { Router } from 'express';
import { procesarPago, listarPagos } from '../controllers/pagos.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), listarPagos);
router.post('/procesar', verificarToken(['admin', 'cliente']), procesarPago);

export default router;
