import { Router } from 'express';
import { listarDirecciones, crearDireccion, actualizarDireccion, eliminarDireccion } from '../controllers/direcciones.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), listarDirecciones);
router.post('/', verificarToken(['admin', 'cliente']), crearDireccion);
router.put('/:id', verificarToken(['admin', 'cliente']), actualizarDireccion);
router.delete('/:id', verificarToken(['admin', 'cliente']), eliminarDireccion);

export default router;
