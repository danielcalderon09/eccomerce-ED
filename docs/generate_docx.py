from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)

def add_title(text, level=0):
    if level == 0:
        heading = doc.add_heading(text, level=0)
        heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    else:
        doc.add_heading(text, level=level)

def add_para(text, bold=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    return p

def add_table(headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Light Grid Accent 1'
    hdr_cells = table.rows[0].cells
    for i, header in enumerate(headers):
        hdr_cells[i].text = header
        for paragraph in hdr_cells[i].paragraphs:
            for run in paragraph.runs:
                run.bold = True
    for row_data in rows:
        row_cells = table.add_row().cells
        for i, cell_text in enumerate(row_data):
            row_cells[i].text = str(cell_text)
    doc.add_paragraph()

add_title('INFORME DEL LABORATORIO')
add_title('SISTEMA DE COMERCIO ELECTRONICO DISTRIBUIDO', 1)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Laboratorio Modulo 2 - Sistemas Distribuidos')
run.font.size = Pt(14)
run.font.color.rgb = RGBColor(0x4F, 0x81, 0xBD)

doc.add_paragraph()
add_para('Estudiante: Daniel Calderon')
add_para('Fecha: Septiembre 2026')
add_para('Materia: Electiva de Desarrollo')
doc.add_page_break()

add_title('1. INTRODUCCION', 1)
doc.add_paragraph('El presente informe describe el diseno e implementacion de un sistema de comercio electronico basado en arquitectura distribuida. Este laboratorio aplica los conceptos fundamentales de sistemas distribuidos aprendidos en el taller de comercio electronico, implementando un sistema completo con backend, frontend web, app movil y base de datos PostgreSQL.')

add_title('2. MAPEO CONCEPTUAL: TALLER E-COMMERCE vs IMPLEMENTACION', 1)
add_table(
    ['Componente del Taller', 'Implementacion Realizada'],
    [
        ['Cliente Web/Movil', 'Frontend Web (React + Tailwind) + App Movil (Flutter)'],
        ['API Gateway', 'Backend Node.js + Express (punto unico de entrada)'],
        ['Servicio de Autenticacion', 'JWT + bcrypt + RBAC (cliente/admin)'],
        ['Servicio de Clientes', 'CRUD usuarios con gestion de direcciones'],
        ['Servicio de Productos', 'CRUD productos con busqueda full-text, filtros, categorias, marcas'],
        ['Servicio de Carrito', 'Carrito persistente con validacion de stock y cupones'],
        ['Servicio de Inventario', 'Stock fisico + reservado, movimientos, alertas, ajustes'],
        ['Servicio de Pedidos', 'Checkout con transaccion ACID, reserva de inventario'],
        ['Servicio de Pagos', 'Simulacion de pasarela (80% aprobado, 20% rechazado)'],
        ['Pasarela de Pagos', 'Mock con respuesta aleatoria y transaccion ID unico'],
        ['Servicio de Notificaciones', 'No implementado (excluido del alcance)'],
        ['Base de Datos', 'PostgreSQL en Neon con particionamiento logico'],
        ['Multi-tenancy', 'Aislamiento por rol (cliente/admin) en cada consulta'],
        ['JWT Stateless', 'Tokens JWT sin sesion en servidor, expiracion 8h'],
        ['Escalabilidad Horizontal', 'Backend apatrida, puede escalar tras balanceador'],
        ['Tolerancia a Fallos', 'Transacciones ACID, rollback automatico, reserva/liberacion inventario'],
    ]
)

add_title('3. ARQUITECTURA DEL SISTEMA', 1)
add_title('3.1 Diagrama de Componentes', 2)
diagram = """
+-------------------------------------------------------------+
|                      CLIENTES                                |
|  +--------------+         +--------------+                   |
|  |  Frontend    |         |  App Movil   |                   |
|  |  Web (React) |         |  (Flutter)   |                   |
|  +------+-------+         +------+-------+                   |
|         |                        |                            |
+---------+------------------------+----------------------------+
          |                        |
          +--------+---------------+
                   |
          +--------v--------+
          |   API RESTful   |
          |  (Node.js + TS) |
          |  Puerto: 3000   |
          +--------+--------+
                   |
    +--------------+--------------+
    |              |              |
+---v---+    +----v----+   +----v----+
| Auth  |    |Productos|   | Carrito |
+---+---+    +----+----+   +----+----+
    |              |              |
+---v---+    +----v----+   +----v----+
|Pedidos|    | Pagos   |   |Inventario|
+---+---+    +----+----+   +----+----+
    |              |              |
    +--------------+--------------+
                   |
          +--------v--------+
          |  PostgreSQL     |
          |  (Neon)         |
          +-----------------+
"""
p = doc.add_paragraph()
run = p.add_run(diagram)
run.font.name = 'Consolas'
run.font.size = Pt(8)

add_title('3.2 Grupos de Procesos', 2)
doc.add_paragraph('Siguiendo el modelo del taller de e-commerce, el sistema se organiza en tres grupos:')

doc.add_paragraph('Procesos Estrategicos (Control):', style='List Bullet')
doc.add_paragraph('Servicio de Autenticacion (login, registro, validacion de tokens)', style='List Bullet 2')
doc.add_paragraph('Servicio de Autorizacion (RBAC, validacion de rol)', style='List Bullet 2')
doc.add_paragraph('Gestion de Sesiones (tokens JWT stateless)', style='List Bullet 2')

doc.add_paragraph('Procesos Misionales (Operacionales):', style='List Bullet')
doc.add_paragraph('Servicio de Productos (catalogo, busqueda, filtros)', style='List Bullet 2')
doc.add_paragraph('Servicio de Carrito (gestion de items, cupones)', style='List Bullet 2')
doc.add_paragraph('Servicio de Pedidos (checkout, estados)', style='List Bullet 2')
doc.add_paragraph('Servicio de Pagos (procesamiento, transacciones)', style='List Bullet 2')
doc.add_paragraph('Servicio de Inventario (stock, reservas, ajustes)', style='List Bullet 2')

doc.add_paragraph('Procesos de Apoyo:', style='List Bullet')
doc.add_paragraph('Servicio de Persistencia (conexion a PostgreSQL/Neon)', style='List Bullet 2')
doc.add_paragraph('Servicio de Reseñas (calificaciones de productos)', style='List Bullet 2')
doc.add_paragraph('Servicio de Wishlist (lista de deseos)', style='List Bullet 2')
doc.add_paragraph('Servicio de Direcciones (gestion de envios)', style='List Bullet 2')
doc.add_paragraph('Servicio de Reportes (dashboard, estadisticas)', style='List Bullet 2')

add_title('4. ACTORES Y PERMISOS', 1)
add_title('4.1 Actores del Sistema', 2)
add_table(
    ['Actor', 'Descripcion', 'Permisos'],
    [
        ['Administrador', 'Personal administrativo de la tienda', 'Gestion completa: productos, pedidos, usuarios, inventario, cupones, reportes'],
        ['Cliente', 'Usuario que compra productos', 'Ver catalogo, carrito, wishlist, crear pedidos, pagar, dejar reseñas, gestionar direcciones'],
    ]
)

add_title('4.2 Matriz de Permisos por Endpoint', 2)
add_table(
    ['Endpoint', 'Admin', 'Cliente'],
    [
        ['POST /api/auth/login', 'Si', 'Si'],
        ['GET /api/productos', 'Si', 'Si'],
        ['POST /api/productos', 'Si', 'No'],
        ['GET /api/carrito', 'Si', 'Si'],
        ['POST /api/carrito/items', 'Si', 'Si'],
        ['POST /api/pedidos/checkout', 'Si', 'Si'],
        ['POST /api/pagos/procesar', 'Si', 'Si'],
        ['GET /api/inventario/estadisticas', 'Si', 'No'],
        ['POST /api/inventario/ajustar', 'Si', 'No'],
        ['GET /api/usuarios', 'Si', 'No'],
        ['GET /api/reportes/dashboard', 'Si', 'No'],
        ['GET /api/reseñas', 'Si', 'Si'],
        ['POST /api/reseñas', 'Si', 'Si'],
        ['GET /api/wishlist', 'Si', 'Si'],
        ['GET /api/direcciones', 'Si', 'Si'],
        ['GET /api/cupones', 'Si', 'Si'],
        ['POST /api/cupones', 'Si', 'No'],
    ]
)

add_title('5. COMPONENTES Y RESPONSABILIDADES', 1)
add_title('5.1 Backend (Node.js + Express + TypeScript)', 2)
doc.add_paragraph('Responsabilidades:', style='List Bullet')
doc.add_paragraph('Exponer API RESTful para clientes web y movil', style='List Bullet 2')
doc.add_paragraph('Validar tokens JWT y verificar permisos RBAC', style='List Bullet 2')
doc.add_paragraph('Gestionar transacciones ACID para pedidos y pagos', style='List Bullet 2')
doc.add_paragraph('Manejar reservas y liberacion de inventario', style='List Bullet 2')
doc.add_paragraph('Proteger endpoints con rate limiting y helmet', style='List Bullet 2')
doc.add_paragraph('Validar inputs con Zod', style='List Bullet 2')

add_title('5.2 Frontend Web (React + Vite + Tailwind)', 2)
doc.add_paragraph('Responsabilidades:', style='List Bullet')
doc.add_paragraph('Interfaz de tienda con catalogo, filtros y busqueda', style='List Bullet 2')
doc.add_paragraph('Carrito de compras con cupones', style='List Bullet 2')
doc.add_paragraph('Checkout completo con seleccion de direccion', style='List Bullet 2')
doc.add_paragraph('Wishlist y reseñas de productos', style='List Bullet 2')
doc.add_paragraph('Panel admin con dashboard, reportes y gestion', style='List Bullet 2')

add_title('5.3 App Movil (Flutter)', 2)
doc.add_paragraph('Responsabilidades:', style='List Bullet')
doc.add_paragraph('Interfaz nativa para dispositivos moviles', style='List Bullet 2')
doc.add_paragraph('Consulta de catalogo y carrito', style='List Bullet 2')
doc.add_paragraph('Consumo de API RESTful', style='List Bullet 2')

add_title('5.4 Base de Datos (PostgreSQL en Neon)', 2)
doc.add_paragraph('Responsabilidades:', style='List Bullet')
doc.add_paragraph('Almacenamiento persistente de datos', style='List Bullet 2')
doc.add_paragraph('Busqueda full-text con tsvector', style='List Bullet 2')
doc.add_paragraph('Integridad referencial mediante foreign keys', style='List Bullet 2')
doc.add_paragraph('Indices para optimizacion de consultas', style='List Bullet 2')

add_title('6. FLUJO PRINCIPAL: PROCESO DE COMPRA', 1)
add_title('6.1 Flujo Completo de Compra', 2)
steps = [
    'Cliente navega el catalogo de productos',
    'Aplica filtros (categoria, marca, precio) y busqueda full-text',
    'Agrega productos al carrito o wishlist',
    'Revisa el carrito y aplica cupon de descuento (opcional)',
    'Selecciona direccion de envio',
    'Inicia checkout: POST /api/pedidos/checkout',
    'Backend valida stock disponible (stock - stock_reservado)',
    'Backend reserva inventario (stock_reservado += cantidad)',
    'Backend crea pedido con estado pendiente_pago',
    'Cliente paga: POST /api/pagos/procesar',
    'Simulacion de pasarela: 80% aprobado, 20% rechazado',
    'Si aprobado: stock -= cantidad, stock_reservado -= cantidad, estado = pagado',
    'Si rechazado: stock_reservado -= cantidad, estado = cancelado',
    'Admin puede cambiar estado a enviado/entregado',
    'Cliente puede dejar reseña del producto',
]
for i, step in enumerate(steps, 1):
    doc.add_paragraph(f'{i}. {step}')

add_title('7. SEGURIDAD IMPLEMENTADA', 1)
add_title('7.1 Autenticacion', 2)
doc.add_paragraph('Algoritmo: bcrypt con 10 rondas de hasheo', style='List Bullet')
doc.add_paragraph('Tokens: JWT (JSON Web Tokens) con expiracion de 8 horas', style='List Bullet')
doc.add_paragraph('Almacenamiento: localStorage (web), SharedPreferences (movil)', style='List Bullet')

add_title('7.2 Autorizacion (RBAC)', 2)
doc.add_paragraph('Middleware que valida el rol del usuario en cada endpoint:', style='List Bullet')
code = """export const verificarToken = (rolesPermitidos: string[]) => {
    return (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];
        const verificado = jwt.verify(token, JWT_SECRET);
        if (!rolesPermitidos.includes(verificado.rol)) {
            return res.status(401).json({ mensaje: 'Sin permisos' });
        }
        next();
    };
};"""
p = doc.add_paragraph()
run = p.add_run(code)
run.font.name = 'Consolas'
run.font.size = Pt(9)

add_title('7.3 Protecciones Adicionales', 2)
doc.add_paragraph('Helmet: Headers HTTP seguros (CSP, X-Frame-Options, etc.)', style='List Bullet')
doc.add_paragraph('Rate Limiting: 100 req/15min general, 20 req/15min auth', style='List Bullet')
doc.add_paragraph('CORS Restrictivo: Solo origenes permitidos (localhost:5173)', style='List Bullet')
doc.add_paragraph('Validacion de Inputs: Zod schemas para todos los endpoints', style='List Bullet')
doc.add_paragraph('SQL Injection: Queries parametrizadas ($1, $2, etc.)', style='List Bullet')
doc.add_paragraph('SSL/TLS: Requerido en conexion a base de datos', style='List Bullet')

add_title('8. DISPONIBILIDAD, ESCALABILIDAD Y TOLERANCIA A FALLOS', 1)
add_title('8.1 Disponibilidad', 2)
doc.add_paragraph('Backend Stateless: No hay sesion en servidor, permite replicar instancias', style='List Bullet')
doc.add_paragraph('Balanceo de Carga: Se pueden desplegar multiples instancias tras un load balancer', style='List Bullet')
doc.add_paragraph('Health Check: Endpoint /api/health para monitoreo', style='List Bullet')
doc.add_paragraph('Pool de Conexiones: Manejo eficiente de conexiones a Neon', style='List Bullet')

add_title('8.2 Escalabilidad Horizontal', 2)
doc.add_paragraph('API Gateway: Punto unico de entrada puede escalarse independientemente', style='List Bullet')
doc.add_paragraph('Base de Datos: Neon ofrece escalado automatico', style='List Bullet')
doc.add_paragraph('Busqueda Full-Text: tsvector con indice GIN para consultas rapidas', style='List Bullet')
doc.add_paragraph('Docker: Contenedores para facilitar despliegue y escalado', style='List Bullet')

add_title('8.3 Tolerancia a Fallos', 2)
doc.add_paragraph('Transacciones ACID: Pedidos y pagos usan BEGIN/COMMIT/ROLLBACK', style='List Bullet')
doc.add_paragraph('Reserva de Inventario: Evita sobreventa con stock_reservado', style='List Bullet')
doc.add_paragraph('Liberacion Automatica: Si pago es rechazado, se libera el stock reservado', style='List Bullet')
doc.add_paragraph('Manejo de Errores: Middleware centralizado de errores', style='List Bullet')
doc.add_paragraph('Circuit Breaker: Puede implementarse con librerias como opossum (futuro)', style='List Bullet')

add_title('9. BASE DE DATOS', 1)
add_title('9.1 Esquema Relacional', 2)
add_table(
    ['Tabla', 'Descripcion', 'Campos Principales'],
    [
        ['usuarios', 'Clientes y administradores', 'id, nombre, email, password_hash, rol, telefono'],
        ['direcciones', 'Direcciones de envio', 'id, usuario_id, etiqueta, direccion, ciudad, es_predeterminada'],
        ['productos', 'Catalogo de productos', 'id, nombre, descripcion, precio, categoria, marca, stock, stock_reservado, search_vector'],
        ['reseñas', 'Calificaciones de productos', 'id, producto_id, usuario_id, calificacion, comentario'],
        ['cupones', 'Codigos de descuento', 'id, codigo, tipo, valor, minimo_compra, usos_maximos, fecha_expiracion'],
        ['carritos', 'Carritos de compra', 'id, usuario_id, estado, cupon_id, descuento_aplicado'],
        ['items_carrito', 'Items del carrito', 'id, carrito_id, producto_id, cantidad, precio_unitario'],
        ['wishlist_items', 'Lista de deseos', 'id, usuario_id, producto_id'],
        ['pedidos', 'Ordenes de compra', 'id, usuario_id, direccion_id, total, subtotal, descuento, estado'],
        ['items_pedido', 'Items del pedido', 'id, pedido_id, producto_id, cantidad, precio_unitario, subtotal'],
        ['pagos', 'Transacciones de pago', 'id, pedido_id, monto, estado, transaccion_id, metodo'],
        ['inventario_movimientos', 'Historial de inventario', 'id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo'],
    ]
)

add_title('9.2 Busqueda Full-Text', 2)
doc.add_paragraph('PostgreSQL tsvector con indice GIN para busqueda rapida en espanol:')
code = """-- Trigger para actualizar search_vector automaticamente
CREATE OR REPLACE FUNCTION productos_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('spanish', 
        COALESCE(NEW.nombre, '') || ' ' || 
        COALESCE(NEW.descripcion, '') || ' ' || 
        COALESCE(NEW.categoria, '') || ' ' || 
        COALESCE(NEW.marca, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Consulta de busqueda
SELECT * FROM productos 
WHERE search_vector @@ plainto_tsquery('spanish', 'laptop gaming');"""
p = doc.add_paragraph()
run = p.add_run(code)
run.font.name = 'Consolas'
run.font.size = Pt(9)

add_title('10. CONCLUSIONES', 1)
doc.add_paragraph('El sistema implementado demuestra la aplicacion practica de los conceptos de sistemas distribuidos aprendidos en el taller de comercio electronico:')

doc.add_paragraph('Arquitectura por Componentes: Separacion clara en servicios independientes (auth, productos, carrito, pedidos, pagos, inventario, direcciones, cupones, reseñas, wishlist, reportes)', style='List Bullet')
doc.add_paragraph('Seguridad en Capas: Autenticacion (JWT) + Autorizacion (RBAC) + Helmet + Rate Limiting + Validacion de Inputs', style='List Bullet')
doc.add_paragraph('Comunicacion Sincrona: API RESTful para operaciones que requieren respuesta inmediata', style='List Bullet')
doc.add_paragraph('Escalabilidad: Backend stateless permite escalar horizontalmente, Docker facilita despliegue', style='List Bullet')
doc.add_paragraph('Tolerancia a Fallos: Transacciones ACID, reserva/liberacion de inventario, rollback automatico', style='List Bullet')
doc.add_paragraph('Busqueda Avanzada: Full-text search con tsvector para consultas rapidas en espanol', style='List Bullet')

doc.add_paragraph('Mejoras futuras implementadas respecto al sistema basico:')
doc.add_paragraph('Inventario completo con reservas y alertas de stock bajo', style='List Bullet')
doc.add_paragraph('Cupones de descuento con validacion de minimo de compra', style='List Bullet')
doc.add_paragraph('Reseñas y calificaciones de productos', style='List Bullet')
doc.add_paragraph('Wishlist (lista de deseos) con opcion de mover al carrito', style='List Bullet')
doc.add_paragraph('Multiples direcciones de envio por cliente', style='List Bullet')
doc.add_paragraph('Panel de administracion completo con dashboard y reportes', style='List Bullet')
doc.add_paragraph('Documentacion API con Swagger/OpenAPI', style='List Bullet')
doc.add_paragraph('Docker y docker-compose para orquestacion', style='List Bullet')

doc.add_paragraph('Este laboratorio demuestra que los principios de sistemas distribuidos son aplicables a cualquier dominio. La clave esta en identificar los componentes, definir las responsabilidades, establecer los flujos de comunicacion y aplicar las estrategias de seguridad, escalabilidad y tolerancia a fallos de manera consistente.')

output_path = r'C:\Users\Daniel Calderon\Desktop\Electiva Desarrollo\gestion-academica\docs\informe.docx'
doc.save(output_path)
print(f'Documento generado: {output_path}')
