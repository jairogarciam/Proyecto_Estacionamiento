# Manual de instalación del Sistema de Estacionamiento

Este manual explica cómo instalar y ejecutar el Sistema de Estacionamiento en otra computadora con Windows. Incluye la configuración de MySQL, Prisma, el servidor web y el acceso desde otros equipos de la misma red.

## 1. Requisitos

Instala en la computadora que ejecutará el sistema:

- Windows 10 u 11.
- Node.js LTS, preferentemente la versión 20 o superior.
- npm, incluido con Node.js.
- MySQL Server 8 o compatible.
- Git, únicamente si vas a descargar el proyecto desde un repositorio.
- Un navegador actualizado, como Microsoft Edge, Google Chrome o Firefox.

Comprueba las instalaciones desde PowerShell:

```powershell
node --version
npm --version
mysql --version
git --version
```

Si no se reconoce alguno de los comandos, instala la herramienta correspondiente y vuelve a abrir PowerShell.

## 2. Obtener el proyecto

### Opción A: clonar con Git

```powershell
git clone <URL_DEL_REPOSITORIO>
cd Proyecto_Estacionamiento
```

### Opción B: copiar una carpeta

Copia la carpeta completa del proyecto a la nueva computadora. Debe conservar, como mínimo, estas carpetas y archivos:

- `src/`
- `frontend/`
- `prisma/`
- `package.json`
- `package-lock.json`
- `prisma.config.ts`
- `tsconfig.json`

Abre PowerShell en la carpeta que contiene el `package.json` principal. En este proyecto es la carpeta raíz `Proyecto_Estacionamiento`, no `estacionamiento-backend`.

```powershell
cd "C:\ruta\Proyecto_Estacionamiento"
```

## 3. Crear la base de datos MySQL

Inicia el servicio de MySQL y entra con una cuenta que tenga permisos para crear bases de datos y usuarios:

```powershell
mysql -u root -p
```

En la consola de MySQL ejecuta lo siguiente. Cambia la contraseña por una propia y segura:

```sql
CREATE DATABASE proyecto_estacionamiento
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'estacionamiento_app'@'localhost'
  IDENTIFIED BY 'CAMBIA_ESTA_CONTRASENA';

GRANT ALL PRIVILEGES ON proyecto_estacionamiento.*
  TO 'estacionamiento_app'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

Si MySQL está en otra computadora, el usuario debe autorizar la conexión desde el equipo del servidor. En ese caso no uses esta configuración sin revisar primero la seguridad de MySQL, el firewall y la red.

## 4. Instalar dependencias

Desde la raíz del proyecto ejecuta:

```powershell
npm install
```

Este comando instala Express, Prisma, TypeScript, `tsx`, `nodemon` y las demás dependencias definidas en `package.json`.

## 5. Configurar las variables de entorno

Crea el archivo `.env` a partir de la plantilla:

```powershell
Copy-Item .env.example .env
notepad .env
```

Configúralo con los datos de MySQL:

```env
DATABASE_URL="mysql://estacionamiento_app:CAMBIA_ESTA_CONTRASENA@localhost:3306/proyecto_estacionamiento"
JWT_SECRET="escribe-aqui-una-clave-larga-y-privada"
PORT=3000
```

Consideraciones:

- Si la contraseña contiene caracteres especiales, codifícala correctamente dentro de la URL de conexión. Por ejemplo, `@` se representa como `%40`.
- `JWT_SECRET` no es la contraseña de MySQL. Es la clave usada para firmar las sesiones.
- No compartas ni subas `.env` al repositorio.
- Si eliges otro puerto, usa ese mismo puerto al abrir el panel y configurar el firewall.

## 6. Preparar Prisma y la base de datos

Desde la raíz del proyecto ejecuta, en este orden:

```powershell
npx prisma generate
npx prisma migrate deploy
npm run prisma:validate
npx prisma migrate status
```

Qué hace cada comando:

- `prisma generate`: genera el cliente de Prisma usado por el backend.
- `prisma migrate deploy`: aplica las migraciones existentes y crea las tablas.
- `prisma:validate`: comprueba que el esquema Prisma sea válido.
- `migrate status`: confirma si las migraciones están aplicadas.

No uses `prisma migrate reset` en una instalación con datos importantes: elimina la información de la base de datos.

## 7. Cargar datos iniciales

Para una instalación de pruebas o demostración, ejecuta:

```powershell
npm run db:seed
```

El seed crea o actualiza estos usuarios, un vehículo de prueba y seis cajones libres:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| ADMIN | `admin` | `Admin123*` |
| GUARDIA | `guardia` | `Guardia123*` |
| DOCENTE | `docente` | `Docente123*` |

El docente de prueba tiene el vehículo `ABC-123`. El seed es idempotente, pero actualiza las contraseñas de esos usuarios cada vez que se ejecuta. En producción, utiliza cuentas propias y no ejecutes el seed de demostración después de crear usuarios reales sin revisar sus efectos.

Para una instalación nueva de producción, puedes omitir este paso y crear el primer administrador mediante la API de registro. Con el servidor iniciado, abre otra PowerShell y ejecuta:

```powershell
$body = @{
  nombre = "Administrador"
  usuario = "admin"
  password = "CAMBIA_ESTA_CONTRASENA"
  rol = "ADMIN"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/auth/registrar `
  -ContentType "application/json" `
  -Body $body
```

## 8. Verificar la instalación

Comprueba primero el código y el esquema:

```powershell
npm run typecheck
npx prisma validate
```

Inicia el servidor en modo desarrollo:

```powershell
npm run dev
```

Debe aparecer un mensaje similar a:

```text
Servidor corriendo en http://localhost:3000
```

En el navegador abre:

- API: `http://localhost:3000/`
- Panel: `http://localhost:3000/panel/`

La API debe responder con un mensaje indicando que está funcionando. En el panel inicia sesión con las credenciales creadas o con las del seed de pruebas.

Para detener el servidor, pulsa `Ctrl+C` en la ventana de PowerShell donde está ejecutándose.

## 9. Acceder desde otra computadora de la red

El servidor debe ejecutarse en la computadora donde están el proyecto y MySQL. Para obtener su dirección IP local:

```powershell
ipconfig
```

Busca la dirección `IPv4` de la conexión de red activa, por ejemplo `192.168.1.25`. Desde la otra computadora abre:

```text
http://192.168.1.25:3000/panel/
```

Si Windows Firewall muestra un aviso al iniciar Node.js, permite el acceso en redes privadas. Si no aparece el aviso, crea una regla de entrada para el puerto configurado, por ejemplo:

```powershell
New-NetFirewallRule -DisplayName "Sistema de Estacionamiento 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Recomendaciones para esta modalidad:

- Las dos computadoras deben estar en la misma red.
- Usa una red privada y de confianza.
- No abras el puerto 3000 directamente a Internet.
- Si cambia la IP del servidor, la URL del panel también cambia.
- Para una IP estable, configura una reserva DHCP en el router.

## 10. Ejecución habitual

Cada vez que se reinicie la computadora:

1. Verifica que MySQL esté iniciado.
2. Abre PowerShell en la raíz del proyecto.
3. Ejecuta `npm run dev`.
4. Abre `http://localhost:3000/panel/` en el servidor o la URL con la IP desde otro equipo.

El comando `npm run dev` utiliza `nodemon` y está pensado para desarrollo. El proyecto no incluye actualmente un script de compilación o servicio de Windows; para una instalación permanente conviene configurar un administrador de procesos o servicio de Windows y definir una estrategia de respaldo.

## 11. Respaldo y traslado de datos

Para respaldar la base de datos desde PowerShell:

```powershell
mysqldump -u estacionamiento_app -p proyecto_estacionamiento > respaldo_estacionamiento.sql
```

Para restaurarla en otra base de datos:

```powershell
mysql -u estacionamiento_app -p proyecto_estacionamiento < respaldo_estacionamiento.sql
```

No reemplaces una base con datos reales sin hacer primero un respaldo y verificar el archivo generado.

## 12. Problemas frecuentes

### `P1000: Authentication failed`

Revisa usuario, contraseña, host, puerto y nombre de base de datos en `DATABASE_URL`. Prueba la conexión directamente:

```powershell
mysql -u estacionamiento_app -p -h localhost -P 3306 proyecto_estacionamiento
```

### `P3005: database schema is not empty`

La base contiene tablas que no fueron creadas por las migraciones actuales. No borres la base automáticamente. Haz un respaldo, revisa su origen y decide si debes usar una base nueva o registrar el estado inicial de forma controlada.

### `ECONNREFUSED` o no se puede conectar a MySQL

Confirma que el servicio de MySQL esté iniciado, que el puerto sea el correcto y que el servidor acepte conexiones. En una instalación local, `localhost:3306` es la configuración esperada.

### El panel no abre desde otra computadora

Confirma que el servidor siga ejecutándose, usa la IPv4 correcta, revisa el perfil de red y comprueba la regla del firewall:

```powershell
Get-NetFirewallRule -DisplayName "Sistema de Estacionamiento 3000"
```

También prueba primero `http://localhost:3000/panel/` en la computadora servidor.

### `Credenciales inválidas`

La contraseña de MySQL no es la contraseña de acceso al panel. Usa una cuenta creada por el endpoint de registro o ejecuta el seed de pruebas.

### El panel muestra errores al consultar datos

Revisa la consola donde corre el servidor y confirma el estado de Prisma:

```powershell
npx prisma migrate status
```

## 13. Lista final de comprobación

- [ ] Node.js y npm están instalados.
- [ ] MySQL está instalado y ejecutándose.
- [ ] La base `proyecto_estacionamiento` existe.
- [ ] El usuario de MySQL tiene permisos sobre esa base.
- [ ] `.env` tiene una `DATABASE_URL` válida.
- [ ] `JWT_SECRET` fue cambiado por una clave privada.
- [ ] `npx prisma generate` terminó correctamente.
- [ ] Las migraciones están aplicadas.
- [ ] Se creó un administrador o se cargó el seed de pruebas.
- [ ] `npm run typecheck` no reporta errores.
- [ ] El panel abre en `/panel/`.
- [ ] El firewall permite el puerto si se usará otra computadora.
- [ ] Existe un respaldo si la instalación contiene datos reales.

## 14. Seguridad antes de producción

Antes de usar el sistema con datos reales:

- Cambia todas las credenciales de prueba.
- Usa un `JWT_SECRET` largo y privado.
- Protege o cierra el registro público de usuarios.
- No expongas MySQL a Internet.
- Configura HTTPS mediante un proxy inverso o servidor web adecuado.
- Restringe CORS al dominio autorizado.
- Programa respaldos y prueba su restauración.
- Ejecuta el backend con una cuenta de Windows con permisos mínimos.
