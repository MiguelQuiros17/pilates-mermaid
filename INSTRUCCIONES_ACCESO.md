# 🔐 INSTRUCCIONES DE ACCESO - Pilates Mermaid

## 📍 CÓMO ACCEDER A LA APLICACIÓN

### 1. Verificar que los servidores estén corriendo

**Backend (Express):**
- URL: `http://localhost:3001`
- Debe estar escuchando en el puerto 3001
- Verificar con: `netstat -ano | findstr :3001`

**Frontend (Next.js):**
- URL: `http://localhost:3000`
- Debe estar escuchando en el puerto 3000
- Verificar con: `netstat -ano | findstr :3000`

### 2. Acceder a la aplicación

1. **Abre tu navegador** (Chrome, Firefox, Edge, etc.)
2. **Ve a la siguiente URL:**
   ```
   http://localhost:3000
   ```
3. **Serás redirigido automáticamente a la página de login**

### 3. Iniciar sesión

#### Opción A: Como Administrador (para gestionar clientes)
- **Email**: `admin@pilatesmermaid.com`
- **Contraseña**: `admin123`
- **Acceso**: Dashboard completo, gestión de clientes, asignar paquetes

#### Opción B: Como Cliente (Miguel Quirós García)
- **Email**: `mqghux@gmail.com`
- **Contraseña**: (necesitas verificar la contraseña en la base de datos o usar "Olvidé mi contraseña")

### 4. Acceder al perfil del cliente

**Si inicias sesión como cliente:**
- Automáticamente serás redirigido a `/dashboard/client`
- Verás tu perfil con el paquete activo

**Si inicias sesión como administrador:**
1. Ve a "Clientes" en el menú
2. Busca "Miguel Quirós García"
3. Haz clic en "Ver Perfil" o similar
4. O ve directamente a: `http://localhost:3000/dashboard/client` (si tienes permisos)

### 5. Ver los logs para debugging

**En el navegador (F12):**
1. Abre la consola del desarrollador (F12)
2. Ve a la pestaña "Console"
3. Busca los logs que empiezan con:
   - `📦 Package data received from API`
   - `🔄 activePackage state changed`
   - `📦 activePackage value`

**En el servidor (terminal):**
- Busca los logs que empiezan con:
   - `[Package History] User ...`
   - `[Package History Response] User ...`
   - `Active package will be sent to client: YES/NO`
   - `Response JSON:`

### 6. Verificar el problema

Si el paquete no se muestra:
1. Revisa los logs del navegador para ver qué está recibiendo el frontend
2. Revisa los logs del servidor para ver qué está devolviendo el backend
3. Verifica que el paquete esté activo en la base de datos
4. Verifica que la fecha de expiración sea futura

## 🔧 COMANDOS ÚTILES

### Iniciar ambos servidores
```bash
npm run dev:full
```

### Iniciar solo el frontend
```bash
npm run dev
```

### Iniciar solo el backend
```bash
npm run server
```

### Verificar qué está corriendo
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

## 📝 NOTAS

- El cliente **Miguel Quirós García** tiene un paquete activo con fecha de expiración: **2025-12-12**
- El paquete es: **4 Clases Grupales**
- El estado del paquete en la base de datos es: **active**
- Si no puedes iniciar sesión como cliente, inicia sesión como admin y verifica/crea la contraseña del cliente

