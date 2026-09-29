import { Router } from 'express';
import { login, registrarUsuario, obtenerPerfil } from '../controllers/auth.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/registro', registrarUsuario);
router.get('/perfil', verificarToken(['admin', 'cliente']), obtenerPerfil);

export default router;
