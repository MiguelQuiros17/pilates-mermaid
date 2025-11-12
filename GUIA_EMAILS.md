# 📧 Guía Completa de Emails - PilatesMermaid

## 🎯 Resumen
Sistema completo de emails implementado con plantillas elegantes, logo del negocio, y funcionalidades automáticas.

## 📨 Tipos de Emails Implementados

### 1. ✅ Confirmación de Clase
**Cuándo se envía**: Automáticamente cuando un cliente reserva una clase exitosamente

**Contenido**:
- Detalles de la clase (nombre, fecha, hora, coach, tipo)
- Recordatorios importantes
- Botón de WhatsApp para cancelar/reprogramar

**Ejemplo de uso**:
```javascript
await emailService.sendClassConfirmation(
  'cliente@email.com',
  'María González',
  'Pilates Grupal',
  '2024-01-15',
  '18:00',
  'Esmeralda García',
  'group'
)
```

### 2. 🔔 Recordatorio de Clase
**Cuándo se envía**: 24 horas antes de la clase programada

**Contenido**:
- Recordatorio con detalles de la clase del día siguiente
- Preparación recomendada
- Botón de WhatsApp para cancelar

**Ejecutar manualmente**:
```bash
npm run send-class-reminders
```

**Ejemplo de uso**:
```javascript
await emailService.sendClassReminder(
  'cliente@email.com',
  'María González',
  'Pilates Grupal',
  '2024-01-16',
  '18:00',
  'Esmeralda García',
  'group'
)
```

### 3. ⚠️ Clases por Terminarse
**Cuándo se envía**: Cuando un cliente tiene menos de 3 clases restantes

**Contenido**:
- Advertencia de que quedan pocas clases
- Estado del paquete (clases restantes, fecha de vencimiento)
- Botón de WhatsApp para renovar

**Ejecutar manualmente**:
```bash
npm run send-classes-running-out
```

**Ejemplo de uso**:
```javascript
await emailService.sendClassesRunningOut(
  'cliente@email.com',
  'María González',
  'Paquete de 8 clases',
  2, // clases restantes
  '2024-01-20' // fecha de vencimiento
)
```

### 4. ⏰ Paquete por Vencer
**Cuándo se envía**: 7 días antes del vencimiento del paquete

**Contenido**:
- Alerta de vencimiento
- Días restantes hasta el vencimiento
- Clases restantes
- Botón de WhatsApp para renovar

**Ejecutar manualmente**:
```bash
npm run send-expirations
```

**Ejemplo de uso**:
```javascript
await emailService.sendPackageExpirationNotification(
  'cliente@email.com',
  'María González',
  'Paquete de 8 clases',
  '2024-01-20', // fecha de vencimiento
  5 // clases restantes
)
```

### 5. 🎂 Feliz Cumpleaños
**Cuándo se envía**: El día del cumpleaños del cliente

**Contenido**:
- Felicitación personalizada
- Mensaje especial
- Botón de WhatsApp para agendar clase especial

**Ejecutar manualmente**:
```bash
npm run send-birthdays
```

**Ejemplo de uso**:
```javascript
await emailService.sendBirthdayNotification(
  'cliente@email.com',
  'María González'
)
```

### 6. 🔐 Recuperación de Contraseña
**Cuándo se envía**: Cuando un usuario solicita recuperar su contraseña

**Contenido**:
- Enlace de recuperación (expira en 1 hora)
- Token de seguridad
- Instrucciones paso a paso

**Endpoint**: `POST /api/auth/forgot-password`

**Ejemplo de uso**:
```javascript
// Frontend
fetch('http://localhost:3001/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ correo: 'cliente@email.com' })
})
```

### 7. ✅ Contraseña Restablecida
**Cuándo se envía**: Después de que un usuario restablece su contraseña exitosamente

**Contenido**:
- Confirmación de cambio
- Instrucciones de seguridad
- Botón de WhatsApp para reportar si no reconoces el cambio

**Endpoint**: `POST /api/auth/reset-password`

### 8. 👋 Bienvenida
**Cuándo se envía**: Cuando un nuevo cliente se registra

**Contenido**:
- Mensaje de bienvenida
- Próximos pasos
- Botón de WhatsApp para comprar paquete

**Automático**: Se envía durante el registro

## 🎨 Diseño de Plantillas

### Características
- **Logo**: Incluido automáticamente desde `public/Logo.png` o URL configurada
- **Tipografía**: Inter (Google Fonts) para máxima legibilidad
- **Colores**: Paleta minimalista en grises y negro
- **Responsive**: Diseño adaptativo para móviles y desktop
- **Estilo**: Minimalista, elegante, profesional

### Estructura
1. **Header**: Logo + Título + Subtítulo (fondo oscuro elegante)
2. **Body**: Contenido principal con información relevante
3. **Info Boxes**: Cajas de información con colores según importancia
4. **Botones**: Botones de WhatsApp con estilo verde
5. **Footer**: Información de contacto, WhatsApp, ubicación, disclaimer

## ⚙️ Configuración

### 1. Variables de Entorno (.env)
```env
# Email Configuration
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-aqui

# Frontend URL (para enlaces de recuperación)
FRONTEND_URL=http://localhost:3000

# Logo URL (opcional, por defecto usa el logo local)
LOGO_URL=https://pilatesmermaid.com/Logo.png
```

### 2. Configurar Gmail
1. Ir a tu cuenta de Google
2. Habilitar la verificación en 2 pasos
3. Generar una contraseña de aplicación:
   - Ir a: https://myaccount.google.com/apppasswords
   - Seleccionar "Correo" y "Otro (nombre personalizado)"
   - Ingresar "PilatesMermaid"
   - Copiar la contraseña generada (16 caracteres)
   - Usar esta contraseña en `EMAIL_PASSWORD`

### 3. Probar Configuración
```bash
# Probar envío de email
node -e "
const { EmailService } = require('./lib/email.js');
const emailService = new EmailService();
emailService.sendEmail('tu-email@gmail.com', 'Prueba', '<h1>Prueba</h1>')
  .then(result => console.log('Resultado:', result))
  .catch(error => console.error('Error:', error));
"
```

## 🚀 Uso de Scripts

### Scripts Disponibles

```bash
# Recordatorios de clases (24 horas antes)
npm run send-class-reminders

# Notificaciones de clases por terminarse
npm run send-classes-running-out

# Notificaciones de vencimiento de paquetes (7 días antes)
npm run send-expirations

# Notificaciones de cumpleaños (diario)
npm run send-birthdays
```

### Configurar Tareas Programadas (Cron)

Para producción, configurar cron jobs para ejecutar automáticamente:

```bash
# Editar crontab
crontab -e

# Agregar estas líneas (ejecutar diario a las 8 AM)
0 8 * * * cd /ruta/al/proyecto && npm run send-class-reminders
0 8 * * * cd /ruta/al/proyecto && npm run send-classes-running-out
0 8 * * * cd /ruta/al/proyecto && npm run send-expirations
0 8 * * * cd /ruta/al/proyecto && npm run send-birthdays
```

## 📝 Endpoints de API

### POST /api/auth/forgot-password
Solicita recuperación de contraseña.

**Body**:
```json
{
  "correo": "cliente@email.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Si el email existe, recibirás un enlace para restablecer tu contraseña"
}
```

### POST /api/auth/reset-password
Restablece la contraseña usando el token.

**Body**:
```json
{
  "token": "token-de-recuperacion",
  "correo": "cliente@email.com",
  "password": "nueva-contraseña-segura"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Contraseña restablecida exitosamente"
}
```

## 🎯 Páginas Frontend

### /forgot-password
Página para solicitar recuperación de contraseña.
- Formulario de email
- Validación de email
- Mensaje de éxito/error

### /reset-password
Página para restablecer contraseña.
- Formulario de nueva contraseña
- Validación de requisitos de contraseña
- Confirmación de contraseña
- Validación de token

## 📊 Logging de Notificaciones

Todas las notificaciones se registran en la tabla `notification_log`:
- **ID**: Identificador único
- **user_id**: ID del usuario
- **type**: Tipo de notificación
- **subject**: Asunto del email
- **sent_at**: Fecha y hora de envío
- **status**: Estado (sent, failed)
- **error_message**: Mensaje de error si falla
- **created_at**: Fecha de creación del registro

## 🔧 Personalización

### Modificar Logo
El logo se carga automáticamente desde `public/Logo.png`. Para usar una URL externa:
1. Actualizar `LOGO_URL` en `.env`
2. O modificar `lib/email-templates.js` línea 8

### Modificar Colores
Editar `lib/email-templates.js`:
- **Header**: Cambiar `background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`
- **Botones**: Cambiar `background-color: #25D366` (WhatsApp verde)
- **Info boxes**: Cambiar colores de fondo y bordes

### Modificar Textos
Editar los métodos en `lib/email-templates.js`:
- `getClassConfirmationTemplate()`
- `getClassReminderTemplate()`
- `getClassesRunningOutTemplate()`
- `getPackageExpirationTemplate()`
- `getBirthdayTemplate()`
- `getPasswordResetTemplate()`
- `getPasswordResetSuccessTemplate()`
- `getWelcomeTemplate()`

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Emails no se envían
- Verificar credenciales en `.env`
- Verificar que la contraseña de aplicación sea correcta
- Verificar que el servicio de email esté configurado correctamente
- Revisar logs del servidor para errores

#### 2. Logo no se muestra
- Verificar que el archivo `public/Logo.png` exista
- Verificar que la URL del logo sea accesible
- En producción, usar una URL pública o CDN
- El sistema intenta cargar el logo como base64 automáticamente

#### 3. Emails van a spam
- Verificar configuración SPF/DKIM del dominio
- Usar un servicio de email profesional (SendGrid, Mailgun, AWS SES)
- Verificar que el contenido no sea considerado spam
- Verificar que el remitente sea profesional y verificado

#### 4. Enlaces no funcionan
- Verificar que `FRONTEND_URL` esté configurado correctamente
- Verificar que las rutas existan en el frontend
- Verificar que los tokens no hayan expirado
- En producción, usar HTTPS para enlaces seguros

## ✅ Checklist de Implementación

- [x] Plantillas HTML elegantes con logo
- [x] Confirmación de clase
- [x] Recordatorio de clase (24h antes)
- [x] Clases por terminarse
- [x] Paquete por vencer (7 días antes)
- [x] Feliz cumpleaños
- [x] Recuperación de contraseña
- [x] Contraseña restablecida
- [x] Bienvenida
- [x] Scripts de notificaciones automáticas
- [x] Endpoints de API
- [x] Páginas frontend
- [x] Logging de notificaciones
- [x] Documentación completa

## 🎉 Resultado

El sistema de emails está completamente implementado y listo para usar. Todas las plantillas son elegantes, incluyen el logo del negocio, y están optimizadas para todos los clientes de email. Los emails se envían automáticamente cuando corresponde, y también se pueden enviar manualmente usando los scripts.






