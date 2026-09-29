# INFORME DEL LABORATORIO: SISTEMA DE GESTION ACADEMICA DISTRIBUIDO

## Laboratorio Modulo 2 - Sistemas Distribuidos

**Estudiante:** Daniel Calderon  
**Fecha:** Septiembre 2026  
**Materia:** Electiva de Desarrollo

---

## 1. INTRODUCCION

El presente informe describe el diseno e implementacion de un sistema de gestion academica multi-sede basado en arquitectura distribuida. Este laboratorio aplica los conceptos fundamentales de sistemas distribuidos aprendidos en el taller de comercio electronico, adaptandolos a un contexto educativo con multiples sedes geograficas.

El sistema permite la gestion centralizada de estudiantes, cursos, matriculas y calificaciones, manteniendo el aislamiento de datos por sede y garantizando la seguridad, escalabilidad y disponibilidad requeridas en un entorno distribuido.

---

## 2. MAPEO CONCEPTUAL: TALLER E-COMMERCE vs SISTEMA ACADEMICO

| Concepto del Taller E-Commerce | Implementacion en Sistema Academico |
|-------------------------------|-------------------------------------|
| Cliente Web/Movil | Frontend Web (React) + App Movil (Flutter) |
| API Gateway | Backend Node.js con Express (punto unico de entrada) |
| Servicio de Autenticacion | Middleware JWT con RBAC (admin/docente/estudiante) |
| Servicio de Clientes | Controlador de Estudiantes (filtrado por sede) |
| Servicio de Productos | Controlador de Cursos (filtrado por sede) |
| Servicio de Carrito | Controlador de Matriculas (inscripcion a cursos) |
| Servicio de Pedidos | Controlador de Calificaciones (registro de notas) |
| Pasarela de Pagos | No aplica (sistema academico no tiene pagos) |
| Servicio de Notificaciones | No implementado en esta version basica |
| Base de Datos Distribuida | PostgreSQL con particionamiento logico por sede_id |
| Multi-tenancy | Aislamiento por sede_id en cada consulta |
| JWT Stateless | Tokens JWT sin sesion en servidor |
| Escalabilidad Horizontal | Backend apatrida, puede escalar tras balanceador |
| Tolerancia a Fallos | Conexiones pool a Neon, reintentos automaticos |

---

## 3. ARQUITECTURA DEL SISTEMA

### 3.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTES                                │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  Frontend    │         │  App Movil   │                  │
│  │  Web (React) │         │  (Flutter)   │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
└─────────┼────────────────────────┼───────────────────────────┘
          │                        │
          └────────┬───────────────┘
                   │
          ┌────────▼────────┐
          │   API RESTful   │
          │  (Node.js + TS) │
          │  Puerto: 3000   │
          └────────┬────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐    ┌────▼────┐   ┌────▼────┐
│ Auth  │    │ Cursos  │   │  Sedes  │
│Service│    │ Service │   │ Service │
└───┬───┘    └────┬────┘   └────┬────┘
    │              │              │
    └──────────────┼──────────────┘
                   │
          ┌────────▼────────┐
          │  PostgreSQL     │
          │  (Neon)         │
          │  Multi-sede     │
          └─────────────────┘
```

### 3.2 Grupos de Procesos

Siguiendo el modelo del taller de e-commerce, el sistema se organiza en tres grupos:

**Procesos Estrategicos (Control):**
- Servicio de Autenticacion (login, registro, validacion de tokens)
- Servicio de Autorizacion (RBAC, validacion de sede)
- Gestion de Sesiones (tokens JWT stateless)

**Procesos Misionales (Operacionales):**
- Servicio de Estudiantes (gestion de usuarios estudiantes)
- Servicio de Cursos (gestion de ofertas academicas)
- Servicio de Matriculas (inscripcion a cursos)
- Servicio de Calificaciones (registro y consulta de notas)
- Servicio de Sedes (gestion de ubicaciones)

**Procesos de Apoyo:**
- Servicio de Persistencia (conexion a PostgreSQL/Neon)
- Servicio de Logging (registro de operaciones)
- Servicio de Health Check (monitoreo de salud)

---

## 4. ACTORES Y PERMISOS

### 4.1 Actores del Sistema

| Actor | Descripcion | Permisos |
|-------|-------------|----------|
| Administrador | Personal administrativo central | Gestion completa de todas las sedes, usuarios, cursos y calificaciones |
| Docente | Profesor asignado a una sede | Gestion de cursos y calificaciones de su sede |
| Estudiante | Alumno matriculado en una sede | Consulta de cursos matriculados y calificaciones propias |

### 4.2 Matriz de Permisos por Endpoint

| Endpoint | Admin | Docente | Estudiante |
|----------|-------|---------|------------|
| POST /api/auth/login | ✓ | ✓ | ✓ |
| POST /api/auth/registro | ✓ | ✗ | ✗ |
| GET /api/sedes | ✓ | ✓ | ✓ |
| POST /api/sedes | ✓ | ✗ | ✗ |
| GET /api/cursos | ✓ (todas) | ✓ (su sede) | ✓ (su sede) |
| POST /api/cursos | ✓ | ✓ (su sede) | ✗ |
| GET /api/estudiantes | ✓ (todas) | ✓ (su sede) | ✗ |
| GET /api/matriculas | ✓ (todas) | ✓ (su sede) | ✓ (propias) |
| POST /api/matriculas | ✓ | ✓ (su sede) | ✗ |
| GET /api/calificaciones | ✓ (todas) | ✓ (su sede) | ✓ (propias) |
| POST /api/calificaciones | ✓ | ✓ (su sede) | ✗ |

---

## 5. COMPONENTES Y RESPONSABILIDADES

### 5.1 Backend (Node.js + Express + TypeScript)

**Responsabilidades:**
- Exponer API RESTful para clientes web y movil
- Validar tokens JWT y verificar permisos RBAC
- Validar que cada operacion respete el aislamiento por sede
- Gestionar conexiones a base de datos mediante pool
- Hashear contrasenas con bcrypt
- Manejar errores de forma centralizada

**Estructura:**
```
backend/src/
├── config/
│   └── db.ts              # Conexion a Neon PostgreSQL
├── middleware/
│   ├── auth.ts            # Validacion JWT y RBAC
│   └── sede.ts            # Validacion de sede
├── controllers/
│   ├── auth.controller.ts         # Login, registro, perfil
│   ├── sedes.controller.ts        # Gestion de sedes
│   ├── cursos.controller.ts       # Gestion de cursos
│   ├── matriculas.controller.ts   # Gestion de matriculas
│   ├── calificaciones.controller.ts # Gestion de calificaciones
│   └── estudiantes.controller.ts  # Consulta de estudiantes
├── routes/
│   └── *.routes.ts        # Definicion de rutas
├── db/
│   └── seed.ts            # Script de inicializacion de datos
└── index.ts               # Punto de entrada de la aplicacion
```

### 5.2 Frontend Web (React + Vite + Tailwind)

**Responsabilidades:**
- Interfaz de usuario responsive para administradores, docentes y estudiantes
- Gestion de autenticacion y almacenamiento de tokens
- Consumo de API RESTful
- Renderizado condicional segun rol del usuario
- Visualizacion de datos en tablas y tarjetas

**Estructura:**
```
frontend-web/src/
├── api/
│   └── client.js          # Cliente HTTP con interceptores
├── context/
│   └── AuthContext.jsx    # Estado global de autenticacion
├── components/
│   ├── Login.jsx          # Pantalla de login
│   └── Dashboard.jsx      # Dashboard segun rol
├── App.jsx                # Router principal
└── main.jsx               # Punto de entrada
```

### 5.3 App Movil (Flutter)

**Responsabilidades:**
- Interfaz nativa para dispositivos moviles
- Consulta de calificaciones desde cualquier lugar
- Gestion de tokens con SharedPreferences
- Consumo de API RESTful

**Estructura:**
```
mobile-app/lib/
├── main.dart              # Punto de entrada
├── screens/
│   ├── login_screen.dart          # Pantalla de login
│   └── calificaciones_screen.dart # Pantalla de calificaciones
└── services/
    └── api_service.dart   # Cliente HTTP
```

### 5.4 Base de Datos (PostgreSQL en Neon)

**Responsabilidades:**
- Almacenamiento persistente de datos academicos
- Particionamiento logico por sede_id
- Integridad referencial mediante foreign keys
- Indices para optimizacion de consultas

**Esquema:**
```sql
sedes (id, nombre, direccion, creado_en)
usuarios (id, nombre, email, password_hash, rol, sede_id, activo)
cursos (id, nombre, codigo, docente_id, sede_id)
matriculas (id, estudiante_id, curso_id, periodo_academico)
calificaciones (id, matricula_id, nota, porcentaje, descripcion)
```

---

## 6. FLUJO PRINCIPAL DEL PROCESO

### 6.1 Flujo de Consulta de Calificaciones (Estudiante)

```
1. Estudiante abre la app movil o web
2. Ingresa email y password
3. Cliente envia POST /api/auth/login
4. Backend valida credenciales contra bcrypt hash en BD
5. Backend genera JWT con id, nombre, email, rol, sede_id
6. Backend retorna token al cliente
7. Cliente almacena token (localStorage/SharedPreferences)
8. Cliente envia GET /api/calificaciones con header Authorization
9. Middleware auth.ts valida token y extrae sede_id
10. Controlador consulta calificaciones WHERE estudiante_id = usuario_id
11. Backend retorna lista de calificaciones
12. Cliente renderiza lista con notas y colores segun aprobacion
```

### 6.2 Flujo de Registro de Calificacion (Docente)

```
1. Docente inicia sesion en la web
2. Backend valida y retorna JWT con rol=docente, sede_id=X
3. Docente selecciona estudiante y curso
4. Cliente envia POST /api/calificaciones con datos
5. Middleware auth.ts valida que rol=docente
6. Controlador valida que el curso pertenece a la sede del docente
7. Controlador valida que la matricula existe
8. Controlador inserta calificacion en BD
9. Backend retorna calificacion creada
10. Cliente actualiza lista de calificaciones
```

### 6.3 Flujo de Matricula a Curso

```
1. Admin/Docente inicia sesion
2. Selecciona estudiante y curso
3. Cliente envia POST /api/matriculas
4. Middleware valida permisos y sede
5. Controlador valida que el curso es de la sede correcta
6. Controlador valida que no existe matricula duplicada
7. Controlador inserta matricula en BD
8. Backend retorna matricula creada
9. Cliente confirma operacion exitosa
```

---

## 7. ESTRATEGIA DE COMUNICACION

### 7.1 Comunicacion Sincrona (REST)

El sistema utiliza comunicacion sincrona HTTP/REST para todas las operaciones:

- **Ventajas:**
  - Simplicidad de implementacion
  - Facilidad de debugging
  - Compatibilidad con todos los clientes
  - Respuestas inmediatas

- **Desventajas:**
  - Acoplamiento temporal entre cliente y servidor
  - Posibles timeouts en operaciones largas
  - Menor tolerancia a fallos

### 7.2 Justificacion de No Uso de Comunicacion Asincrona

Para este laboratorio basico, no se implemento comunicacion asincrona (mensajeria, colas) porque:

1. **Escala limitada:** El sistema es un prototipo con pocos usuarios concurrentes
2. **Operaciones rapidas:** Las consultas a BD son rapidas (<100ms)
3. **Simplicidad:** REST es mas simple de implementar y debuggear
4. **Consistencia inmediata:** Las operaciones requieren confirmacion inmediata

**Mejoras futuras con comunicacion asincrona:**
- Notificaciones por email cuando se registra una calificacion
- Procesamiento en lote de reportes academicos
- Sincronizacion entre sedes mediante colas de mensajes
- Patron Saga para transacciones distribuidas

---

## 8. BASE DE DATOS

### 8.1 Diseno Relacional

```
┌─────────┐
│  sedes  │
├─────────┤
│ id (PK) │
│ nombre  │
│direccion│
└────┬────┘
     │ 1
     │
     │ N
┌────▼────────┐         ┌─────────┐
│  usuarios   │         │  cursos │
├─────────────┤         ├─────────┤
│ id (PK)     │◄────────│docente_id│
│ nombre      │    1    │ id (PK) │
│ email       │    N    │ nombre  │
│ password    │         │ codigo  │
│ rol         │         │sede_id  │
│ sede_id     │         └────┬────┘
│ activo      │              │ 1
└─────────────┘              │
                             │ N
                        ┌────▼────────┐
                        │  matriculas │
                        ├─────────────┤
                        │ id (PK)     │
                        │estudiante_id│
                        │ curso_id    │
                        │periodo      │
                        └────┬────────┘
                             │ 1
                             │
                             │ N
                        ┌────▼──────────┐
                        │calificaciones │
                        ├───────────────┤
                        │ id (PK)       │
                        │ matricula_id  │
                        │ nota          │
                        │ porcentaje    │
                        │ descripcion   │
                        └───────────────┘
```

### 8.2 Particionamiento Logico por Sede

Cada consulta incluye filtro por sede_id extraido del JWT:

```sql
-- Docente de sede 1 solo ve cursos de su sede
SELECT * FROM cursos WHERE sede_id = 1;

-- Estudiante solo ve sus propias calificaciones
SELECT * FROM calificaciones c
JOIN matriculas m ON c.matricula_id = m.id
WHERE m.estudiante_id = 5;
```

### 8.3 Indices para Optimizacion

```sql
CREATE INDEX idx_usuarios_sede ON usuarios(sede_id);
CREATE INDEX idx_cursos_sede ON cursos(sede_id);
CREATE INDEX idx_cursos_docente ON cursos(docente_id);
CREATE INDEX idx_matriculas_estudiante ON matriculas(estudiante_id);
CREATE INDEX idx_matriculas_curso ON matriculas(curso_id);
CREATE INDEX idx_calificaciones_matricula ON calificaciones(matricula_id);
```

---

## 9. SEGURIDAD IMPLEMENTADA

### 9.1 Autenticacion

- **Algoritmo:** bcrypt con 10 rondas de hasheo
- **Tokens:** JWT (JSON Web Tokens)
- **Expiracion:** 8 horas
- **Almacenamiento:** localStorage (web), SharedPreferences (movil)

### 9.2 Autorizacion (RBAC)

Middleware que valida el rol del usuario en cada endpoint:

```typescript
export const verificarToken = (rolesPermitidos: string[]) => {
    return (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];
        const verificado = jwt.verify(token, JWT_SECRET);
        
        if (!rolesPermitidos.includes(verificado.rol)) {
            return res.status(401).json({ mensaje: 'Sin permisos' });
        }
        next();
    };
};
```

### 9.3 Multi-Tenancy (Aislamiento por Sede)

Cada operacion valida que el usuario solo acceda a datos de su sede:

```typescript
// En controlador de calificaciones
const validarSede = await pool.query(
    `SELECT c.sede_id FROM matriculas m
     JOIN cursos c ON m.curso_id = c.id
     WHERE m.id = $1`,
    [matricula_id]
);

if (validarSede.rows[0].sede_id !== req.sede_id) {
    return res.status(403).json({ mensaje: 'Operacion no permitida' });
}
```

### 9.4 Protecciones Adicionales

- **SQL Injection:** Uso de queries parametrizadas ($1, $2, etc.)
- **XSS:** React escapa automaticamente el contenido
- **CORS:** Configurado para permitir solo origenes autorizados
- **SSL/TLS:** Requerido en conexion a base de datos
- **Validacion de inputs:** Todos los campos requeridos son validados

---

## 10. DISPONIBILIDAD, ESCALABILIDAD Y TOLERANCIA A FALLOS

### 10.1 Disponibilidad

- **Backend Stateless:** No hay sesion en servidor, permite replicar instancias
- **Balanceo de Carga:** Se pueden desplegar multiples instancias tras un load balancer
- **Health Check:** Endpoint `/api/health` para monitoreo
- **Conexion Pool:** Manejo eficiente de conexiones a BD

### 10.2 Escalabilidad Horizontal

- **API Gateway:** Punto unico de entrada puede escalarse independientemente
- **Base de Datos:** Neon ofrece escalado automatico
- **Particionamiento:** Datos separados por sede facilitan distribucion futura
- **Microservicios:** Arquitectura permite escalar componentes individualmente

### 10.3 Tolerancia a Fallos

- **Reintentos:** Libreria pg reintenta conexiones fallidas automaticamente
- **Circuit Breaker:** Puede implementarse con librerias como opossum
- **Fallbacks:** Frontend muestra mensajes de error amigables
- **Backups:** Neon realiza backups automaticos

### 10.4 Estrategias Aplicadas del Taller E-Commerce

| Estrategia | Implementacion |
|------------|----------------|
| Stateless API | JWT sin sesion en servidor |
| Pool de Conexiones | pg.Pool con configuracion optimizada |
| Particionamiento | sede_id en todas las consultas |
| Health Checks | Endpoint /api/health |
| Manejo de Errores | Middleware centralizado de errores |
| SSL/TLS | Requerido en conexion a BD |

---

## 11. CAPTURAS DE PANTALLA

### 11.1 Pantalla de Login

**Descripcion:** Interfaz de inicio de sesion con gradiente azul-purple, campos de email y password, y lista de usuarios de prueba.

**Ubicacion:** `frontend-web/src/components/Login.jsx`

### 11.2 Dashboard de Estudiante

**Descripcion:** Vista del estudiante mostrando sus cursos matriculados en tarjetas y tabla de calificaciones con colores segun aprobacion (verde >= 3.0, rojo < 3.0).

**Ubicacion:** `frontend-web/src/components/Dashboard.jsx`

### 11.3 Dashboard de Docente/Admin

**Descripcion:** Vista del docente/administrador mostrando lista de estudiantes de su sede, cursos disponibles y todas las calificaciones.

**Ubicacion:** `frontend-web/src/components/Dashboard.jsx`

### 11.4 App Movil - Login

**Descripcion:** Pantalla de login nativa de Flutter con gradiente y tarjeta de credenciales.

**Ubicacion:** `mobile-app/lib/screens/login_screen.dart`

### 11.5 App Movil - Calificaciones

**Descripcion:** Lista de calificaciones del estudiante con tarjetas mostrando curso, descripcion, porcentaje y nota con colores.

**Ubicacion:** `mobile-app/lib/screens/calificaciones_screen.dart`

---

## 12. CONCLUSIONES

### 12.1 Aplicacion de Conceptos del Taller E-Commerce

El sistema implementado demuestra la aplicacion practica de los conceptos de sistemas distribuidos aprendidos en el taller de comercio electronico:

1. **Arquitectura por Componentes:** Separacion clara en servicios independientes (auth, cursos, matriculas, calificaciones)
2. **Multi-Tenancy:** Aislamiento de datos por sede mediante sede_id en cada consulta
3. **Seguridad en Capas:** Autenticacion (JWT) + Autorizacion (RBAC) + Validacion de Sede
4. **Comunicacion Sincrona:** API RESTful para operaciones que requieren respuesta inmediata
5. **Escalabilidad:** Backend stateless permite escalar horizontalmente
6. **Tolerancia a Fallos:** Pool de conexiones, health checks, manejo centralizado de errores

### 12.2 Lecciones Aprendidas

1. **Importancia del Diseno de BD:** El esquema relacional con particionamiento por sede es critico para el aislamiento de datos
2. **JWT vs Sesiones:** Los tokens stateless facilitan la escalabilidad pero requieren cuidado con la expiracion
3. **RBAC Granular:** No basta con validar el rol, tambien hay que validar la sede en cada operacion
4. **Separacion de Responsabilidades:** Controllers, middleware y routes bien separados facilitan el mantenimiento
5. **Multi-Plataforma:** Una misma API puede servir a web y movil sin modificaciones

### 12.3 Mejoras Futuras

1. **Comunicacion Asincrona:** Implementar colas (RabbitMQ/Kafka) para notificaciones y procesos en lote
2. **Cache:** Redis para cache de consultas frecuentes
3. **API Gateway Dedicado:** Kong o AWS API Gateway para gestion centralizada
4. **Monitoreo:** Prometheus + Grafana para metricas en tiempo real
5. **CI/CD:** Pipelines de integracion y despliegue continuo
6. **Tests:** Suite completa de tests unitarios, integracion y E2E
7. **Documentacion API:** Swagger/OpenAPI para documentacion automatica
8. **Rate Limiting:** Proteccion contra abuso de la API
9. **Auditoria:** Log de todas las operaciones criticas
10. **Backup Strategy:** Estrategia de backup y recuperacion ante desastres

### 12.4 Reflexion Final

Este laboratorio demuestra que los principios de sistemas distribuidos son aplicables a cualquier dominio, no solo al comercio electronico. La clave esta en identificar los componentes, definir las responsabilidades, establecer los flujos de comunicacion y aplicar las estrategias de seguridad, escalabilidad y tolerancia a fallos de manera consistente.

El sistema implementado, aunque basico, sienta las bases para una solucion empresarial que podria escalar a miles de usuarios y multiples sedes geograficas con las mejoras adecuadas.

---

## 13. REFERENCIAS

1. Documentacion de Node.js: https://nodejs.org/docs/
2. Documentacion de Express: https://expressjs.com/
3. Documentacion de React: https://react.dev/
4. Documentacion de Flutter: https://flutter.dev/docs
5. Documentacion de Neon: https://neon.tech/docs
6. JSON Web Tokens: https://jwt.io/introduction
7. bcrypt: https://www.npmjs.com/package/bcrypt
8. PostgreSQL: https://www.postgresql.org/docs/

---

**Fin del Informe**
