# 🚀 CÓMO HACER EL DEPLOY - PASO A PASO

## ✅ PASO 1: Crear Repositorio en GitHub (2 minutos)

### 1.1 Ir a GitHub
```
🌐 https://github.com/new
```

### 1.2 Configurar el Repositorio
- **Repository name**: `pilates-mermaid`
- **Description**: `Sistema de gestión para estudio de Pilates`
- **Visibility**: 
  - ✅ **Private** (recomendado)
  - O **Public**
- **NO marcar**:
  - ❌ Add a README file
  - ❌ Add .gitignore
  - ❌ Choose a license

### 1.3 Crear el Repositorio
- Haz clic en: **"Create repository"**
- **Copia la URL** que aparece (algo como: `https://github.com/TU-USUARIO/pilates-mermaid.git`)

---

## 🔗 PASO 2: Conectar con GitHub (1 minuto)

### 2.1 Ejecuta estos comandos en PowerShell:

```bash
# Reemplaza TU-USUARIO con tu nombre de usuario de GitHub
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
git branch -M main
git push -u origin main
```

### 2.2 Si te pide autenticación:

**Crear Personal Access Token**:
1. Ve a: **https://github.com/settings/tokens**
2. Haz clic en: **"Generate new token"** > **"Generate new token (classic)"**
3. Configura:
   - **Note**: `Render Deployment`
   - **Expiration**: `90 days`
   - **Select scopes**: Marca `repo` (acceso completo)
4. Haz clic en: **"Generate token"**
5. **Copia el token** (solo se muestra una vez)
6. Cuando Git te pida la contraseña, **usa el token** en lugar de tu contraseña

---

## 🚀 PASO 3: Deploy en Render (10 minutos)

### 3.1 Crear cuenta en Render
1. Ve a: **https://render.com**
2. Haz clic en: **"Get Started for Free"**
3. Inicia sesión con **GitHub**
4. Autoriza Render para acceder a tus repositorios

### 3.2 Crear Web Service
1. En el dashboard de Render, haz clic en: **"New"** > **"Web Service"**
2. Si no aparece tu repositorio, haz clic en **"Connect account"** o **"Configure GitHub"**
3. Selecciona tu repositorio: `pilates-mermaid`
4. Haz clic en: **"Connect"**

### 3.3 Configurar el Servicio
- **Name**: `pilates-mermaid`
- **Environment**: `Node`
- **Region**: `Oregon (US West)` (más cerca de México)
- **Branch**: `main`
- **Root Directory**: `/` (dejar vacío)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (para empezar)

### 3.4 Configurar Variables de Entorno
Haz clic en **"Advanced"** y agrega estas variables una por una:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=pilates-mermaid-secret-key-production-2024
FRONTEND_URL=https://pilates-mermaid.onrender.com
CORS_ORIGIN=https://pilates-mermaid.onrender.com
NEXT_PUBLIC_API_URL=
DATABASE_URL=./data/pilates_mermaid.db
STUDIO_WHATSAPP_PHONE=5259581062606
```

**⚠️ IMPORTANTE**: 
- Deja `NEXT_PUBLIC_API_URL` **vacío** (usa rutas relativas en producción)
- Después del deployment, Render te dará una URL real (algo como: `https://pilates-mermaid-XXXX.onrender.com`)
- Actualiza `FRONTEND_URL` y `CORS_ORIGIN` con esa URL real después del primer deployment

### 3.5 Crear el Servicio
1. Haz clic en: **"Create Web Service"**
2. Render comenzará a construir tu aplicación
3. Verás los logs en tiempo real
4. Esto tomará **5-10 minutos**

### 3.6 Esperar el Deployment
Verás mensajes como:
- "Cloning repository..."
- "Installing dependencies..."
- "Building application..."
- "Starting application..."

Cuando termine, verás:
**"Your service is live at: https://pilates-mermaid-XXXX.onrender.com"**

### 3.7 Actualizar Variables de Entorno (DESPUÉS del primer deployment)
1. Ve a tu servicio en Render
2. Haz clic en: **"Environment"**
3. Actualiza estas variables con la URL real que Render te dio:
   - `FRONTEND_URL`: `https://pilates-mermaid-XXXX.onrender.com`
   - `CORS_ORIGIN`: `https://pilates-mermaid-XXXX.onrender.com`
4. Haz clic en: **"Save Changes"**
5. Ve a: **"Manual Deploy"** > **"Deploy latest commit"**

---

## ✅ PASO 4: Verificar el Deployment (5 minutos)

### 4.1 Visitar la App
1. Ve a la URL que Render te dio: `https://pilates-mermaid-XXXX.onrender.com`
2. Verifica que la página carga
3. Verifica que no hay errores en la consola (F12)

### 4.2 Probar Login
1. Haz clic en: **"Login"**
2. Prueba con estas credenciales:
   - **Admin**: `admin@pilatesmermaid.com` / `admin123`
   - **Coach**: `esmeralda@pilatesmermaid.com` / `coach123`
   - **Cliente**: `laura@example.com` / `cliente123`

### 4.3 Verificar Funcionalidades
- ✅ Login funciona
- ✅ Dashboard carga
- ✅ Clases se muestran
- ✅ Pagos funcionan
- ✅ WhatsApp funciona
- ✅ Selector de idioma funciona

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: "Git push failed - authentication required"
**Solución**:
1. Crea un **Personal Access Token** en GitHub
2. Usa el token como contraseña cuando Git te lo pida
3. O usa GitHub CLI: `gh auth login`

### Problema: "Cannot connect to database"
**Solución**:
1. Ve a Render > Tu servicio > "Logs"
2. Verifica que `DATABASE_URL` esté configurado
3. Render crea el directorio `data` automáticamente
4. Si el error persiste, verifica que la base de datos existe

### Problema: "CORS error"
**Solución**:
1. Ve a Render > Tu servicio > "Environment"
2. Verifica que `CORS_ORIGIN` incluya tu URL exacta
3. Verifica que `FRONTEND_URL` esté configurado
4. **Redeploy** el servicio

### Problema: "JWT_SECRET not found"
**Solución**:
1. Ve a Render > Tu servicio > "Environment"
2. Agrega `JWT_SECRET=pilates-mermaid-secret-key-production-2024`
3. **Redeploy** el servicio

### Problema: "Next.js build failed"
**Solución**:
1. Verifica los logs en Render
2. Verifica que `npm install` se ejecutó correctamente
3. Verifica que `npm run build` se ejecutó correctamente
4. Verifica que no hay errores de TypeScript

---

## 📋 CHECKLIST FINAL

- [ ] Repositorio en GitHub creado
- [ ] Código subido a GitHub
- [ ] Cuenta en Render creada
- [ ] Web Service en Render creado
- [ ] Variables de entorno configuradas
- [ ] Deployment completado
- [ ] URL de la app funcionando
- [ ] Login funcionando
- [ ] Dashboard funcionando
- [ ] Clases funcionando
- [ ] Pagos funcionando
- [ ] Selector de idioma funcionando

---

## 🎯 CREDENCIALES DE PRUEBA

**Admin**:
- Email: `admin@pilatesmermaid.com`
- Password: `admin123`

**Coach**:
- Email: `esmeralda@pilatesmermaid.com`
- Password: `coach123`

**Cliente**:
- Email: `laura@example.com`
- Password: `cliente123`

---

## 🚀 ¡LISTO PARA ENTREGAR!

**Tiempo total**: ~15-20 minutos

**URL de tu app**: `https://pilates-mermaid-XXXX.onrender.com` (o tu URL)

**✅ ENTREGADO**

---

## 📞 SI ALGO FALLA

1. **Revisa** los logs en Render
2. **Verifica** las variables de entorno
3. **Verifica** que `NODE_ENV=production`
4. **Verifica** que `DATABASE_URL` esté configurado
5. **Verifica** que `CORS_ORIGIN` incluya tu URL

---

## 🎯 RESUMEN RÁPIDO

1. **GitHub**: Crear repositorio → Conectar → Push
2. **Render**: Crear cuenta → Crear Web Service → Configurar → Deploy
3. **Verificar**: Visitar URL → Probar login → Verificar funciones

---

**✅ ¡ÉXITO EN TU DEPLOYMENT!**

