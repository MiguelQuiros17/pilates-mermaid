# 📧 Configurar Sistema de Emails - Guía Rápida

## 🚀 Configuración en 3 Pasos

### ✅ Paso 1: Crear archivo `.env`

1. En la raíz del proyecto (donde está `package.json`), crea un archivo llamado **`.env`**

2. Copia este contenido y pégalo en el archivo `.env`:

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-aqui
FRONTEND_URL=http://localhost:3000
LOGO_URL=https://pilatesmermaid.com/Logo.png
```

3. **IMPORTANTE**: 
   - Reemplaza `tu-email@gmail.com` con **TU email de Gmail**
   - `EMAIL_PASSWORD` **NO es tu contraseña normal**, es una contraseña de aplicación (ver Paso 2)
   - Deja `FRONTEND_URL` como está si usas localhost

---

### 🔐 Paso 2: Obtener Contraseña de Aplicación de Gmail

#### 2.1 Activar Verificación en 2 Pasos (OBLIGATORIO)

1. Ve a: **https://myaccount.google.com/**
2. Haz clic en **"Seguridad"** (menú lateral izquierdo)
3. Busca **"Verificación en 2 pasos"**
4. Haz clic en **"Activar"** y sigue las instrucciones
5. ⚠️ **ES OBLIGATORIO** activar la verificación en 2 pasos para generar contraseñas de aplicación

#### 2.2 Generar Contraseña de Aplicación

1. Ve a: **https://myaccount.google.com/apppasswords**
   - O: Google → Seguridad → Contraseñas de aplicaciones

2. Si no aparece la opción:
   - Asegúrate de tener la verificación en 2 pasos activada
   - Puede tardar unos minutos en aparecer después de activarla

3. En **"Seleccionar app"**, elige: **"Correo"**

4. En **"Seleccionar dispositivo"**, elige: **"Otro (nombre personalizado)"**

5. Escribe: **PilatesMermaid**

6. Haz clic en **"Generar"**

7. Google te mostrará una contraseña de **16 caracteres**:
   ```
   abcd efgh ijkl mnop
   ```

8. **COPIA esta contraseña** (sin espacios)

9. **PÉGALA en tu archivo `.env`** en `EMAIL_PASSWORD`:
   ```env
   EMAIL_PASSWORD=abcdefghijklmnop
   ```
   
   ⚠️ **IMPORTANTE**: Sin espacios, todo junto

---

### 🧪 Paso 3: Probar Configuración

1. Abre tu terminal en la raíz del proyecto

2. Ejecuta el script de prueba:
   ```bash
   node test-email.js
   ```

3. **Si todo está correcto**, verás:
   ```
   ✅ Email enviado exitosamente!
   📬 Revisa tu bandeja de entrada (y spam) para ver el email.
   🎉 ¡Configuración correcta!
   ```

4. **Revisa tu bandeja de entrada** (y spam) para ver el email de prueba

---

## 📋 Ejemplo Completo de `.env`

```env
# JWT Secret
JWT_SECRET=pilates-mermaid-secret-key-2024

# WhatsApp Business Number
STUDIO_WHATSAPP_PHONE=5259581062606

# Email Configuration
EMAIL_USER=mi-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop1234

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Logo URL (opcional)
LOGO_URL=https://pilatesmermaid.com/Logo.png

# Base de datos
DATABASE_URL=./data/pilates_mermaid.db

# Entorno
NODE_ENV=development

# Puerto del servidor backend
PORT=3001
```

---

## ❌ Problemas Comunes

### Error: "Variables de entorno no configuradas"

**Solución**:
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que `EMAIL_USER` y `EMAIL_PASSWORD` estén configurados
- Verifica que no haya espacios extra en las líneas del `.env`

### Error: "Invalid login"

**Solución**:
- Verifica que `EMAIL_PASSWORD` sea una contraseña de aplicación (no tu contraseña normal)
- Verifica que hayas eliminado los espacios de la contraseña
- Verifica que la verificación en 2 pasos esté activada

### Error: "Connection timeout"

**Solución**:
- Verifica tu conexión a internet
- Verifica que el puerto 587 no esté bloqueado por tu firewall

### Emails van a spam

**Solución**:
- Agrega tu email a la lista de contactos
- Usa un servicio de email profesional (SendGrid, Mailgun) para producción

---

## ✅ Checklist de Configuración

- [ ] Archivo `.env` creado en la raíz del proyecto
- [ ] `EMAIL_USER` configurado con tu email de Gmail
- [ ] Verificación en 2 pasos activada en Gmail
- [ ] Contraseña de aplicación generada
- [ ] `EMAIL_PASSWORD` configurado (sin espacios)
- [ ] `FRONTEND_URL` configurado
- [ ] Script de prueba ejecutado exitosamente
- [ ] Email de prueba recibido

---

## 📚 Documentación Adicional

- **CONFIGURAR_EMAILS.md**: Guía detallada paso a paso
- **CONFIGURACION_RAPIDA_EMAILS.md**: Guía rápida de configuración
- **COMO_CONFIGURAR_EMAILS.txt**: Guía en texto plano
- **SISTEMA_EMAILS.md**: Documentación completa del sistema
- **GUIA_EMAILS.md**: Guía de uso de los emails

---

## 🎉 ¡Listo!

Una vez configurado, el sistema de emails funcionará automáticamente:

- ✅ Confirmaciones de clases se envían automáticamente
- ✅ Recordatorios de clases (24h antes)
- ✅ Notificaciones de vencimiento (7 días antes)
- ✅ Felicitaciones de cumpleaños
- ✅ Recuperación de contraseña
- ✅ Bienvenida al registrarse

Todos los emails incluyen el logo del negocio y están diseñados de forma elegante y profesional.

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas con la configuración:

1. Revisa los logs del servidor
2. Verifica que las variables de entorno estén configuradas correctamente
3. Prueba con el script `test-email.js`
4. Revisa la documentación adicional

---

**¡Buena suerte!** 🚀




