# 📧 Guía Paso a Paso: Configurar Sistema de Emails

## 🎯 Resumen
Esta guía te ayudará a configurar el sistema de emails de PilatesMermaid paso a paso.

## 📋 Paso 1: Configurar Variables de Entorno

### 1.1 Crear archivo `.env`
Si no existe, crea un archivo `.env` en la raíz del proyecto (junto a `package.json`).

### 1.2 Agregar variables de email
Abre el archivo `.env` y agrega estas líneas:

```env
# Email Configuration
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-aqui

# Frontend URL (para enlaces de recuperación de contraseña)
FRONTEND_URL=http://localhost:3000

# Logo URL (opcional, por defecto usa el logo local)
LOGO_URL=https://pilatesmermaid.com/Logo.png
```

**⚠️ Importante**: 
- Reemplaza `tu-email@gmail.com` con tu email de Gmail
- `EMAIL_PASSWORD` NO es tu contraseña normal de Gmail, es una contraseña de aplicación (ver siguiente paso)
- `FRONTEND_URL` debe ser la URL de tu aplicación frontend

## 📧 Paso 2: Configurar Gmail

### 2.1 Habilitar Verificación en 2 Pasos
1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Haz clic en "Seguridad" en el menú lateral
3. Busca "Verificación en 2 pasos"
4. Haz clic en "Activar" y sigue las instrucciones
5. **Es obligatorio** activar la verificación en 2 pasos para generar contraseñas de aplicación

### 2.2 Generar Contraseña de Aplicación
1. Ve a: https://myaccount.google.com/apppasswords
   - O ve a: https://myaccount.google.com/ → Seguridad → Contraseñas de aplicaciones
2. Si no aparece la opción, asegúrate de tener la verificación en 2 pasos activada
3. En "Seleccionar app", elige "Correo"
4. En "Seleccionar dispositivo", elige "Otro (nombre personalizado)"
5. Escribe: `PilatesMermaid`
6. Haz clic en "Generar"
7. **Copia la contraseña generada** (16 caracteres, formato: `xxxx xxxx xxxx xxxx`)
8. **Pégala en `EMAIL_PASSWORD` en tu archivo `.env`** (sin espacios)

**Ejemplo**:
```
EMAIL_PASSWORD=abcd efgh ijkl mnop
```
Debe quedar así (sin espacios):
```
EMAIL_PASSWORD=abcdefghijklmnop
```

## 🧪 Paso 3: Probar Configuración

### 3.1 Probar envío de email
Crea un archivo de prueba `test-email.js` en la raíz del proyecto:

```javascript
const { EmailService } = require('./lib/email.js')

async function testEmail() {
  const emailService = new EmailService()
  
  console.log('📧 Enviando email de prueba...')
  
  const result = await emailService.sendEmail(
    'tu-email@gmail.com', // Tu email
    'Prueba de Email - PilatesMermaid',
    '<h1>¡Hola!</h1><p>Este es un email de prueba del sistema de PilatesMermaid.</p>'
  )
  
  if (result.success) {
    console.log('✅ Email enviado exitosamente!')
    console.log('Message ID:', result.messageId)
  } else {
    console.error('❌ Error enviando email:', result.error)
  }
}

testEmail()
```

### 3.2 Ejecutar prueba
```bash
node test-email.js
```

### 3.3 Verificar resultado
- Si el email se envía exitosamente, verás `✅ Email enviado exitosamente!`
- Revisa tu bandeja de entrada (y spam) para ver el email
- Si hay un error, revisa los mensajes de error

## 🔧 Paso 4: Configurar Scripts Automáticos (Opcional)

### 4.1 Configurar Cron Jobs (Linux/Mac)
Para que los emails se envíen automáticamente, configura cron jobs:

```bash
# Editar crontab
crontab -e

# Agregar estas líneas (ejecutar diario a las 8 AM)
0 8 * * * cd /ruta/al/proyecto && npm run send-class-reminders
0 8 * * * cd /ruta/al/proyecto && npm run send-classes-running-out
0 8 * * * cd /ruta/al/proyecto && npm run send-expirations
0 8 * * * cd /ruta/al/proyecto && npm run send-birthdays
```

### 4.2 Configurar Tareas Programadas (Windows)
1. Abre "Programador de tareas" (Task Scheduler)
2. Crea una nueva tarea básica
3. Configura para ejecutar diario a las 8:00 AM
4. Acción: Iniciar un programa
5. Programa: `node`
6. Argumentos: `scripts/send-class-reminders.js`
7. Iniciar en: `D:\PilatesWEBAPP`

Repite para los otros scripts:
- `send-classes-running-out.js`
- `send-expirations.js`
- `send-birthdays.js`

## 📝 Paso 5: Verificar Configuración

### 5.1 Verificar variables de entorno
```bash
# En Windows PowerShell
$env:EMAIL_USER
$env:EMAIL_PASSWORD

# En Linux/Mac
echo $EMAIL_USER
echo $EMAIL_PASSWORD
```

### 5.2 Probar endpoint de recuperación de contraseña
1. Inicia el servidor: `npm run server`
2. Abre tu navegador en: `http://localhost:3000/forgot-password`
3. Ingresa un email válido
4. Verifica que recibas el email de recuperación

### 5.3 Probar confirmación de clase
1. Inicia sesión como cliente
2. Reserva una clase
3. Verifica que recibas el email de confirmación

## 🐛 Solución de Problemas

### Problema 1: "Error: Invalid login"
**Solución**:
- Verifica que `EMAIL_USER` sea correcto
- Verifica que `EMAIL_PASSWORD` sea la contraseña de aplicación (no tu contraseña normal)
- Asegúrate de haber eliminado los espacios de la contraseña de aplicación
- Verifica que la verificación en 2 pasos esté activada

### Problema 2: "Error: Connection timeout"
**Solución**:
- Verifica tu conexión a internet
- Verifica que el puerto 587 no esté bloqueado
- Prueba con otro proveedor de email (SendGrid, Mailgun, etc.)

### Problema 3: "Logo no se muestra"
**Solución**:
- Verifica que `public/Logo.png` exista
- Verifica que el logo tenga el formato correcto (PNG, JPG, SVG)
- En producción, usa una URL pública o CDN para el logo

### Problema 4: "Emails van a spam"
**Solución**:
- Verifica configuración SPF/DKIM del dominio
- Usa un servicio de email profesional (SendGrid, Mailgun, AWS SES)
- Verifica que el contenido no sea considerado spam
- Agrega tu email a la lista de contactos

### Problema 5: "Enlaces no funcionan"
**Solución**:
- Verifica que `FRONTEND_URL` esté configurado correctamente
- Verifica que las rutas existan en el frontend
- En producción, usa HTTPS para enlaces seguros

## 📚 Recursos Adicionales

### Documentación
- **SISTEMA_EMAILS.md**: Documentación completa del sistema de emails
- **CONFIGURACION_EMAILS.md**: Guía de configuración detallada
- **GUIA_EMAILS.md**: Guía de uso de los emails

### Enlaces Útiles
- Gmail App Passwords: https://myaccount.google.com/apppasswords
- Google Account Security: https://myaccount.google.com/security
- Nodemailer Documentation: https://nodemailer.com/

## ✅ Checklist de Configuración

- [ ] Archivo `.env` creado con variables de email
- [ ] Verificación en 2 pasos activada en Gmail
- [ ] Contraseña de aplicación generada
- [ ] `EMAIL_PASSWORD` configurado en `.env`
- [ ] `FRONTEND_URL` configurado en `.env`
- [ ] Email de prueba enviado exitosamente
- [ ] Logo configurado (local o URL)
- [ ] Scripts de notificaciones funcionando
- [ ] Cron jobs configurados (opcional)
- [ ] Endpoints de recuperación de contraseña funcionando
- [ ] Páginas frontend de recuperación funcionando

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

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs del servidor
2. Verifica que las variables de entorno estén configuradas correctamente
3. Prueba con un email de prueba
4. Revisa la documentación adicional

---

**¡Listo!** Tu sistema de emails está configurado y listo para usar. 🎉






