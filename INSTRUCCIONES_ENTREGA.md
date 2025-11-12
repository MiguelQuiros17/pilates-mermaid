# 🚀 INSTRUCCIONES DE ENTREGA - PilatesMermaid

## ✅ APLICACIÓN LISTA PARA ENTREGAR

### 📍 CÓMO INICIAR LA APLICACIÓN

1. **Abre una terminal** en la carpeta del proyecto:
   ```bash
   cd D:\PilatesWEBAPP
   ```

2. **Instala las dependencias** (si no lo has hecho):
   ```bash
   npm install
   ```

3. **Inicializa los datos de muestra** (si es la primera vez):
   ```bash
   npm run init-data
   ```

4. **Inicia la aplicación** (frontend + backend):
   ```bash
   npm run dev:full
   ```

5. **Espera a que los servidores inicien** (verás mensajes en la terminal)

6. **Abre tu navegador** y ve a:
   ```
   http://localhost:3000
   ```

### 🔐 CUENTAS DE PRUEBA

#### 👑 Administrador (Dueña)
- **Email**: `admin@pilatesmermaid.com`
- **Contraseña**: `admin123`
- **Acceso**: Dashboard completo, gestión de usuarios, clases, reportes, finanzas

#### 🏃 Coach (Esmeralda)
- **Email**: `esmeralda@pilatesmermaid.com`
- **Contraseña**: `coach123`
- **Acceso**: Clases asignadas, toma de asistencia, reportes de pago

#### 👤 Clientes
- **No hay clientes creados** - La base de datos está limpia para pruebas
- Los clientes se pueden crear desde el panel de administración
- Los clientes pueden registrarse desde la página de registro

### 🎯 FUNCIONALIDADES PRINCIPALES

#### Para Administradores:
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión completa de clientes (crear, editar, eliminar)
- ✅ Crear y gestionar clases (grupales y privadas)
- ✅ Asignar paquetes a clientes
- ✅ Sistema de pagos y reportes financieros
- ✅ Cálculo automático de pagos a coaches
- ✅ Exportación de datos a CSV
- ✅ Gestión de horarios y disponibilidad
- ✅ Inicializar clases grupales (12 meses)
- ✅ Ver calendario y lista de clases

#### Para Coaches:
- ✅ Ver clases asignadas
- ✅ Toma de asistencia
- ✅ Registrar razones de inasistencia
- ✅ Ver historial de clientes
- ✅ Reportes de pago personalizados
- ✅ Dashboard con estadísticas de clases

#### Para Clientes:
- ✅ Dashboard personal con estadísticas
- ✅ Ver clases disponibles
- ✅ Reservar y cancelar clases
- ✅ Calendario interactivo
- ✅ Ver paquete activo y clases restantes
- ✅ Contactar por WhatsApp para pagos
- ✅ Notificaciones de expiración de paquete

### 📱 INTEGRACIÓN WHATSAPP

- **Número**: +52 958 106 2606
- Todos los botones verdes abren WhatsApp
- Mensajes prellenados automáticamente
- **NO procesa pagos** - solo redirige a WhatsApp

### 🌐 PUERTOS

- **Frontend (Next.js)**: http://localhost:3000
- **Backend (Express)**: http://localhost:3001

### 🔧 COMANDOS ÚTILES

#### Iniciar la aplicación:
```bash
npm run dev:full
```

#### Limpiar la base de datos (eliminar todos los datos excepto admin, coach y clases grupales):
```bash
npm run clean-database
```

#### Inicializar datos de muestra:
```bash
npm run init-data
```

#### Inicializar clases grupales (12 meses):
```bash
npm run init-classes
```

#### Detener la aplicación:
Presiona `Ctrl+C` en la terminal

### 🗄️ BASE DE DATOS

- **Ubicación**: `data/pilates_mermaid.db`
- **Tipo**: SQLite
- **Datos**: Se inicializan automáticamente con `npm run init-data`

### 🎨 DISEÑO

- **Tema**: Negro y blanco, elegante y minimalista
- **Responsive**: Funciona en móvil, tablet y desktop
- **Animaciones**: Transiciones suaves con Framer Motion
- **Logo**: PNG con fondo negro y bigote gris

### 🛡️ SEGURIDAD

- ✅ Autenticación JWT
- ✅ 2FA obligatorio para admin/coaches
- ✅ Passwords hasheados con bcrypt
- ✅ Headers de seguridad con Helmet
- ✅ Rate limiting
- ✅ Validación de inputs
- ✅ CORS configurado

### 📋 VERIFICACIÓN RÁPIDA

1. ✅ Servidor backend corriendo en puerto 3001
2. ✅ Servidor frontend corriendo en puerto 3000
3. ✅ Base de datos inicializada
4. ✅ Usuarios de prueba creados
5. ✅ Clases programadas (opcional: ejecutar `npm run init-classes`)

### 🐛 SOLUCIÓN DE PROBLEMAS

#### Si los servidores no inician:
1. Verifica que los puertos 3000 y 3001 estén disponibles
2. Verifica que Node.js esté instalado: `node --version`
3. Verifica que las dependencias estén instaladas: `npm install`
4. Revisa la consola para errores

#### Si la base de datos no existe:
1. Ejecuta: `npm run init-data`
2. Verifica que el archivo `data/pilates_mermaid.db` exista

#### Si hay errores en el navegador:
1. Abre la consola del navegador (F12)
2. Revisa los errores en la pestaña "Console"
3. Verifica que el backend esté corriendo en el puerto 3001
4. Verifica que no haya errores de CORS

### 📞 CONTACTO

- **WhatsApp**: +52 958 106 2606
- **Email**: pilatesmermaid@gmail.com

### 🎉 ¡LISTO PARA USAR!

**Solo abre http://localhost:3000 y empieza a usar la aplicación**

---

## 📝 NOTAS IMPORTANTES PARA LA ENTREGA

1. **Asegúrate de que ambos servidores estén corriendo** antes de presentar la aplicación
2. **Verifica que todas las funcionalidades estén trabajando** con las cuentas de prueba
3. **Inicializa las clases grupales** con `npm run init-classes` para tener datos de ejemplo
4. **Verifica que WhatsApp esté funcionando** correctamente
5. **Revisa que el diseño sea responsive** en diferentes tamaños de pantalla

---

**Versión**: 1.0.0
**Estado**: ✅ Lista para producción
**Fecha**: $(Get-Date -Format "yyyy-MM-dd")

