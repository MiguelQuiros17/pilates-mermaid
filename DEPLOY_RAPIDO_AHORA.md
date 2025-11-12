# 🚀 DEPLOY EN 5 MINUTOS

## PASO 1: SUBIR A GITHUB (2 min)

### 1.1 Crear repositorio en GitHub
1. Ve a: https://github.com/new
2. Nombre: `pilates-mermaid`
3. **NO marques** "Initialize with README"
4. Haz clic en **"Create repository"**

### 1.2 Conectar y subir código
Ejecuta estos comandos (ya los ejecutaré por ti):

```bash
git add .
git commit -m "Ready for production deployment"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pilates-mermaid.git
git push -u origin main
```

**⚠️ IMPORTANTE:** Reemplaza `TU_USUARIO` con tu usuario de GitHub

---

## PASO 2: DEPLOY EN RENDER (3 min)

### 2.1 Crear servicio
1. Ve a: https://render.com
2. **Inicia sesión** con GitHub
3. Haz clic en **"New"** > **"Web Service"**
4. Selecciona tu repositorio: `pilates-mermaid`
5. Haz clic en **"Connect"**

### 2.2 Configurar
- **Name:** `pilates-mermaid`
- **Environment:** `Node`
- **Region:** `Oregon (US West)`
- **Branch:** `main`
- **Root Directory:** (dejar vacío)
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Instance Type:** `Free`

### 2.3 Variables de entorno
Haz clic en **"Advanced"** y agrega:

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

### 2.4 Deploy
1. Haz clic en **"Create Web Service"**
2. Espera 5-10 minutos
3. **¡LISTO!** Tu URL será: `https://pilates-mermaid.onrender.com`

---

## ✅ VERIFICAR (1 min)

1. Visita tu URL
2. Prueba login:
   - Admin: `admin@pilatesmermaid.com` / `admin123`
   - Cliente: `laura@example.com` / `cliente123`

---

## 🎉 ¡ENTREGADO!

