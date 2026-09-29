# Sistema de Comercio Electrónico Distribuido

Sistema e-commerce completo con arquitectura distribuida, desarrollado como parte del laboratorio de sistemas distribuidos.

## Arquitectura

```
gestion-academica/
├── backend/          # API REST (Node.js + Express + TypeScript)
├── frontend-web/     # Aplicacion web (React + Vite + Tailwind)
├── mobile-app/       # Aplicacion movil (Flutter)
├── database/         # Scripts SQL para PostgreSQL
├── docker-compose.yml # Orquestacion con Docker
└── docs/             # Documentacion del proyecto
```

## Tecnologias

- **Backend**: Node.js, Express, TypeScript, JWT, bcrypt, Zod, Helmet, Rate Limiting
- **Base de Datos**: PostgreSQL 15 (Neon serverless)
- **Frontend Web**: React, Vite, Tailwind CSS
- **App Movil**: Flutter, Dart
- **Documentacion API**: Swagger/OpenAPI
- **Contenedores**: Docker, Docker Compose

## Caracteristicas Implementadas

### Autenticacion y Seguridad
- JWT con expiracion de 8 horas
- bcrypt con 10 rondas de hasheo
- RBAC (cliente/admin)
- Helmet para headers HTTP seguros
- Rate limiting (100 req/15min general, 20 req/15min auth)
- CORS restrictivo
- Validacion de inputs con Zod

### Catalogo de Productos
- Listado con filtros por categoria, marca, precio
- Busqueda full-text en español
- Ordenamiento por precio y calificacion
- Imagenes de productos
- Stock en tiempo real

### Carrito de Compras
- Agregar/quitar productos
- Cambiar cantidades
- Validacion de stock disponible
- Persistencia en base de datos
- Aplicacion de cupones de descuento

### Cupones de Descuento
- Tipos: porcentaje, monto fijo, envio gratis
- Validacion de minimo de compra
- Limite de usos
- Fecha de expiracion

### Checkout y Pedidos
- Creacion de pedidos con transaccion ACID
- Reserva temporal de inventario
- Liberacion de stock si pago es rechazado
- Estados: pendiente_pago, pagado, enviado, entregado, cancelado
- Historial de pedidos

### Pagos
- Simulacion de pasarela (80% aprobado, 20% rechazado)
- Transaccion ID unico
- Registro de pagos
- Reembolso de inventario en caso de rechazo

### Inventario
- Stock fisico y stock reservado
- Movimientos: entrada, salida, reserva, liberacion, ajuste
- Alertas de stock bajo
- Estadisticas de inventario
- Ajustes manuales por admin

### Wishlist (Lista de Deseos)
- Agregar/quitar productos
- Mover productos al carrito
- Persistencia por usuario

### Reseñas y Calificaciones
- Calificacion de 1-5 estrellas
- Comentarios
- Una reseña por producto por usuario
- Promedio de calificaciones por producto

### Direcciones
- Multiples direcciones por usuario
- Direccion predeterminada
- Etiquetas (Casa, Oficina, etc.)

### Panel de Administracion
- Dashboard con metricas clave
- Gestion de productos (CRUD)
- Gestion de usuarios
- Gestion de pedidos (cambio de estados)
- Gestion de cupones
- Ajustes de inventario
- Alertas de stock bajo
- Reportes de ventas
- Top productos
- Reportes por categoria

### Reportes
- Ventas por periodo
- Top productos mas vendidos
- Ingresos por categoria
- Dashboard con KPIs
- Ventas del dia y del mes

### Documentacion API
- Swagger UI en `/api-docs`
- Documentacion completa de endpoints

### Docker
- Dockerfile para backend
- Dockerfile para frontend
- docker-compose.yml para orquestacion completa

## Instalacion y Ejecucion

### Opcion 1: Local (desarrollo)

**1. Base de Datos (Neon)**
```bash
cd backend
npm run seed
```

**2. Backend**
```bash
cd backend
npm install
npm run dev
```
Servidor en `http://localhost:3000`
Swagger en `http://localhost:3000/api-docs`

**3. Frontend Web**
```bash
cd frontend-web
npm install
npm run dev
```
Abre `http://localhost:5173`

### Opcion 2: Docker

```bash
docker-compose up --build
```

## Usuarios de Prueba

Todos los usuarios tienen password: `password123`

| Rol | Email |
|-----|-------|
| Administrador | admin@tienda.com |
| Cliente | juan@cliente.com |
| Cliente | maria@cliente.com |
| Cliente | carlos@cliente.com |

## Cupones de Prueba

| Codigo | Tipo | Valor | Minimo Compra |
|--------|------|-------|---------------|
| BIENVENIDO10 | porcentaje | 10% | $100,000 |
| ENVIOGRATIS | envio_gratis | $15,000 | $200,000 |
| DESCUENTO50K | monto_fijo | $50,000 | $300,000 |

## Endpoints Principales

### Autenticacion
- `POST /api/auth/login` - Iniciar sesion
- `POST /api/auth/registro` - Registrar usuario (admin)
- `GET /api/auth/perfil` - Perfil del usuario

### Productos
- `GET /api/productos` - Listar (con filtros: busqueda, categoria, marca, precio)
- `GET /api/productos/:id` - Detalle con reseñas
- `POST /api/productos` - Crear (admin)
- `PUT /api/productos/:id` - Actualizar (admin)
- `GET /api/productos/categorias` - Lista de categorias
- `GET /api/productos/marcas` - Lista de marcas

### Carrito
- `GET /api/carrito` - Ver carrito
- `POST /api/carrito/items` - Agregar producto
- `PUT /api/carrito/items/:id` - Cambiar cantidad
- `DELETE /api/carrito/items/:id` - Eliminar item
- `DELETE /api/carrito` - Limpiar carrito
- `POST /api/carrito/cupon` - Aplicar cupon

### Pedidos
- `GET /api/pedidos` - Historial
- `GET /api/pedidos/:id` - Detalle
- `POST /api/pedidos/checkout` - Crear pedido
- `PUT /api/pedidos/:id/estado` - Cambiar estado (admin)

### Pagos
- `POST /api/pagos/procesar` - Procesar pago
- `GET /api/pagos` - Historial de pagos

### Direcciones
- `GET /api/direcciones` - Listar
- `POST /api/direcciones` - Crear
- `PUT /api/direcciones/:id` - Actualizar
- `DELETE /api/direcciones/:id` - Eliminar

### Cupones
- `GET /api/cupones` - Listar disponibles
- `POST /api/cupones` - Crear (admin)
- `PUT /api/cupones/:id` - Actualizar (admin)
- `POST /api/cupones/validar` - Validar cupon

### Reseñas
- `GET /api/reseñas` - Listar
- `POST /api/reseñas` - Crear
- `PUT /api/reseñas/:id` - Actualizar
- `DELETE /api/reseñas/:id` - Eliminar

### Wishlist
- `GET /api/wishlist` - Obtener
- `POST /api/wishlist` - Agregar
- `DELETE /api/wishlist/:id` - Eliminar
- `POST /api/wishlist/mover-carrito` - Mover al carrito

### Inventario (Admin)
- `GET /api/inventario/movimientos` - Historial
- `POST /api/inventario/ajustar` - Ajustar stock
- `GET /api/inventario/alertas` - Alertas stock bajo
- `GET /api/inventario/estadisticas` - Estadisticas

### Usuarios (Admin)
- `GET /api/usuarios` - Listar
- `GET /api/usuarios/:id` - Detalle
- `PUT /api/usuarios/:id` - Actualizar
- `DELETE /api/usuarios/:id` - Desactivar

### Reportes (Admin)
- `GET /api/reportes/dashboard` - Dashboard KPIs
- `GET /api/reportes/ventas` - Ventas por periodo
- `GET /api/reportes/top-productos` - Top productos
- `GET /api/reportes/categorias` - Reporte por categoria

## Flujo de Compra Completo

1. Cliente navega el catalogo con filtros y busqueda
2. Agrega productos al carrito o wishlist
3. Aplica cupon de descuento (opcional)
4. Selecciona direccion de envio
5. Realiza pedido (reserva inventario)
6. Paga el pedido (simulacion de pasarela)
7. Si aprueba: stock se descuenta, estado cambia a "pagado"
8. Si rechaza: stock reservado se libera, estado cambia a "cancelado"
9. Admin puede cambiar estado a "enviado" y "entregado"
10. Cliente puede dejar reseña despues de recibir

## Seguridad

- Contraseñas hasheadas con bcrypt (10 rondas)
- Tokens JWT con expiracion de 8 horas
- RBAC: cada endpoint valida el rol del usuario
- Helmet: headers HTTP seguros
- Rate limiting: proteccion contra abuso
- CORS restrictivo: solo origenes permitidos
- Validacion de inputs con Zod
- Queries parametrizadas (previene SQL injection)
- SSL/TLS en conexion a base de datos

## Escalabilidad

- Backend stateless (sin sesion en servidor)
- API puede escalar horizontalmente tras balanceador
- Pool de conexiones a base de datos
- Indices optimizados en PostgreSQL
- Busqueda full-text con tsvector

## Tolerancia a Fallos

- Transacciones ACID para operaciones criticas
- Rollback automatico en caso de error
- Reserva y liberacion de inventario
- Manejo centralizado de errores

## Documentacion

Ver `docs/informe.docx` para el informe completo del laboratorio.
