# 🚀 DEPLOYMENT PASO A PASO - GUÍA COMPLETA

## 📋 PASO 1: Preparar el Repositorio Git (5 minutos)

### 1.1 Inicializar Git
```bash
git init
```

### 1.2 Agregar todos los archivos
```bash
git add .
```

### 1.3 Hacer commit inicial
```bash
git commit -m "Initial commit - Ready for production"
```

### 1.4 Crear repositorio en GitHub
1. Ve a: https://github.com
2. Inicia sesión (o crea una cuenta)
3. Haz clic en: **"+"** > **"New repository"**
4. Configura:
   - **Repository name**: `pilates-mermaid`
   - **Description**: `Sistema de gestión para estudio de Pilates`
   - **Visibility**: Private (recomendado) o Public
   - **NO** marques "Add README" (ya tenemos uno)
   - **NO** marques "Add .gitignore" (ya tenemos uno)
5. Haz clic en: **"Create repository"**

### 1.5 Conectar el repositorio local con GitHub
```bash
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
```

**⚠️ IMPORTANTE**: Reemplaza `TU-USUARIO` con tu nombre de usuario de GitHub

### 1.6 Subir el código a GitHub
```bash
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANTE**: Si GitHub te pide autenticación:
- Usa un **Personal Access Token** (no tu contraseña)
- Para crear uno: GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
- Permisos necesarios: `repo` (acceso completo a repositorios)

---

## 🚀 PASO 2: Deploy en Render (10 minutos)

### 2.1 Crear cuenta en Render
1. Ve a: **https://render.com**
2. Haz clic en: **"Get Started for Free"**
3. Inicia sesión con **GitHub**
4. Autoriza Render para acceder a tus repositorios

### 2.2 Crear Web Service
1. Haz clic en: **"New"** > **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Selecciona: `pilates-mermaid`

### 2.3 Configurar el servicio
- **Name**: `pilates-mermaid`
- **Environment**: `Node`
- **Region**: `Oregon (US West)` (más cerca de México)
- **Branch**: `main`
- **Root Directory**: `/` (raíz, dejar vacío)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (para empezar)

### 2.4 Configurar Variables de Entorno
Haz clic en **"Advanced"** y agrega estas variables:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=pilates-mermaid-secret-key-production-2024-super-seguro
FRONTEND_URL=https://pilates-mermaid.onrender.com
CORS_ORIGIN=https://pilates-mermaid.onrender.com
NEXT_PUBLIC_API_URL=https://pilates-mermaid.onrender.com
DATABASE_URL=./data/pilates_mermaid.db
STUDIO_WHATSAPP_PHONE=5259581062606
```

**⚠️ IMPORTANTE**: 
- Reemplaza `pilates-mermaid.onrender.com` con la URL que Render te dará después del deployment
- El `JWT_SECRET` debe ser único y seguro (puedes generar uno con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)

### 2.5 Deploy
1. Haz clic en: **"Create Web Service"**
2. Espera 5-10 minutos mientras Render construye y despliega tu app
3. Verás los logs en tiempo real
4. Cuando termine, verás: **"Your service is live at: https://pilates-mermaid-XXXX.onrender.com"**

### 2.6 Actualizar Variables de Entorno
Después del primer deployment, actualiza estas variables con la URL real:
- `FRONTEND_URL`: `https://pilates-mermaid-XXXX.onrender.com`
- `CORS_ORIGIN`: `https://pilates-mermaid-XXXX.onrender.com`
- `NEXT_PUBLIC_API_URL`: `https://pilates-mermaid-XXXX.onrender.com`

Luego haz clic en **"Manual Deploy"** > **"Deploy latest commit"**

---

## ✅ PASO 3: Verificar el Deployment (5 minutos)

### 3.1 Verificar que la app funciona
1. Visita la URL de tu app: `https://pilates-mermaid-XXXX.onrender.com`
2. Verifica que la página carga
3. Verifica que no hay errores en la consola (F12)

### 3.2 Probar Login
1. Haz clic en: **"Login"**
2. Prueba con estas credenciales:
   - **Admin**: `admin@pilatesmermaid.com` / `admin123`
   - **Coach**: `esmeralda@pilatesmermaid.com` / `coach123`
   - **Cliente**: `laura@example.com` / `cliente123`

### 3.3 Verificar Funcionalidades
- ✅ Login funciona
- ✅ Dashboard carga
- ✅ Clases se muestran
- ✅ Pagos funcionan
- ✅ WhatsApp funciona
- ✅ Selector de idioma funciona

---

## 🐛 SOLUCIÓN DE PROBLEMAS

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

### Problema: "Port already in use"
**Solución**:
1. Render usa el puerto automáticamente
2. **NO** configures `PORT` manualmente
3. O elimina `PORT` de las variables de entorno
4. Render proporciona el puerto en `process.env.PORT`

---

## ✅ CHECKLIST FINAL

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

**✅ ¡ÉXITO EN TU DEPLOYMENT!**



