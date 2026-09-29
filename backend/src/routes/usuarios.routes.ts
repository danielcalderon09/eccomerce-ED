import { Router } from 'express';
import { listarUsuarios, obtenerUsuario, actualizarUsuario, eliminarUsuario } from '../controllers/usuarios.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin']), listarUsuarios);
router.get('/:id', verificarToken(['admin']), obtenerUsuario);
router.put('/:id', verificarToken(['admin']), actualizarUsuario);
router.delete('/:id', verificarToken(['admin']), eliminarUsuario);

export default router;
