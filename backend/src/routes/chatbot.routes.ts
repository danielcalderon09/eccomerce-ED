import { Router } from 'express';
import { procesarMensaje, obtenerSugerencias } from '../controllers/chatbot.controller';
import { tokenOpcional } from '../middleware/auth';

const router = Router();

// Endpoint para enviar mensaje al chatbot (soporta tanto usuarios autenticados como invitados)
router.post('/mensaje', tokenOpcional, procesarMensaje);

// Endpoint para obtener sugerencias iniciales y preguntas frecuentes
router.get('/sugerencias', obtenerSugerencias);

export default router;
