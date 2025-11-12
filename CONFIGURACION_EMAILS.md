# 📧 Configuración de Emails - PilatesMermaid

## Resumen
Esta guía te ayudará a configurar el sistema de emails de PilatesMermaid para que funcione correctamente.

## 🔧 Configuración Inicial

### 1. Variables de Entorno
Crear o actualizar el archivo `.env` en la raíz del proyecto:

```env
# Email Configuration (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-aqui

# Frontend URL (para enlaces de recuperación de contraseña)
FRONTEND_URL=http://localhost:3000

# Logo URL (opcional, por defecto usa el logo local)
LOGO_URL=https://pilatesmermaid.com/Logo.png
```

### 2. Configurar Gmail

#### Paso 1: Habilitar Verificación en 2 Pasos
1. Ir a tu cuenta de Google: https://myaccount.google.com/
2. Ir a "Seguridad"
3. Habilitar "Verificación en 2 pasos"

#### Paso 2: Generar Contraseña de Aplicación
1. Ir a: https://myaccount.google.com/apppasswords
2. Seleccionar "Correo" y "Otro (nombre personalizado)"
3. Ingresar "PilatesMermaid"
4. Hacer clic en "Generar"
5. Copiar la contraseña generada (16 caracteres)
6. Usar esta contraseña en `EMAIL_PASSWORD` en el archivo `.env`

### 3. Probar Configuración

#### Probar Email de Prueba
```bash
# Crear un script de prueba
node -e "
const { EmailService } = require('./lib/email.js');
const emailService = new EmailService();
emailService.sendEmail('tu-email@gmail.com', 'Prueba', '<h1>Prueba</h1>')
  .then(result => console.log('Resultado:', result))
  .catch(error => console.error('Error:', error));
"
```

## 📨 Tipos de Emails Configurados

### 1. ✅ Confirmación de Clase
- **Se envía**: Automáticamente cuando un cliente reserva una clase
- **Contenido**: Detalles de la clase, recordatorios
- **Incluye**: Logo, información de la clase, botón de WhatsApp

### 2. 🔔 Recordatorio de Clase
- **Se envía**: 24 horas antes de la clase (ejecutar script manualmente o con cron)
- **Contenido**: Recordatorio con detalles de la clase del día siguiente
- **Script**: `npm run send-class-reminders`

### 3. ⚠️ Clases por Terminarse
- **Se envía**: Cuando un cliente tiene menos de 3 clases restantes
- **Contenido**: Advertencia de que quedan pocas clases
- **Script**: `npm run send-classes-running-out`

### 4. ⏰ Paquete por Vencer
- **Se envía**: 7 días antes del vencimiento del paquete
- **Contenido**: Alerta de vencimiento, días restantes
- **Script**: `npm run send-expirations`

### 5. 🎂 Feliz Cumpleaños
- **Se envía**: El día del cumpleaños del cliente
- **Contenido**: Felicitación personalizada
- **Script**: `npm run send-birthdays`

### 6. 🔐 Recuperación de Contraseña
- **Se envía**: Cuando un usuario solicita recuperar su contraseña
- **Contenido**: Enlace de recuperación, token de seguridad
- **Endpoint**: `POST /api/auth/forgot-password`

### 7. ✅ Contraseña Restablecida
- **Se envía**: Después de que un usuario restablece su contraseña
- **Contenido**: Confirmación de cambio
- **Endpoint**: `POST /api/auth/reset-password`

### 8. 👋 Bienvenida
- **Se envía**: Cuando un nuevo cliente se registra
- **Contenido**: Mensaje de bienvenida, próximos pasos
- **Automático**: Se envía durante el registro

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

#### Linux/Mac:
```bash
# Editar crontab
crontab -e

# Agregar estas líneas (ejecutar diario a las 8 AM)
0 8 * * * cd /ruta/al/proyecto && npm run send-class-reminders
0 8 * * * cd /ruta/al/proyecto && npm run send-classes-running-out
0 8 * * * cd /ruta/al/proyecto && npm run send-expirations
0 8 * * * cd /ruta/al/proyecto && npm run send-birthdays
```

#### Windows (Task Scheduler):
1. Abrir "Programador de tareas"
2. Crear nueva tarea básica
3. Configurar para ejecutar diario a las 8:00 AM
4. Acción: Iniciar un programa
5. Programa: `node`
6. Argumentos: `scripts/send-class-reminders.js`
7. Iniciar en: `D:\PilatesWEBAPP`

## 🎨 Personalización de Plantillas

### Modificar Logo
El logo se carga automáticamente desde `public/Logo.png`. Para usar una URL externa:
1. Actualizar `LOGO_URL` en `.env`
2. O modificar `lib/email-templates.js` línea 10

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

## 🔍 Verificar Funcionamiento

### 1. Verificar Logs
Los emails se registran en la tabla `notification_log`. Para verificar:

```sql
SELECT * FROM notification_log 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Verificar Emails Enviados
- Revisar la bandeja de entrada del email configurado
- Revisar la carpeta de spam si no aparecen
- Verificar logs del servidor para errores

### 3. Probar Endpoints
```bash
# Probar recuperación de contraseña
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"correo": "cliente@email.com"}'
```

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Emails no se envían
- **Verificar credenciales**: Revisar `EMAIL_USER` y `EMAIL_PASSWORD` en `.env`
- **Verificar contraseña de aplicación**: Debe ser una contraseña de aplicación, no la contraseña regular
- **Verificar servicio de email**: Probar con un email de prueba
- **Revisar logs**: Ver logs del servidor para errores

#### 2. Logo no se muestra
- **Verificar archivo**: Asegurar que `public/Logo.png` existe
- **Verificar URL**: Si usa URL externa, verificar que sea accesible
- **Verificar formato**: El logo debe ser PNG, JPG o SVG
- **Probar base64**: El sistema intenta cargar el logo como base64 automáticamente

#### 3. Emails van a spam
- **Verificar SPF/DKIM**: Configurar registros SPF y DKIM en el dominio
- **Usar servicio profesional**: Considerar usar SendGrid, Mailgun o AWS SES
- **Verificar contenido**: Evitar palabras que puedan ser consideradas spam
- **Verificar remitente**: Usar un email profesional y verificado

#### 4. Enlaces no funcionan
- **Verificar FRONTEND_URL**: Debe estar configurado correctamente en `.env`
- **Verificar rutas**: Asegurar que las rutas existan en el frontend
- **Verificar tokens**: Los tokens de recuperación expiran en 1 hora
- **Verificar HTTPS**: En producción, usar HTTPS para enlaces seguros

#### 5. Scripts no funcionan
- **Verificar Node.js**: Asegurar que Node.js esté instalado y en el PATH
- **Verificar dependencias**: Ejecutar `npm install` para instalar dependencias
- **Verificar base de datos**: Asegurar que la base de datos esté configurada correctamente
- **Verificar permisos**: Asegurar que el usuario tenga permisos para ejecutar scripts

## 📚 Recursos Adicionales

### Documentación
- **Sistema de Emails**: Ver `SISTEMA_EMAILS.md`
- **Plantillas**: Ver `lib/email-templates.js`
- **Servicio de Email**: Ver `lib/email.js`

### Soporte
- **Gmail**: https://support.google.com/mail
- **Nodemailer**: https://nodemailer.com/
- **SendGrid**: https://sendgrid.com/
- **Mailgun**: https://www.mailgun.com/
- **AWS SES**: https://aws.amazon.com/ses/

## ✅ Checklist de Configuración

- [ ] Variables de entorno configuradas (`.env`)
- [ ] Gmail configurado con contraseña de aplicación
- [ ] Logo configurado (local o URL)
- [ ] FRONTEND_URL configurado
- [ ] Emails de prueba enviados exitosamente
- [ ] Scripts de notificaciones funcionando
- [ ] Cron jobs configurados (producción)
- [ ] Endpoints de recuperación de contraseña funcionando
- [ ] Páginas frontend de recuperación funcionando
- [ ] Logs de notificaciones funcionando

## 🎉 Resultado

Una vez configurado, el sistema de emails funcionará automáticamente:
- ✅ Confirmaciones de clases se envían automáticamente
- ✅ Recordatorios de clases se envían 24 horas antes
- ✅ Notificaciones de vencimiento se envían 7 días antes
- ✅ Felicitaciones de cumpleaños se envían el día del cumpleaños
- ✅ Recuperación de contraseña funciona completamente
- ✅ Bienvenida se envía al registrarse
- ✅ Todos los emails incluyen el logo del negocio
- ✅ Todos los emails son elegantes y profesionales






