# ⚡ ENTREGA FINAL - DEPLOYMENT EN 15 MINUTOS

## 🚀 PASO 1: Subir a GitHub (2 minutos)

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

---

## 🚀 PASO 2: Deploy en Render (10 minutos)

### 1. Crear cuenta en Render
- Ve a: **https://render.com**
- Inicia sesión con **GitHub**

### 2. Crear Web Service
- Haz clic en: **"New"** > **"Web Service"**
- Conecta tu repositorio de GitHub
- Selecciona: `pilates-mermaid`

### 3. Configurar
- **Name**: `pilates-mermaid`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### 4. Variables de Entorno
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

**⚠️ IMPORTANTE**: Reemplaza `pilates-mermaid.onrender.com` con la URL que Render te dará

### 5. Deploy
- Haz clic en: **"Create Web Service"**
- Espera 5-10 minutos
- ¡LISTO! Tu app estará en: `https://pilates-mermaid.onrender.com`

---

## ✅ PASO 3: Verificar (2 minutos)

1. Visita la URL de tu app
2. Prueba login:
   - Admin: `admin@pilatesmermaid.com` / `admin123`
   - Coach: `esmeralda@pilatesmermaid.com` / `coach123`
   - Cliente: `laura@example.com` / `cliente123`

---

## 🎯 CREDENCIALES DE PRUEBA

**Admin**: `admin@pilatesmermaid.com` / `admin123`
**Coach**: `esmeralda@pilatesmermaid.com` / `coach123`
**Cliente**: `laura@example.com` / `cliente123`

---

## ✅ ENTREGADO EN 15 MINUTOS

**URL de tu app**: `https://pilates-mermaid.onrender.com` (o tu URL)

---

## 🐛 SI ALGO FALLA

1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Verifica que `NODE_ENV=production`
4. Verifica que `DATABASE_URL` esté configurado
5. Verifica que `CORS_ORIGIN` incluya tu URL

---

**✅ ¡ÉXITO EN TU ENTREGA!**



