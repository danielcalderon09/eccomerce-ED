import { Router } from 'express';
import { listarMovimientos, ajustarInventario, obtenerAlertasStock, obtenerEstadisticasInventario } from '../controllers/inventario.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/movimientos', verificarToken(['admin']), listarMovimientos);
router.post('/ajustar', verificarToken(['admin']), ajustarInventario);
router.get('/alertas', verificarToken(['admin']), obtenerAlertasStock);
router.get('/estadisticas', verificarToken(['admin']), obtenerEstadisticasInventario);

export default router;
