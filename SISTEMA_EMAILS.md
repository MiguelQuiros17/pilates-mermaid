# 📧 Sistema de Emails - PilatesMermaid

## Resumen
Este documento describe el sistema completo de emails implementado en PilatesMermaid, incluyendo todas las plantillas elegantes, configuración, y cómo usar cada tipo de email.

## 📋 Tipos de Emails Implementados

### 1. ✅ Confirmación de Clase
- **Cuándo se envía**: Cuando un cliente reserva una clase exitosamente
- **Contenido**: Detalles de la clase (nombre, fecha, hora, coach, tipo)
- **Incluye**: Recordatorios importantes, botón de WhatsApp
- **Template**: `EmailTemplates.getClassConfirmationTemplate()`

### 2. 🔔 Recordatorio de Clase
- **Cuándo se envía**: 24 horas antes de la clase programada
- **Contenido**: Recordatorio con detalles de la clase del día siguiente
- **Incluye**: Preparación recomendada, botón de WhatsApp para cancelar
- **Template**: `EmailTemplates.getClassReminderTemplate()`
- **Script**: `scripts/send-class-reminders.js`

### 3. ⚠️ Clases por Terminarse
- **Cuándo se envía**: Cuando un cliente tiene menos de 3 clases restantes
- **Contenido**: Advertencia de que quedan pocas clases, estado del paquete
- **Incluye**: Información del paquete, clases restantes, fecha de vencimiento
- **Template**: `EmailTemplates.getClassesRunningOutTemplate()`
- **Script**: `scripts/send-classes-running-out.js`

### 4. ⏰ Paquete por Vencer
- **Cuándo se envía**: 7 días antes del vencimiento del paquete
- **Contenido**: Alerta de vencimiento, días restantes, clases restantes
- **Incluye**: Información del paquete, fecha de vencimiento, botón de renovación
- **Template**: `EmailTemplates.getPackageExpirationTemplate()`
- **Script**: `scripts/send-expiration-notifications.js`

### 5. 🎂 Feliz Cumpleaños
- **Cuándo se envía**: El día del cumpleaños del cliente
- **Contenido**: Felicitación personalizada, mensaje especial
- **Incluye**: Botón para agendar clase especial, mensaje de bienvenida
- **Template**: `EmailTemplates.getBirthdayTemplate()`
- **Script**: `scripts/send-birthday-notifications.js`

### 6. 🔐 Recuperación de Contraseña
- **Cuándo se envía**: Cuando un usuario solicita recuperar su contraseña
- **Contenido**: Enlace de recuperación, token de seguridad, instrucciones
- **Incluye**: Botón para restablecer contraseña, enlace alternativo, tiempo de expiración
- **Template**: `EmailTemplates.getPasswordResetTemplate()`
- **Endpoint**: `POST /api/auth/forgot-password`

### 7. ✅ Contraseña Restablecida
- **Cuándo se envía**: Después de que un usuario restablece su contraseña exitosamente
- **Contenido**: Confirmación de cambio, instrucciones de seguridad
- **Incluye**: Botón para reportar si no reconoces el cambio
- **Template**: `EmailTemplates.getPasswordResetSuccessTemplate()`
- **Endpoint**: `POST /api/auth/reset-password`

### 8. 👋 Bienvenida
- **Cuándo se envía**: Cuando un nuevo cliente se registra
- **Contenido**: Mensaje de bienvenida, próximos pasos
- **Incluye**: Instrucciones para comprar paquete, botón de WhatsApp
- **Template**: `EmailTemplates.getWelcomeTemplate()`
- **Endpoint**: `POST /api/auth/register` (automático)

## 🎨 Diseño de Plantillas

### Características del Diseño
- **Logo**: Incluido en el header con fondo oscuro elegante
- **Tipografía**: Inter (Google Fonts) para máxima legibilidad
- **Colores**: Paleta minimalista en grises y negro, con acentos de color según el tipo de email
- **Responsive**: Diseño adaptativo para móviles y desktop
- **Estilo**: Minimalista, elegante, profesional

### Estructura de Plantillas
1. **Header**: Logo + Título + Subtítulo
2. **Body**: Contenido principal con información relevante
3. **Info Boxes**: Cajas de información con colores según importancia
4. **Botones de Acción**: Botones de WhatsApp con estilo verde
5. **Footer**: Información de contacto, WhatsApp, ubicación, disclaimer

## ⚙️ Configuración

### 1. Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:

```env
# Email Configuration
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-aqui

# Frontend URL (para enlaces de recuperación)
FRONTEND_URL=http://localhost:3000

# Logo URL (opcional, por defecto usa el logo local)
LOGO_URL=https://pilatesmermaid.com/Logo.png
```

### 2. Configuración de Gmail
1. Ir a tu cuenta de Google
2. Habilitar la verificación en 2 pasos
3. Generar una contraseña de aplicación:
   - Ir a: https://myaccount.google.com/apppasswords
   - Seleccionar "Correo" y "Otro (nombre personalizado)"
   - Ingresar "PilatesMermaid"
   - Copiar la contraseña generada
   - Usar esta contraseña en `EMAIL_PASSWORD`

### 3. Configuración de Otros Proveedores
Puedes cambiar el proveedor de email en `lib/email.js`:

```javascript
// Para SendGrid
this.transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
})

// Para Mailgun
this.transporter = nodemailer.createTransport({
  host: 'smtp.mailgun.org',
  port: 587,
  auth: {
    user: process.env.MAILGUN_USER,
    pass: process.env.MAILGUN_PASSWORD
  }
})

// Para AWS SES
this.transporter = nodemailer.createTransport({
  SES: { ses, aws },
  sendingRate: 14
})
```

## 🚀 Uso

### 1. Envío Automático
Los emails se envían automáticamente en estos casos:
- **Confirmación de clase**: Cuando se reserva una clase
- **Bienvenida**: Cuando se registra un nuevo cliente
- **Recuperación de contraseña**: Cuando se solicita desde `/forgot-password`

### 2. Scripts de Notificaciones
Ejecutar los scripts manualmente o configurarlos como tareas programadas (cron jobs):

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

### 3. Configurar Tareas Programadas (Cron)
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

**Body:**
```json
{
  "correo": "cliente@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Si el email existe, recibirás un enlace para restablecer tu contraseña"
}
```

### POST /api/auth/reset-password
Restablece la contraseña usando el token.

**Body:**
```json
{
  "token": "token-de-recuperacion",
  "correo": "cliente@email.com",
  "password": "nueva-contraseña-segura"
}
```

**Response:**
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
- **type**: Tipo de notificación (birthday, expiration, class_confirmation, etc.)
- **subject**: Asunto del email
- **sent_at**: Fecha y hora de envío
- **status**: Estado (sent, failed)
- **error_message**: Mensaje de error si falla
- **created_at**: Fecha de creación del registro

## 🔧 Personalización

### Modificar Plantillas
Editar `lib/email-templates.js` para personalizar:
- Colores
- Textos
- Estilos
- Contenido

### Agregar Nuevos Tipos de Email
1. Crear nuevo método en `EmailTemplates`:
```javascript
static getNewEmailTemplate(param1, param2) {
  return this.getBaseTemplate({
    header: `...`,
    body: `...`,
    footer: this.getDefaultFooter()
  })
}
```

2. Agregar método en `EmailService`:
```javascript
async sendNewEmail(clientEmail, clientName, param1, param2) {
  const subject = `...`
  const html = EmailTemplates.getNewEmailTemplate(param1, param2)
  return await this.sendEmail(clientEmail, subject, html)
}
```

3. Usar en el código:
```javascript
await emailService.sendNewEmail(email, name, param1, param2)
```

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

#### 3. Emails van a spam
- Verificar configuración SPF/DKIM del dominio
- Usar un servicio de email profesional (SendGrid, Mailgun, AWS SES)
- Verificar que el contenido no sea considerado spam

#### 4. Enlaces no funcionan
- Verificar que `FRONTEND_URL` esté configurado correctamente
- Verificar que las rutas existan en el frontend
- Verificar que los tokens no hayan expirado

## 📚 Archivos Relacionados

### Backend
- `lib/email.js`: Servicio de email
- `lib/email-templates.js`: Plantillas HTML elegantes
- `server/index.js`: Endpoints de API
- `lib/database.js`: Esquema de base de datos

### Frontend
- `app/forgot-password/page.tsx`: Página de recuperación
- `app/reset-password/page.tsx`: Página de restablecimiento

### Scripts
- `scripts/send-class-reminders.js`: Recordatorios de clases
- `scripts/send-classes-running-out.js`: Clases por terminarse
- `scripts/send-expiration-notifications.js`: Vencimiento de paquetes
- `scripts/send-birthday-notifications.js`: Cumpleaños

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






