# ⚡ Configuración Rápida de Emails - PilatesMermaid

## 🚀 Configuración en 5 Pasos

### Paso 1: Crear archivo `.env`
Crea un archivo `.env` en la raíz del proyecto con este contenido:

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-aqui
FRONTEND_URL=http://localhost:3000
```

### Paso 2: Configurar Gmail
1. Ve a: https://myaccount.google.com/apppasswords
2. Genera una contraseña de aplicación para "Correo" y "PilatesMermaid"
3. Copia la contraseña (16 caracteres)
4. Pégala en `EMAIL_PASSWORD` en tu archivo `.env` (sin espacios)

### Paso 3: Probar configuración
```bash
node test-email.js
```

### Paso 4: Verificar email
Revisa tu bandeja de entrada (y spam) para ver el email de prueba.

### Paso 5: ¡Listo!
El sistema de emails está configurado y funcionando.

## 📧 Tipos de Emails que se Envían

1. **Confirmación de clase**: Automático al reservar
2. **Recordatorio de clase**: 24h antes (ejecutar script)
3. **Clases por terminarse**: Menos de 3 clases (ejecutar script)
4. **Paquete por vencer**: 7 días antes (ejecutar script)
5. **Feliz cumpleaños**: El día del cumpleaños (ejecutar script)
6. **Recuperación de contraseña**: Al solicitar recuperación
7. **Contraseña restablecida**: Después de restablecer
8. **Bienvenida**: Al registrarse

## 🔧 Scripts Disponibles

```bash
# Probar configuración
node test-email.js

# Recordatorios de clases (24h antes)
npm run send-class-reminders

# Clases por terminarse
npm run send-classes-running-out

# Paquetes por vencer (7 días antes)
npm run send-expirations

# Cumpleaños (diario)
npm run send-birthdays
```

## 🐛 Problemas Comunes

### Error: "Invalid login"
- Verifica que `EMAIL_PASSWORD` sea una contraseña de aplicación (no tu contraseña normal)
- Asegúrate de haber eliminado los espacios de la contraseña

### Error: "Connection timeout"
- Verifica tu conexión a internet
- Verifica que el puerto 587 no esté bloqueado

### Emails van a spam
- Agrega tu email a la lista de contactos
- Usa un servicio de email profesional (SendGrid, Mailgun, etc.)

## 📚 Documentación Completa

- **CONFIGURAR_EMAILS.md**: Guía paso a paso detallada
- **SISTEMA_EMAILS.md**: Documentación completa del sistema
- **GUIA_EMAILS.md**: Guía de uso de los emails

---

**¡Listo!** Tu sistema de emails está configurado. 🎉





