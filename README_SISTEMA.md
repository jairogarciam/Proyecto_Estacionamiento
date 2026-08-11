# Sistema de Estacionamiento

## 1. Resumen

Este proyecto es una API REST en Express y TypeScript para administrar un estacionamiento. El sistema permite:

- Registrar e iniciar sesión de usuarios.
- Registrar docentes y sus vehículos.
- Consultar el estado de los cajones.
- Asignar automáticamente el cajón libre más cercano a la entrada.
- Registrar entradas y salidas.
- Consultar el historial de accesos.
- Registrar y resolver quejas.
- Usar un panel web básico en `/panel/`.

La base de datos utilizada es MySQL y el acceso se realiza mediante Prisma ORM.

## 2. Credenciales para entrar

No existen credenciales predeterminadas en el proyecto. La contraseña de `DATABASE_URL` en `.env` es la contraseña de MySQL, no la contraseña del sistema.

Primero inicia el servidor:

```powershell
npm run dev
```

Después registra un usuario administrador desde otra terminal:

```powershell
$body = @{
  nombre = "Administrador"
  usuario = "admin"
  password = "Admin123*"
  rol = "ADMIN"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/auth/registrar `
  -ContentType "application/json" `
  -Body $body
```

Luego abre:

```text
http://localhost:3000/panel/
```

Usa:

- Usuario: `admin`
- Contraseña: `Admin123*`

Usuarios de prueba cargados con `npm run db:seed`:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| ADMIN | `admin` | `Admin123*` |
| GUARDIA | `guardia` | `Guardia123*` |
| DOCENTE | `docente` | `Docente123*` |

El docente de prueba tiene el vehículo `ABC-123` y el seed crea seis cajones libres. El comando es idempotente: puedes ejecutarlo varias veces sin duplicar esos registros.

Cambia esta contraseña cuando termines las pruebas. El endpoint de registro actualmente está abierto para facilitar la configuración inicial; en producción debe protegerse para que solo un administrador pueda crear usuarios.

## 3. Configuración y ejecución

El archivo `.env` contiene la configuración local:

```env
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/proyecto_estacionamiento"
JWT_SECRET="una-clave-segura"
PORT=3000
```

Comandos principales:

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run dev
```

Comandos disponibles:

- `npm run dev`: inicia Express con recarga automática.
- `npm run typecheck`: verifica TypeScript.
- `npm run prisma:validate`: valida el esquema Prisma.
- `npx prisma migrate status`: muestra el estado de las migraciones.
- `npx prisma studio`: abre una interfaz para consultar la base de datos.

## 4. Estructura de archivos

### Archivos raíz

- `package.json`: dependencias y comandos del proyecto.
- `tsconfig.json`: configuración del compilador TypeScript.
- `prisma.config.ts`: indica dónde están el esquema y las migraciones Prisma.
- `.env`: credenciales y variables locales. No debe subirse a Git.
- `.env.example`: plantilla para configurar otra máquina.
- `README_SISTEMA.md`: esta documentación.

### Servidor

- `src/server.ts`: carga las variables de entorno y arranca el servidor en el puerto configurado.
- `src/app.ts`: crea Express, habilita CORS y JSON, monta las rutas API y sirve el panel web.
- `src/config/prisma.ts`: crea el cliente compartido de Prisma.

### Middleware

- `src/middlewares/auth.middleware.ts`: lee el token `Bearer` del encabezado `Authorization`, lo valida con JWT y guarda el usuario en la petición.
- `src/middlewares/role.middleware.ts`: verifica que el rol del usuario tenga permiso para la ruta.

### Módulos

Cada módulo contiene un controlador y sus rutas:

- `src/modules/auth/`: registro y login.
- `src/modules/accesos/`: entradas, salidas e historial.
- `src/modules/cajones/`: consulta y administración de cajones.
- `src/modules/docentes/`: docentes, perfil y vehículos.
- `src/modules/quejas/`: creación, consulta y resolución de quejas.

### Frontend

- `frontend/index.html`: pantalla de login y redirección según el rol.
- `frontend/admin.html`: panel de administración.
- `frontend/guardia.html`: registro de entradas, salidas y estados de cajones.
- `frontend/docente.html`: perfil, vehículos, accesos y quejas.
- `frontend/styles.css`: diseño visual responsive.
- `frontend/js/api.js`: cliente HTTP, JWT, sesión y utilidades compartidas.
- `frontend/js/layout.js`: navegación, usuario actual y cierre de sesión.
- `frontend/js/login.js`: autenticación y redirección.
- `frontend/js/admin.js`: usuarios, docentes, cajones, quejas e historial.
- `frontend/js/guardia.js`: entradas, salidas y cajones.
- `frontend/js/docente.js`: perfil, vehículos, accesos y quejas.

El frontend no es una aplicación separada: Express lo sirve desde `http://localhost:3000/panel/`.

## 5. Modelo de datos

El esquema está en `prisma/schema.prisma`:

- `Usuario`: nombre, usuario, contraseña cifrada, rol y token QR.
- `Vehiculo`: vehículo perteneciente a un docente.
- `Cajon`: identificador, fila, columna, distancia y estado.
- `Acceso`: entrada, salida, docente, vehículo y cajón asignado.
- `Queja`: descripción, docente, cajón y estado de resolución.

Relaciones principales:

```text
Usuario 1 --- N Vehiculo
Usuario 1 --- N Acceso
Vehiculo 1 --- N Acceso
Cajon 1 --- N Acceso
Usuario 1 --- N Queja
Cajon 1 --- N Queja
```

Estados de cajón:

- `LIBRE`: disponible para una nueva entrada.
- `OCUPADO`: tiene un vehículo asignado.
- `MANTENIMIENTO`: no debe asignarse automáticamente.

`Cajon.placaOcupante` conserva la placa del vehículo que actualmente ocupa la plaza. Cuando una queja reporta que un tercero ocupó el cajón asignado, el sistema guarda la placa intrusa en la queja, libera el cajón original y mueve el acceso del docente al siguiente cajón libre. Así, la placa del docente aparece una sola vez, en su nuevo cajón, y la evidencia de la placa invasora queda en la queja.

Roles disponibles:

- `ADMIN`: administración, historial, docentes, cajones y quejas.
- `GUARDIA`: entradas, salidas y cambio de estado de cajones.
- `DOCENTE`: perfil, vehículos y creación de quejas.

## 6. Rutas de la API

Todas las rutas protegidas usan:

```http
Authorization: Bearer <token>
```

### Autenticación

- `POST /api/auth/registrar`: crea un usuario.
- `POST /api/auth/usuarios`: crea un usuario desde el panel. Solo `ADMIN`.
- `POST /api/auth/login`: valida usuario y contraseña y devuelve un JWT.
- `GET /api/auth/usuarios`: lista las cuentas. Solo `ADMIN`.
- `PUT /api/auth/usuarios/:id`: modifica nombre, usuario, rol y opcionalmente contraseña. Solo `ADMIN`.
- `DELETE /api/auth/usuarios/:id`: elimina una cuenta sin historial. Solo `ADMIN`.

### Cajones

- `GET /api/cajones`: lista todos los cajones. Es pública.
- `POST /api/cajones`: crea un cajón. Solo `ADMIN`.
- `PUT /api/cajones/:id`: modifica identificador, fila, columna y distancia de entrada. Solo `ADMIN`.
- `PUT /api/cajones/:id/estado`: cambia el estado. `ADMIN` o `GUARDIA`.

### Accesos

- `POST /api/accesos/entrada`: registra una entrada y asigna el cajón libre más cercano. `ADMIN` o `GUARDIA`.
- `PUT /api/accesos/salida/:id`: registra la salida y libera el cajón. `ADMIN` o `GUARDIA`.
- `GET /api/accesos/activos`: lista vehículos dentro del estacionamiento. `ADMIN` o `GUARDIA`.
- `GET /api/accesos/mios`: lista los accesos del docente autenticado. `DOCENTE`.
- `GET /api/accesos/historial`: consulta el historial. Solo `ADMIN`.

### Docentes y vehículos

- `GET /api/docentes`: lista docentes. Solo `ADMIN`.
- `GET /api/docentes/catalogo`: lista docentes con sus vehículos para el autocompletado del guardia. `ADMIN` o `GUARDIA`.
- `POST /api/docentes`: registra un docente. Solo `ADMIN`.
- `GET /api/docentes/perfil`: consulta el perfil propio. Solo `DOCENTE`.
- `POST /api/docentes/vehiculos`: registra un vehículo propio. Solo `DOCENTE`.
- `GET /api/docentes/vehiculos`: lista vehículos propios. Solo `DOCENTE`.
- `PUT /api/docentes/vehiculos/:id`: actualiza un vehículo propio. Solo `DOCENTE`.
- `DELETE /api/docentes/vehiculos/:id`: elimina un vehículo propio. Solo `DOCENTE`.

El panel de administración muestra los cajones como una cuadrícula usando su fila y columna. Cada tarjeta indica estado, coordenadas, distancia desde la entrada y placa ocupante cuando existe. Desde la misma tarjeta ADMIN puede editar la identificación, posición y distancia.

### Quejas

- `POST /api/quejas`: crea una queja para el acceso activo del docente. Solo `DOCENTE`.
- `GET /api/quejas`: lista quejas pendientes. Solo `ADMIN`.
- `PUT /api/quejas/:id/resolver`: marca una queja como resuelta. Solo `ADMIN`.

## 7. Flujo de una entrada

1. El guardia inicia sesión y obtiene un JWT.
2. Envía el docente y la placa del vehículo a `/api/accesos/entrada`.
3. El sistema verifica que el docente y el vehículo existan.
4. Comprueba que el vehículo no tenga una entrada activa.
5. Busca el cajón con estado `LIBRE` y menor `distanciaEntrada`.
6. Dentro de una transacción marca el cajón como `OCUPADO` y crea el acceso.
7. Al registrar la salida, guarda `fechaHoraSalida` y cambia el cajón a `LIBRE`.

### Flujo de queja por cajón ocupado

1. El docente debe tener un acceso activo.
2. Desde `Reportar problema`, indica la placa del vehículo intruso y una descripción.
3. El sistema crea la queja pendiente.
4. La queja conserva la placa invasora.
5. El cajón original del intruso se libera y se borra su `placaOcupante`.
6. El acceso del intruso se mueve al cajón que originalmente pertenecía al reclamante.
7. Se busca un tercer cajón libre y se actualiza allí el acceso del reclamante.
8. El nuevo cajón queda ocupado con la placa del vehículo del reclamante.
9. La placa invasora queda disponible como evidencia administrativa en la queja, sin duplicarse en el mapa.

## 8. Problemas comunes

### `P1000: Authentication failed`

La `DATABASE_URL` tiene un usuario o contraseña de MySQL incorrectos. Hay que corregir `.env` y repetir:

```powershell
npx prisma migrate status
```

### `P3005: database schema is not empty`

La base de datos tiene tablas creadas fuera de Prisma. Hay que revisar la base antes de usar `migrate deploy`; no se debe borrar información sin respaldo.

### Login con `Credenciales inválidas`

El usuario de `.env` no es el usuario del sistema. Registra primero un usuario con `/api/auth/registrar` y utiliza esos datos en el panel.

### El panel muestra error al consultar cajones

Comprueba que el servidor esté ejecutándose y que las migraciones estén aplicadas:

```powershell
npx prisma migrate status
```

## 9. Recomendaciones antes de producción

- Cambiar `JWT_SECRET` por una clave larga y privada.
- Cerrar o proteger `POST /api/auth/registrar`.
- Validar los datos de entrada con un esquema como Zod.
- No devolver tokens QR sensibles en listados administrativos sin necesidad.
- Añadir pruebas automatizadas para login, entradas, salidas y reasignación de cajones.
- Configurar HTTPS y restringir CORS al dominio del frontend.
- Crear un usuario administrador mediante un proceso controlado, no con credenciales compartidas.
