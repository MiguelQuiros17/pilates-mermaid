# ⚡ ENTREGA EN 30 MINUTOS - GUÍA RÁPIDA

## 🎯 OPCIÓN MÁS RÁPIDA: Render (TODO EN UNO)

### ⏱️ Tiempo: 10-15 minutos

---

## 📋 PASO 1: Subir a GitHub (2 minutos)

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

---

## 🚀 PASO 2: Deploy en Render (8 minutos)

### 2.1 Crear cuenta
1. Ve a: **https://render.com**
2. Haz clic en: **"Get Started for Free"**
3. Inicia sesión con **GitHub**
4. Autoriza Render

### 2.2 Crear Web Service
1. Haz clic en: **"New"** > **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Selecciona: `pilates-mermaid`
4. Configura:
   - **Name**: `pilates-mermaid`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `/`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 2.3 Variables de Entorno
Haz clic en **"Advanced"** y agrega:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=pilates-mermaid-secret-key-production-2024
FRONTEND_URL=https://pilates-mermaid.onrender.com
CORS_ORIGIN=https://pilates-mermaid.onrender.com
NEXT_PUBLIC_API_URL=https://pilates-mermaid.onrender.com
DATABASE_URL=./data/pilates_mermaid.db
STUDIO_WHATSAPP_PHONE=5259581062606
```

### 2.4 Deploy
1. Haz clic en: **"Create Web Service"**
2. Espera 5-10 minutos
3. ¡LISTO! Tu app estará en: `https://pilates-mermaid.onrender.com`

---

## ✅ PASO 3: Verificar (2 minutos)

1. Visita la URL de tu app
2. Prueba login:
   - Admin: `admin@pilatesmermaid.com` / `admin123`
   - Coach: `esmeralda@pilatesmermaid.com` / `coach123`
   - Cliente: `laura@example.com` / `cliente123`

---

## 🎯 IMPORTANTE: Configuración para Render

Render ejecuta TODO en un solo servicio. Necesitas que el servidor Express sirva tanto el backend como el frontend de Next.js.

### Solución: Actualizar `package.json`

El script `start` debe ejecutar el servidor backend que también sirve el frontend:

```json
{
  "scripts": {
    "build": "next build",
    "start": "node server/index.js"
  }
}
```

### Actualizar `server/index.js`

El servidor debe servir los archivos estáticos de Next.js después de las rutas de API.

---

## 🚀 ALTERNATIVA RÁPIDA: Vercel + Railway

### Frontend en Vercel (3 minutos)
1. Ve a: **https://vercel.com**
2. Conecta tu repositorio
3. Deploy automático
4. URL: `https://pilates-mermaid.vercel.app`

### Backend en Railway (5 minutos)
1. Ve a: **https://railway.app**
2. Conecta tu repositorio
3. Deploy automático
4. URL: `https://pilates-mermaid.up.railway.app`
5. Actualiza `NEXT_PUBLIC_API_URL` en Vercel

---

## 📝 VARIABLES DE ENTORNO MÍNIMAS

```
NODE_ENV=production
JWT_SECRET=pilates-mermaid-secret-key-production-2024
FRONTEND_URL=https://tu-app.onrender.com
CORS_ORIGIN=https://tu-app.onrender.com
NEXT_PUBLIC_API_URL=https://tu-app.onrender.com
DATABASE_URL=./data/pilates_mermaid.db
STUDIO_WHATSAPP_PHONE=5259581062606
```

---

## ✅ CHECKLIST FINAL

- [ ] Repositorio en GitHub
- [ ] Deployment en Render/Vercel+Railway
- [ ] Variables de entorno configuradas
- [ ] URL de la app funcionando
- [ ] Login funcionando
- [ ] Dashboard funcionando

---

## 🐛 SOLUCIÓN RÁPIDA DE PROBLEMAS

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté configurado
- Render crea el directorio `data` automáticamente

### Error: "CORS error"
- Verifica que `CORS_ORIGIN` incluya tu URL exacta
- Verifica que `FRONTEND_URL` esté configurado

### Error: "JWT_SECRET not found"
- Agrega `JWT_SECRET` a las variables de entorno

---

## 🎯 ¡LISTO PARA ENTREGAR!

**Tiempo total**: ~10-15 minutos

**URL de tu app**: `https://pilates-mermaid.onrender.com` (o tu URL)

**✅ ENTREGADO EN 30 MINUTOS**

