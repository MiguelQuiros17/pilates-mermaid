# ⚡ LÉEME PRIMERO - DEPLOYMENT EN 15 MINUTOS

## 🚀 OPCIÓN MÁS RÁPIDA: Render

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

**⚠️ IMPORTANTE**: 
- Reemplaza `pilates-mermaid.onrender.com` con la URL que Render te dará
- Puedes dejar `EMAIL_USER` y `EMAIL_PASSWORD` vacíos por ahora

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

## ✅ CHECKLIST FINAL

- [ ] Repositorio en GitHub
- [ ] Deployment en Render completado
- [ ] Variables de entorno configuradas
- [ ] URL de la app funcionando
- [ ] Login funcionando
- [ ] Dashboard funcionando

---

## 🎯 CREDENCIALES DE PRUEBA

**Admin**: `admin@pilatesmermaid.com` / `admin123`
**Coach**: `esmeralda@pilatesmermaid.com` / `coach123`
**Cliente**: `laura@example.com` / `cliente123`

---

## 🚀 ¡LISTO PARA ENTREGAR!

**Tiempo total**: ~10-15 minutos

**URL de tu app**: `https://pilates-mermaid.onrender.com` (o tu URL)

**✅ ENTREGADO EN 30 MINUTOS**

---

**📖 Ver `COMO_DEPLOYAR_YA.md` para instrucciones detalladas**


