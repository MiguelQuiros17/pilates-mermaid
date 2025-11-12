# 🚀 INSTRUCCIONES FINALES - DEPLOYMENT

## ✅ PREPARACIÓN COMPLETADA

- ✅ Git inicializado
- ✅ Archivos commitados
- ✅ .gitignore creado
- ✅ Documentación creada
- ✅ URLs de API corregidas para producción
- ✅ Sistema de idiomas implementado

---

## 📋 PASO 1: Crear Repositorio en GitHub (2 minutos)

### 1.1 Ir a GitHub
```
🌐 https://github.com/new
```

### 1.2 Configurar
- **Repository name**: `pilates-mermaid`
- **Description**: `Sistema de gestión para estudio de Pilates`
- **Visibility**: Private (recomendado)
- **NO marcar**: Add README, Add .gitignore, Choose license

### 1.3 Crear
- Clic en: **"Create repository"**
- **Copiar la URL** que aparece

---

## 🔗 PASO 2: Conectar con GitHub (1 minuto)

### 2.1 Ejecutar estos comandos:
```bash
# Reemplaza TU-USUARIO con tu usuario de GitHub
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
git branch -M main
git push -u origin main
```

### 2.2 Si pide autenticación:
1. Ve a: https://github.com/settings/tokens
2. Generate new token (classic)
3. Marca: `repo` (acceso completo)
4. Copia el token
5. Usa el token como contraseña

---

## 🚀 PASO 3: Deploy en Render (10 minutos)

### 3.1 Crear cuenta
```
🌐 https://render.com
```
- Clic en: **"Get Started for Free"**
- Inicia sesión con **GitHub**
- Autoriza Render

### 3.2 Crear Web Service
- Clic en: **"New"** > **"Web Service"**
- Conecta tu repositorio: `pilates-mermaid`
- Clic en: **"Connect"**

### 3.3 Configurar
- **Name**: `pilates-mermaid`
- **Environment**: `Node`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Root Directory**: `/` (vacío)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### 3.4 Variables de Entorno
Clic en **"Advanced"** y agrega:

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
- Deja `NEXT_PUBLIC_API_URL` vacío (usa rutas relativas)
- Render te dará una URL después del deployment
- Actualiza `FRONTEND_URL` y `CORS_ORIGIN` con la URL real después

### 3.5 Crear Servicio
- Clic en: **"Create Web Service"**
- Espera 5-10 minutos
- Verás los logs en tiempo real
- Cuando termine: **"Your service is live at: https://pilates-mermaid-XXXX.onrender.com"**

### 3.6 Actualizar Variables (DESPUÉS del primer deployment)
1. Ve a tu servicio en Render
2. Clic en: **"Environment"**
3. Actualiza con la URL real:
   - `FRONTEND_URL`: `https://pilates-mermaid-XXXX.onrender.com`
   - `CORS_ORIGIN`: `https://pilates-mermaid-XXXX.onrender.com`
4. Clic en: **"Save Changes"**
5. Ve a: **"Manual Deploy"** > **"Deploy latest commit"**

---

## ✅ PASO 4: Verificar (5 minutos)

### 4.1 Visitar URL
```
🌐 https://pilates-mermaid-XXXX.onrender.com
```

### 4.2 Probar Login
- **Admin**: `admin@pilatesmermaid.com` / `admin123`
- **Coach**: `esmeralda@pilatesmermaid.com` / `coach123`
- **Cliente**: `laura@example.com` / `cliente123`

### 4.3 Verificar
- ✅ Login funciona
- ✅ Dashboard carga
- ✅ Clases se muestran
- ✅ Pagos funcionan
- ✅ WhatsApp funciona
- ✅ Selector de idioma funciona

---

## 🎯 ¡LISTO!

**URL**: `https://pilates-mermaid-XXXX.onrender.com`

**✅ ENTREGADO**

---

## 📞 SI ALGO FALLA

1. **Revisa logs** en Render
2. **Verifica variables** de entorno
3. **Verifica** que `NODE_ENV=production`
4. **Verifica** que `DATABASE_URL` esté configurado
5. **Verifica** que `CORS_ORIGIN` incluya tu URL

---

## 🚀 COMANDOS RÁPIDOS

```bash
# Conectar con GitHub
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
git branch -M main
git push -u origin main
```

---

**✅ ¡ÉXITO EN TU DEPLOYMENT!**


