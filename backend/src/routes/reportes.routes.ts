import { Router } from 'express';
import { obtenerReporteVentas, obtenerTopProductos, obtenerReporteCategorias, obtenerDashboard } from '../controllers/reportes.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/dashboard', verificarToken(['admin']), obtenerDashboard);
router.get('/ventas', verificarToken(['admin']), obtenerReporteVentas);
router.get('/top-productos', verificarToken(['admin']), obtenerTopProductos);
router.get('/categorias', verificarToken(['admin']), obtenerReporteCategorias);

export default router;
