-- Limpiar tablas existentes
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS inventario_movimientos CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS items_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS items_carrito CASCADE;
DROP TABLE IF EXISTS carritos CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;
DROP TABLE IF EXISTS reseñas CASCADE;
DROP TABLE IF EXISTS cupones CASCADE;
DROP TABLE IF EXISTS direcciones CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('cliente', 'admin')),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Direcciones
CREATE TABLE IF NOT EXISTS direcciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    etiqueta VARCHAR(50) DEFAULT 'Casa',
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    codigo_postal VARCHAR(10),
    es_predeterminada BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    categoria VARCHAR(50),
    marca VARCHAR(100),
    imagen_url TEXT,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_reservado INT NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector
);

-- Reseñas
CREATE TABLE IF NOT EXISTS reseñas (
    id SERIAL PRIMARY KEY,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    calificacion INT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(producto_id, usuario_id)
);

-- Cupones
CREATE TABLE IF NOT EXISTS cupones (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo', 'envio_gratis')),
    valor NUMERIC(10, 2) NOT NULL,
    minimo_compra NUMERIC(10, 2) DEFAULT 0,
    usos_maximos INT DEFAULT NULL,
    usos_actuales INT DEFAULT 0,
    fecha_expiracion DATE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carritos
CREATE TABLE IF NOT EXISTS carritos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'abandonado')),
    cupon_id INT REFERENCES cupones(id),
    descuento_aplicado NUMERIC(10, 2) DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items Carrito
CREATE TABLE IF NOT EXISTS items_carrito (
    id SERIAL PRIMARY KEY,
    carrito_id INT REFERENCES carritos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist_items (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, producto_id)
);

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id),
    direccion_id INT REFERENCES direcciones(id),
    total NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    descuento NUMERIC(10, 2) DEFAULT 0,
    cupon_id INT REFERENCES cupones(id),
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_pago' 
        CHECK (estado IN ('pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado')),
    metodo_pago VARCHAR(50),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items Pedido
CREATE TABLE IF NOT EXISTS items_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- Pagos
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id),
    monto NUMERIC(10, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
    transaccion_id VARCHAR(100) UNIQUE,
    metodo VARCHAR(50),
    respuesta TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventario Movimientos
CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id SERIAL PRIMARY KEY,
    producto_id INT REFERENCES productos(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'reserva', 'liberacion', 'ajuste')),
    cantidad INT NOT NULL,
    stock_anterior INT,
    stock_nuevo INT,
    referencia_id INT,
    referencia_tipo VARCHAR(50),
    motivo TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices
DROP INDEX IF EXISTS idx_productos_categoria;
DROP INDEX IF EXISTS idx_productos_activo;
DROP INDEX IF EXISTS idx_productos_search;
DROP INDEX IF EXISTS idx_carritos_usuario;
DROP INDEX IF EXISTS idx_items_carrito_carrito;
DROP INDEX IF EXISTS idx_pedidos_usuario;
DROP INDEX IF EXISTS idx_pedidos_estado;
DROP INDEX IF EXISTS idx_items_pedido_pedido;
DROP INDEX IF EXISTS idx_pagos_pedido;
DROP INDEX IF EXISTS idx_inventario_producto;
DROP INDEX IF EXISTS idx_direcciones_usuario;
DROP INDEX IF EXISTS idx_reseñas_producto;
DROP INDEX IF EXISTS idx_wishlist_usuario;

CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_search ON productos USING gin(search_vector);
CREATE INDEX idx_carritos_usuario ON carritos(usuario_id);
CREATE INDEX idx_items_carrito_carrito ON items_carrito(carrito_id);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_items_pedido_pedido ON items_pedido(pedido_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX idx_inventario_producto ON inventario_movimientos(producto_id);
CREATE INDEX idx_direcciones_usuario ON direcciones(usuario_id);
CREATE INDEX idx_reseñas_producto ON reseñas(producto_id);
CREATE INDEX idx_wishlist_usuario ON wishlist_items(usuario_id);

-- Trigger para actualizar search_vector
CREATE OR REPLACE FUNCTION productos_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('spanish', COALESCE(NEW.nombre, '') || ' ' || COALESCE(NEW.descripcion, '') || ' ' || COALESCE(NEW.categoria, '') || ' ' || COALESCE(NEW.marca, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS productos_search_trigger ON productos;
CREATE TRIGGER productos_search_trigger
    BEFORE INSERT OR UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION productos_search_update();
