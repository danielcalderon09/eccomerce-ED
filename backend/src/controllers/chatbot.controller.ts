import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

// Catálogo base de respaldo si la base de datos está desconectada
const PRODUCTOS_FALLBACK = [
    { id: 1, nombre: 'Laptop Gamer Pro', marca: 'ASUS', categoria: 'Electronica', precio: 4500000, stock: 15, descripcion: 'Laptop gaming con RTX 4060, 16GB RAM, 512GB SSD' },
    { id: 2, nombre: 'Smartphone Ultra', marca: 'Samsung', categoria: 'Electronica', precio: 1800000, stock: 30, descripcion: 'Telefono 5G con pantalla AMOLED 6.7, 128GB' },
    { id: 3, nombre: 'Audífonos Bluetooth', marca: 'Sony', categoria: 'Accesorios', precio: 250000, stock: 50, descripcion: 'Audifonos inalambricos con cancelacion de ruido' },
    { id: 4, nombre: 'Teclado Mecánico RGB', marca: 'Corsair', categoria: 'Accesorios', precio: 180000, stock: 40, descripcion: 'Teclado gaming con switches Cherry MX y RGB' },
    { id: 5, nombre: 'Mouse Inalámbrico', marca: 'Logitech', categoria: 'Accesorios', precio: 120000, stock: 60, descripcion: 'Mouse ergonomico con sensor de alta precision' },
    { id: 6, nombre: 'Monitor 27 4K', marca: 'LG', categoria: 'Electronica', precio: 1200000, stock: 20, descripcion: 'Monitor 4K IPS con HDR y 144Hz' },
    { id: 7, nombre: 'Camiseta Premium', marca: 'Nike', categoria: 'Ropa', precio: 45000, stock: 100, descripcion: 'Camiseta algodon 100%, varios colores' },
    { id: 8, nombre: 'Zapatillas Running', marca: 'Adidas', categoria: 'Ropa', precio: 320000, stock: 45, descripcion: 'Zapatillas deportivas con amortiguacion' },
    { id: 9, nombre: 'Mochila Urbana', marca: 'Samsonite', categoria: 'Accesorios', precio: 89000, stock: 35, descripcion: 'Mochila resistente al agua con puerto USB' },
    { id: 10, nombre: 'Smartwatch Fitness', marca: 'Garmin', categoria: 'Electronica', precio: 450000, stock: 25, descripcion: 'Reloj inteligente con monitor cardiaco y GPS' }
];

const CUPONES_FALLBACK = [
    { codigo: 'BIENVENIDO10', tipo: 'porcentaje', valor: 10, minimo_compra: 100000, descripcion: '10% de descuento en compras > $100.000' },
    { codigo: 'ENVIOGRATIS', tipo: 'envio_gratis', valor: 0, minimo_compra: 200000, descripcion: 'Envío gratis en compras > $200.000' },
    { codigo: 'DESCUENTO50K', tipo: 'monto_fijo', valor: 50000, minimo_compra: 300000, descripcion: '$50.000 de descuento en compras > $300.000' }
];

/**
 * Normaliza el texto removiendo signos de puntuación, mayúsculas y tildes.
 * Basado en la lógica de 'chat.ipynb'.
 */
function limpiarTexto(texto: string): string {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quita tildes
        .replace(/[^\w\s]/gi, '') // Quita signos de puntuación y símbolos
        .trim();
}

function formatearMoneda(valor: number): string {
    return '$' + Math.round(valor).toLocaleString('es-CO');
}

/**
 * Controlador para procesar los mensajes enviados al Chatbot.
 */
export const procesarMensaje = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { mensaje } = req.body;
        const usuarioId = req.usuario_id;

        if (!mensaje || !mensaje.trim()) {
            res.json({
                respuesta: 'Por favor escribe tu consulta sobre nuestros productos, pedidos, cupones o formas de pago.',
                intencion: 'vacio',
                sugerencias: ['Ver productos', 'Consultar pedido', 'Cupones disponibles', 'Formas de pago']
            });
            return;
        }

        const mensajeOriginal = mensaje.trim();
        const textoLimpio = limpiarTexto(mensajeOriginal);

        // 1. Saludo detectado
        const tieneSaludo = ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'saludos']
            .some(s => textoLimpio.includes(s));
        const prefijoSaludo = tieneSaludo ? '¡Hola! ' : '';

        // 2. Extraer número de pedido si viene en el texto
        const matchPedido = mensajeOriginal.match(/(?:pedido|orden|guia|factura|#)\s*#?\s*(\d+)/i) || (mensajeOriginal.trim().match(/^\d+$/) ? [null, mensajeOriginal.trim()] : null);
        const numeroPedido = matchPedido ? parseInt(matchPedido[1], 10) : null;

        // ---------------------------------------------------------------------
        // INTENCIÓN 1: Despedida
        // ---------------------------------------------------------------------
        const palabrasDespedida = ['salir', 'chao', 'adios', 'bye', 'hasta luego', 'nos vemos'];
        if (palabrasDespedida.some(p => textoLimpio.split(/\s+/).includes(p))) {
            res.json({
                respuesta: '¡Muchas gracias por visitarnos! Si necesitas algo más, aquí estaré. ¡Que tengas un excelente día!',
                intencion: 'despedida',
                sugerencias: ['Volver a saludar', 'Ver catálogo']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 2: Cupones y Promociones
        // ---------------------------------------------------------------------
        if (['cupon', 'cupones', 'descuento', 'promocion', 'oferta', 'codigo promocional', 'rebaja'].some(p => textoLimpio.includes(p))) {
            let cupones = CUPONES_FALLBACK;
            try {
                const dbCupones = await pool.query(
                    'SELECT codigo, tipo, valor, minimo_compra FROM cupones WHERE activo = TRUE AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE)'
                );
                if (dbCupones.rows.length > 0) {
                    cupones = dbCupones.rows.map(c => ({
                        codigo: c.codigo,
                        tipo: c.tipo,
                        valor: Number(c.valor),
                        minimo_compra: Number(c.minimo_compra),
                        descripcion: c.tipo === 'porcentaje'
                            ? `${c.valor}% de descuento en compras > ${formatearMoneda(Number(c.minimo_compra))}`
                            : c.tipo === 'envio_gratis'
                            ? `Envío gratis en compras > ${formatearMoneda(Number(c.minimo_compra))}`
                            : `${formatearMoneda(Number(c.valor))} de descuento en compras > ${formatearMoneda(Number(c.minimo_compra))}`
                    }));
                }
            } catch {
                // Utiliza fallback si falla la conexión
            }

            let resp = `${prefijoSaludo}¡Aprovecha nuestros cupones de descuento activos!:\n\n`;
            cupones.forEach(c => {
                resp += `🏷️ **${c.codigo}**: ${c.descripcion}\n`;
            });
            resp += '\nPuedes aplicarlos al momento de confirmar tu pedido en el carrito de compras.';

            res.json({
                respuesta: resp,
                intencion: 'cupones',
                cupones,
                sugerencias: ['¿Cómo pagar?', 'Ver productos', 'Rastrear pedido']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 3: Formas de Pago
        // ---------------------------------------------------------------------
        if (['pago', 'pagar', 'tarjeta', 'efectivo', 'transferencia', 'medios de pago', 'pse', 'credito', 'debito'].some(p => textoLimpio.includes(p))) {
            res.json({
                respuesta: `${prefijoSaludo}En nuestra tienda contamos con los siguientes medios de pago seguros:\n\n` +
                    '💳 **Tarjetas de Crédito y Débito**: Visa, MasterCard y American Express.\n' +
                    '🏦 **Transferencia Bancaria y PSE**: Pago instantáneo en línea.\n' +
                    '💵 **Pago Contra Entrega**: Disponible según tu ciudad de residencia.\n\n' +
                    'Todas las transacciones están protegidas y se validan en tiempo real.',
                intencion: 'formas_pago',
                sugerencias: ['¿Qué productos tienen?', '¿Tienen cupones?', 'Hablar con un asesor']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 4: Consultar Pedido / Rastreo
        // ---------------------------------------------------------------------
        if (['pedido', 'rastreo', 'compras', 'mi envio', 'donde esta', 'guia', 'estado de mi'].some(p => textoLimpio.includes(p)) || numeroPedido !== null) {
            if (numeroPedido) {
                try {
                    const query = usuarioId
                        ? 'SELECT id, estado, total, direccion_envio, metodo_pago, creado_en FROM pedidos WHERE id = $1 AND usuario_id = $2'
                        : 'SELECT id, estado, total, direccion_envio, metodo_pago, creado_en FROM pedidos WHERE id = $1';
                    const params = usuarioId ? [numeroPedido, usuarioId] : [numeroPedido];
                    const pedidoDb = await pool.query(query, params);

                    if (pedidoDb.rows.length > 0) {
                        const p = pedidoDb.rows[0];
                        const estadosMap: Record<string, string> = {
                            pendiente_pago: 'Pendiente de pago (esperando confirmación)',
                            pagado: 'Pago confirmado (en preparación en bodega)',
                            enviado: 'En tránsito con la transportadora hacia tu dirección',
                            entregado: 'Entregado con éxito',
                            cancelado: 'Cancelado'
                        };
                        const detalleEstado = estadosMap[p.estado] || p.estado;

                        res.json({
                            respuesta: `${prefijoSaludo}Información del **Pedido #${p.id}**:\n\n` +
                                `• **Estado actual**: ${detalleEstado}\n` +
                                `• **Total**: ${formatearMoneda(Number(p.total))}\n` +
                                `• **Método de pago**: ${p.metodo_pago || 'No especificado'}\n` +
                                `• **Dirección de entrega**: ${p.direccion_envio || 'En registro'}\n` +
                                `• **Fecha**: ${new Date(p.creado_en).toLocaleDateString('es-CO')}\n\n` +
                                'Puedes ver más detalles en la pestaña "Mis Pedidos".',
                            intencion: 'rastreo_pedido_especifico',
                            pedidos: [p],
                            sugerencias: ['Ver productos', 'Políticas de garantía', 'Hablar con un asesor']
                        });
                        return;
                    }
                } catch {
                    // Fallback a respuesta simulada amigable
                }

                res.json({
                    respuesta: `${prefijoSaludo}Estado del **Pedido #${numeroPedido}**:\n\n` +
                        `• **Estado**: En proceso / Verificación\n` +
                        `• **Detalle**: El pedido #${numeroPedido} está registrado en nuestra plataforma. Si no ves actualizaciones recientes, revisa tu sección de 'Mis Pedidos' o consulta con un asesor.`,
                    intencion: 'rastreo_pedido_especifico',
                    sugerencias: ['Ver mis pedidos', 'Hablar con un asesor']
                });
                return;
            } else if (usuarioId) {
                // Usuario autenticado que pregunta de forma genérica por sus pedidos
                try {
                    const ultimosPedidos = await pool.query(
                        'SELECT id, estado, total, creado_en FROM pedidos WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 3',
                        [usuarioId]
                    );
                    if (ultimosPedidos.rows.length > 0) {
                        let resp = `${prefijoSaludo}Estos son tus pedidos más recientes:\n\n`;
                        ultimosPedidos.rows.forEach(p => {
                            resp += `📦 **Pedido #${p.id}**: Estado: ${p.estado} | Total: ${formatearMoneda(Number(p.total))}\n`;
                        });
                        resp += '\nEscribe el número de pedido (ej: "pedido 1") para ver más detalles.';

                        res.json({
                            respuesta: resp,
                            intencion: 'lista_pedidos_usuario',
                            pedidos: ultimosPedidos.rows,
                            sugerencias: ultimosPedidos.rows.map(p => `Rastrear pedido #${p.id}`)
                        });
                        return;
                    }
                } catch {
                    // Continuar al mensaje estándar
                }
            }

            res.json({
                respuesta: `${prefijoSaludo}Para rastrear tu pedido, por favor indícame el **número de orden o pedido**.\n\n` +
                    'Por ejemplo: *"¿Dónde está mi pedido #2?"* o simplemente escribe *"pedido 2"*.\n' +
                    'También puedes ver el listado completo en el menú **Mis Pedidos**.',
                intencion: 'consulta_pedido',
                sugerencias: ['Ver mis pedidos', 'Formas de pago', 'Hablar con un asesor']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 5: Garantía y Devoluciones
        // ---------------------------------------------------------------------
        if (['garantia', 'dano', 'defectuoso', 'reparacion', 'soporte tecnico', 'devolucion', 'cambio'].some(p => textoLimpio.includes(p))) {
            res.json({
                respuesta: `${prefijoSaludo}Nuestras políticas de Garantía y Devoluciones:\n\n` +
                    '🛡️ **12 Meses de Garantía**: Cubre cualquier falla de fábrica en todos los productos de tecnología y accesorios.\n' +
                    '🔄 **30 Días de Cambios y Devoluciones**: Puedes solicitar cambio sin costo si el producto no cumple tus expectativas.\n' +
                    '📄 Para hacerla válida solo requieres tu número de pedido o factura de compra.',
                intencion: 'garantia',
                sugerencias: ['Hablar con un asesor', 'Ver productos', 'Rastrear pedido']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 6: Solicitar Asesor Humano / Contacto
        // ---------------------------------------------------------------------
        if (['asesor', 'humano', 'persona', 'agente', 'representante', 'contacto', 'telefono', 'whatsapp', 'correo'].some(p => textoLimpio.includes(p))) {
            res.json({
                respuesta: `${prefijoSaludo}¡Con gusto te comunicamos con nuestro equipo de atención humana!\n\n` +
                    '📱 **WhatsApp / Teléfono**: (+57) 300 123 4567\n' +
                    '✉️ **Correo**: soporte@tienda.com\n' +
                    '⏰ **Horario**: Lunes a Sábado de 8:00 AM a 6:00 PM\n\n' +
                    'Un agente te atenderá en breve para brindarte asistencia personalizada.',
                intencion: 'solicitar_asesor',
                sugerencias: ['Ver productos', 'Consultar formas de pago', 'Ver cupones']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 7: Búsqueda de Producto Específico
        // ---------------------------------------------------------------------
        let productosList = PRODUCTOS_FALLBACK;
        try {
            const dbProds = await pool.query('SELECT id, nombre, marca, categoria, precio, stock, descripcion FROM productos WHERE activo = TRUE');
            if (dbProds.rows.length > 0) {
                productosList = dbProds.rows.map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    marca: p.marca,
                    categoria: p.categoria,
                    precio: Number(p.precio),
                    stock: Number(p.stock),
                    descripcion: p.descripcion
                }));
            }
        } catch {
            // Continúa con fallback
        }

        // Buscar si el mensaje coincide con un producto
        const productoEncontrado = productosList.find(p => {
            const nombreLimpio = limpiarTexto(p.nombre);
            const marcaLimpia = limpiarTexto(p.marca || '');
            const categoriaLimpia = limpiarTexto(p.categoria || '');
            
            // Si el nombre completo está en el mensaje
            if (textoLimpio.includes(nombreLimpio)) return true;

            // Palabras clave principales (laptop, celular, smartphone, audifonos, teclado, mouse, monitor, etc.)
            const palabrasClave = nombreLimpio.split(/\s+/).filter(w => w.length > 3 && !['para', 'gamer', 'con'].includes(w));
            if (palabrasClave.some(w => new RegExp(`\\b${w}\\b`).test(textoLimpio))) return true;

            return false;
        });

        if (productoEncontrado) {
            const stockMsg = productoEncontrado.stock > 0
                ? `✅ **Stock disponible**: ${productoEncontrado.stock} unidades para entrega inmediata.`
                : '❌ **Actualmente agotado**.';

            res.json({
                respuesta: `${prefijoSaludo}Información de **${productoEncontrado.nombre}**:\n\n` +
                    `• **Marca**: ${productoEncontrado.marca} | **Categoría**: ${productoEncontrado.categoria}\n` +
                    `• **Precio**: **${formatearMoneda(productoEncontrado.precio)}**\n` +
                    `• ${stockMsg}\n` +
                    `• **Descripción**: ${productoEncontrado.descripcion || 'Sin descripción adicional'}\n\n` +
                    '¿Deseas agregarlo a tu carrito o consultar otro producto?',
                intencion: 'producto_especifico',
                productos: [productoEncontrado],
                sugerencias: ['Ver más productos', '¿Qué cupones hay?', 'Formas de pago']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 8: Saludo Único
        // ---------------------------------------------------------------------
        if (tieneSaludo) {
            res.json({
                respuesta: '¡Hola! Bienvenido a nuestra tienda en línea.\n\n' +
                    '¿En qué puedo colaborarte hoy? Puedes consultarme sobre:\n' +
                    '• **Catálogo y Precios**: *"¿cuánto vale la laptop?"*\n' +
                    '• **Inventario**: *"¿hay stock de mouse?"*\n' +
                    '• **Rastreo de Pedidos**: *"rastrear pedido #2"*\n' +
                    '• **Cupones de Descuento** y **Medios de Pago**\n' +
                    '• **Garantías** o **Hablar con un asesor**.',
                intencion: 'saludo',
                sugerencias: ['Ver productos', 'Cupones disponibles', 'Medios de pago', 'Rastrear pedido']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 9: Disponibilidad / Inventario General
        // ---------------------------------------------------------------------
        if (['disponible', 'disponibilidad', 'inventario', 'stock', 'hay'].some(p => textoLimpio.includes(p))) {
            const disponibles = productosList.filter(p => p.stock > 0);
            let resp = `${prefijoSaludo}Contamos con inventario disponible en ${disponibles.length} productos:\n\n`;
            disponibles.slice(0, 5).forEach(p => {
                resp += `• **${p.nombre}**: ${p.stock} unidades (${formatearMoneda(p.precio)})\n`;
            });
            resp += '\nEscribe el nombre de algún producto para conocer más detalles (ej: *"¿hay stock de audífonos?"*).';

            res.json({
                respuesta: resp,
                intencion: 'disponibilidad',
                productos: disponibles,
                sugerencias: ['¿Cuánto cuesta el smartwatch?', '¿Cuánto cuesta la laptop?', 'Ver cupones']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // INTENCIÓN 10: Consulta General de Precios o Catálogo
        // ---------------------------------------------------------------------
        if (['precio', 'cuesta', 'vale', 'valor', 'cuanto', 'catalogo', 'productos', 'que venden', 'que tienen'].some(p => textoLimpio.includes(p))) {
            let resp = `${prefijoSaludo}Estos son algunos de los productos destacados en nuestra tienda:\n\n`;
            productosList.slice(0, 6).forEach(p => {
                resp += `• **${p.nombre}** (${p.marca}): **${formatearMoneda(p.precio)}** - Stock: ${p.stock}\n`;
            });
            resp += '\nPuedes preguntarme por cualquiera de ellos (ej: *"precio de la laptop"* o *"cuánto cuesta el monitor"*).';

            res.json({
                respuesta: resp,
                intencion: 'catalogo_precios',
                productos: productosList,
                sugerencias: ['Laptop Gamer', 'Smartphone Ultra', 'Audífonos Bluetooth', 'Cupones']
            });
            return;
        }

        // ---------------------------------------------------------------------
        // Fallback: Consulta no reconocida
        // ---------------------------------------------------------------------
        res.json({
            respuesta: 'Disculpa, no logré comprender tu consulta. Puedes preguntarme por:\n\n' +
                '• **Productos y precios**: *"¿Cuánto cuesta el smartphone?"*\n' +
                '• **Disponibilidad**: *"¿Tienen stock de zapatillas?"*\n' +
                '• **Pedidos**: *"Rastrear pedido #1"*\n' +
                '• **Cupones**: *"¿Cuáles son los descuentos activos?"*\n' +
                '• **Medios de pago** o escribe *"asesor"* para comunicarte con una persona.',
            intencion: 'desconocida',
            sugerencias: ['Ver productos', 'Cupones de descuento', 'Formas de pago', 'Hablar con un asesor']
        });
    } catch (error: any) {
        console.error('Error en procesarMensaje del Chatbot:', error);
        res.status(500).json({
            mensaje: 'Error interno al procesar el mensaje en el chatbot',
            error: error?.message || 'Error desconocido'
        });
    }
};

/**
 * Endpoint para obtener sugerencias iniciales de preguntas frecuentes.
 */
export const obtenerSugerencias = (_req: AuthRequest, res: Response): void => {
    res.json({
        bienvenida: '¡Hola! Soy tu asistente virtual de la tienda. ¿En qué puedo colaborarte hoy?',
        preguntas_frecuentes: [
            { texto: '¿Qué productos tienen en catálogo?', intencion: 'catalogo' },
            { texto: '¿Cuáles son los métodos de pago?', intencion: 'pagos' },
            { texto: '¿Tienen cupones de descuento?', intencion: 'cupones' },
            { texto: '¿Cómo puedo rastrear mi pedido?', intencion: 'pedidos' },
            { texto: '¿Qué garantía tienen los productos?', intencion: 'garantia' },
            { texto: 'Quiero hablar con un asesor', intencion: 'asesor' }
        ]
    });
};
