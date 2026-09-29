import { Router } from 'express';
import { listarProductos, obtenerProducto, crearProducto, actualizarProducto, obtenerCategorias, obtenerMarcas } from '../controllers/productos.controller';
import { verificarToken } from '../middleware/auth';
import upload from '../middleware/upload';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), listarProductos);
router.get('/categorias', verificarToken(['admin', 'cliente']), obtenerCategorias);
router.get('/marcas', verificarToken(['admin', 'cliente']), obtenerMarcas);
router.get('/:id', verificarToken(['admin', 'cliente']), obtenerProducto);
router.post('/', verificarToken(['admin']), upload.single('imagen'), crearProducto);
router.put('/:id', verificarToken(['admin']), upload.single('imagen'), actualizarProducto);

export default router;
