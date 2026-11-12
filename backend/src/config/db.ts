import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || '';
const esRemoto = !/^(localhost|127\.0\.0\.1|::1|db)$/.test(new URL(databaseUrl).hostname);

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: esRemoto ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 60000,
    query_timeout: 60000,
    idleTimeoutMillis: 10000
});

pool.on('connect', () => {
    console.log('Conexion establecida con PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Error en la conexion a la base de datos:', err);
});

export default pool;
