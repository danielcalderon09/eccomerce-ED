import bcrypt from 'bcrypt';
import pool from '../config/db';
import fs from 'fs';
import path from 'path';

async function seed() {
    console.log('Iniciando seed de base de datos e-commerce...');

    try {
        const schemaSql = fs.readFileSync(path.join(__dirname, '../../../database/schema.sql'), 'utf-8');
        await pool.query(schemaSql);
        console.log('Tablas e-commerce creadas correctamente.');

        const passwordHash = await bcrypt.hash('password123', 10);

        const usuariosResult = await pool.query('SELECT COUNT(*) FROM usuarios');
        const productosResult = await pool.query('SELECT COUNT(*) FROM productos');
        if (parseInt(usuariosResult.rows[0].count) > 0 && parseInt(productosResult.rows[0].count) > 0) {
            console.log('Ya existen datos en la base de datos. Saltando seed.');
            return;
        }

        await pool.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES
            ('Admin Tienda', 'admin@tienda.com', $1, 'admin', '3001234567'),
            ('Juan Perez', 'juan@cliente.com', $1, 'cliente', '3009876543'),
            ('Maria Garcia', 'maria@cliente.com', $1, 'cliente', '3001112233'),
            ('Carlos Lopez', 'carlos@cliente.com', $1, 'cliente', '3004445566')
        `, [passwordHash]);
        console.log('Usuarios insertados.');

        await pool.query(`
            INSERT INTO direcciones (usuario_id, etiqueta, direccion, ciudad, departamento, codigo_postal, es_predeterminada) VALUES
            (2, 'Casa', 'Calle 10 #20-30, Bogota', 'Bogota', 'Cundinamarca', '110111', TRUE),
            (2, 'Oficina', 'Carrera 7 #50-10, Bogota', 'Bogota', 'Cundinamarca', '110221', FALSE),
            (3, 'Casa', 'Av. Siempre Viva 742', 'Medellin', 'Antioquia', '050012', TRUE),
            (4, 'Casa', 'Carrera 7 #50-10, Medellin', 'Medellin', 'Antioquia', '050021', TRUE)
        `);
        console.log('Direcciones insertadas.');

        await pool.query(`
            INSERT INTO productos (nombre, descripcion, precio, categoria, marca, imagen_url, stock) VALUES
            ('Laptop Gamer Pro', 'Laptop gaming con RTX 4060, 16GB RAM, 512GB SSD', 4500000.00, 'Electronica', 'ASUS', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', 15),
            ('Smartphone Ultra', 'Telefono 5G con pantalla AMOLED 6.7, 128GB', 1800000.00, 'Electronica', 'Samsung', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 30),
            ('Audifonos Bluetooth', 'Audifonos inalambricos con cancelacion de ruido', 250000.00, 'Accesorios', 'Sony', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 50),
            ('Teclado Mecanico RGB', 'Teclado gaming con switches Cherry MX y RGB', 180000.00, 'Accesorios', 'Corsair', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', 40),
            ('Mouse Inalambrico', 'Mouse ergonomico con sensor de alta precision', 120000.00, 'Accesorios', 'Logitech', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 60),
            ('Monitor 27 4K', 'Monitor 4K IPS con HDR y 144Hz', 1200000.00, 'Electronica', 'LG', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', 20),
            ('Camiseta Premium', 'Camiseta algodon 100%, varios colores', 45000.00, 'Ropa', 'Nike', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 100),
            ('Zapatillas Running', 'Zapatillas deportivas con amortiguacion', 320000.00, 'Ropa', 'Adidas', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 45),
            ('Mochila Urbana', 'Mochila resistente al agua con puerto USB', 89000.00, 'Accesorios', 'Samsonite', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 35),
            ('Smartwatch Fitness', 'Reloj inteligente con monitor cardiaco y GPS', 450000.00, 'Electronica', 'Garmin', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 25)
        `);
        console.log('Productos insertados.');

        await pool.query(`
            INSERT INTO cupones (codigo, tipo, valor, minimo_compra, usos_maximos, fecha_expiracion) VALUES
            ('BIENVENIDO10', 'porcentaje', 10.00, 100000, 100, '2026-12-31'),
            ('ENVIOGRATIS', 'envio_gratis', 0, 200000, 50, '2026-12-31'),
            ('DESCUENTO50K', 'monto_fijo', 50000.00, 300000, 30, '2026-12-31')
        `);
        console.log('Cupones insertados.');

        await pool.query(`
            INSERT INTO reseñas (producto_id, usuario_id, calificacion, comentario) VALUES
            (1, 2, 5, 'Excelente laptop, muy potente para gaming'),
            (2, 2, 4, 'Buen telefono, la bateria dura todo el dia'),
            (3, 3, 5, 'Los mejores audifonos que he tenido'),
            (4, 2, 4, 'Teclado muy comodo para programar'),
            (5, 3, 3, 'Buen mouse pero el scroll podria ser mejor')
        `);
        console.log('Reseñas insertadas.');

        console.log('Seed completado exitosamente.');
    } catch (error) {
        console.error('Error en seed:', error);
    } finally {
        await pool.end();
    }
}

seed();
