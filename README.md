# Sistema de Monitoreo de Sensores con Autenticación

Sistema completo de monitoreo y control de invernadero con autenticación JWT y base de datos PostgreSQL.

## 🚀 Características

### Autenticación y Seguridad

- ✅ **Login seguro** con email y contraseña
- ✅ **JWT (JSON Web Tokens)** para sesiones
- ✅ **Contraseñas hasheadas** con bcrypt
- ✅ **Protección de rutas** - redirección automática a login
- ✅ **Recuperación de contraseña** (funcionalidad básica)
- ✅ **Cookies HTTP-only** para mayor seguridad
- ✅ **Verificación de sesión** en tiempo real

### Base de Datos

- ✅ **PostgreSQL** en Neon (cloud)
- ✅ **Tabla de usuarios** con campos: id, email, password, nombre
- ✅ **Usuario de prueba** creado automáticamente

### Interfaz de Usuario

- ✅ **Login moderno** estilo shadcn/ui
- ✅ **Totalmente en español**
- ✅ **Responsive design**
- ✅ **Validación en tiempo real**
- ✅ **Estados de carga** y feedback visual
- ✅ **Modal de recuperación** de contraseña

## 🔧 Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

El archivo `.env` ya está configurado con:

- Puerto del servidor
- Secreto JWT
- Conexión a PostgreSQL

### 3. Iniciar el servidor

```bash
npm start
# o para desarrollo con nodemon:
npm run dev
```

### 4. Acceder a la aplicación

- **URL:** http://localhost:3000
- **Login:** http://localhost:3000/login.html

## 👤 Credenciales de Prueba

```
Email: admin@test.com
Contraseña: 123456
```

## 🔐 Flujo de Autenticación

### 1. Primera Visita

- El usuario es redirigido automáticamente a `/login.html`
- No puede acceder a rutas protegidas sin autenticación

### 2. Login Exitoso

- Se genera un JWT válido por 24 horas
- Se establece una cookie HTTP-only segura
- Redirección automática a `/index.html`

### 3. Sesión Activa

- El JWT se verifica en cada petición
- El nombre del usuario se muestra en el header
- Botón de "Cerrar Sesión" disponible

### 4. Logout

- Se elimina la cookie de sesión
- Redirección automática a login

## 🛡️ Rutas de la API

### Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar sesión activa
- `POST /api/auth/recover` - Recuperar contraseña

### Páginas

- `GET /` - Dashboard principal (protegida)
- `GET /index.html` - Dashboard principal (protegida)
- `GET /login.html` - Página de login (pública)

## 🏗️ Estructura del Proyecto

```
datos-sensores/
├── server.js          # Servidor Express con autenticación
├── login.html         # Página de login moderna
├── index.html         # Dashboard principal (protegido)
├── app.js            # Lógica MQTT y sensores
├── style.css         # Estilos con auth header
├── package.json      # Dependencias npm
├── .env             # Variables de entorno
└── .gitignore       # Archivos ignorados por git
```

## 🔒 Seguridad Implementada

1. **Contraseñas hasheadas** con bcrypt (salt rounds: 10)
2. **JWT con expiración** de 24 horas
3. **Cookies HTTP-only** para prevenir XSS
4. **Validación de entrada** en frontend y backend
5. **Protección de rutas** con middleware
6. **Conexión SSL** a base de datos
7. **Variables de entorno** para secretos

## 📊 Base de Datos

### Tabla `usuarios`

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Próximos Pasos

### Mejoras de Seguridad

- [ ] Implementar rate limiting
- [ ] Agregar 2FA (autenticación de dos factores)
- [ ] Logs de auditoría de accesos
- [ ] Política de contraseñas más estricta

### Funcionalidades

- [ ] Registro de nuevos usuarios
- [ ] Recuperación de contraseña por email
- [ ] Roles y permisos
- [ ] Perfil de usuario editable

### Monitoreo

- [ ] Dashboard de métricas de uso
- [ ] Alertas por email/SMS
- [ ] Historial de datos de sensores

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js + Express.js 4.x
- **Base de Datos:** PostgreSQL (Neon Cloud)
- **Autenticación:** JWT + bcrypt
- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **MQTT:** Para datos en tiempo real de sensores
- **Estilos:** Inspirado en shadcn/ui

## 📱 Compatibilidad

- ✅ Chrome, Firefox, Safari, Edge
- ✅ Dispositivos móviles (responsive)
- ✅ Tabletas y desktops
- ✅ Modo oscuro del navegador

## 🆘 Resolución de Problemas

### Error de conexión a base de datos

- Verificar que la URL de PostgreSQL sea correcta
- Comprobar conectividad de red

### JWT inválido

- Las cookies se limpian automáticamente
- El usuario es redirigido a login

### Puerto ocupado

- Cambiar `PORT` en `.env`
- O terminar el proceso que usa el puerto 3000

---

**Desarrollado con ❤️ para el monitoreo de invernaderos**
