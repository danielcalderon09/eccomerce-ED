import { Router } from 'express';
import { obtenerWishlist, agregarAWishlist, eliminarDeWishlist, moverACarrito } from '../controllers/wishlist.controller';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/', verificarToken(['admin', 'cliente']), obtenerWishlist);
router.post('/', verificarToken(['admin', 'cliente']), agregarAWishlist);
router.delete('/:id', verificarToken(['admin', 'cliente']), eliminarDeWishlist);
router.post('/mover-carrito', verificarToken(['admin', 'cliente']), moverACarrito);

export default router;
