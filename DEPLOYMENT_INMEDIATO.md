# 🚀 DEPLOYMENT INMEDIATO - 15 MINUTOS

## ⚡ OPCIÓN MÁS RÁPIDA: Render (TODO EN UNO)

### ✅ Paso 1: Preparar GitHub (2 minutos)

```bash
# Si no tienes git inicializado
git init
git add .
git commit -m "Ready for production"
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
git push -u origin main
```

### ✅ Paso 2: Deploy en Render (5 minutos)

1. **Ve a**: https://render.com
2. **Crea cuenta** con GitHub (gratis)
3. **Haz clic en**: "New" > "Web Service"
4. **Conecta** tu repositorio de GitHub
5. **Configura**:
   - **Name**: `pilates-mermaid`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)` (más cerca de México)
   - **Branch**: `main`
   - **Root Directory**: `/` (raíz)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (para empezar)

6. **Variables de entorno** (haz clic en "Advanced" > "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=pilates-mermaid-secret-key-production-2024-$(date +%s)
   FRONTEND_URL=https://pilates-mermaid.onrender.com
   CORS_ORIGIN=https://pilates-mermaid.onrender.com
   NEXT_PUBLIC_API_URL=https://pilates-mermaid.onrender.com
   DATABASE_URL=./data/pilates_mermaid.db
   STUDIO_WHATSAPP_PHONE=5259581062606
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASSWORD=tu-app-password
   ```

7. **Haz clic en**: "Create Web Service"

8. **Espera** a que termine el deployment (5-10 minutos)

9. **¡LISTO!** Tu app estará en: `https://pilates-mermaid.onrender.com`

---

## 🎯 OPCIÓN ALTERNATIVA: Vercel + Railway

### Frontend en Vercel (3 minutos)

1. **Ve a**: https://vercel.com
2. **Inicia sesión** con GitHub
3. **Haz clic en**: "New Project"
4. **Importa** tu repositorio
5. **Configura**:
   - Framework: Next.js (detectado automáticamente)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
6. **Variables de entorno**:
   - `NEXT_PUBLIC_API_URL`: `https://tu-backend.railway.app` (después de crear backend)
7. **Haz clic en**: "Deploy"
8. **Espera** 2-3 minutos
9. **Copia** la URL de Vercel (ej: `https://pilates-mermaid.vercel.app`)

### Backend en Railway (5 minutos)

1. **Ve a**: https://railway.app
2. **Inicia sesión** con GitHub
3. **Haz clic en**: "New Project"
4. **Selecciona**: "Deploy from GitHub repo"
5. **Elige** tu repositorio
6. **Railway detectará** automáticamente el proyecto
7. **Variables de entorno** (Settings > Variables):
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=pilates-mermaid-secret-key-production-2024
   FRONTEND_URL=https://pilates-mermaid.vercel.app
   CORS_ORIGIN=https://pilates-mermaid.vercel.app
   DATABASE_URL=./data/pilates_mermaid.db
   STUDIO_WHATSAPP_PHONE=5259581062606
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASSWORD=tu-app-password
   ```
8. **Haz clic en**: "Deploy"
9. **Espera** 3-5 minutos
10. **Copia** la URL de Railway (ej: `https://pilates-mermaid.up.railway.app`)
11. **Actualiza** `NEXT_PUBLIC_API_URL` en Vercel con la URL de Railway
12. **Redeploy** en Vercel

---

## 📝 Configuración Rápida de Variables

### Para Render (TODO EN UNO)

```
NODE_ENV=production
PORT=3001
JWT_SECRET=pilates-mermaid-secret-key-production-2024-$(date +%s)
FRONTEND_URL=https://TU-APP.onrender.com
CORS_ORIGIN=https://TU-APP.onrender.com
NEXT_PUBLIC_API_URL=https://TU-APP.onrender.com
DATABASE_URL=./data/pilates_mermaid.db
STUDIO_WHATSAPP_PHONE=5259581062606
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
```

### Para Vercel + Railway

**Vercel**:
```
NEXT_PUBLIC_API_URL=https://TU-BACKEND.railway.app
```

**Railway**:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=pilates-mermaid-secret-key-production-2024
FRONTEND_URL=https://TU-APP.vercel.app
CORS_ORIGIN=https://TU-APP.vercel.app
DATABASE_URL=./data/pilates_mermaid.db
STUDIO_WHATSAPP_PHONE=5259581062606
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
```

---

## ✅ Verificación Rápida (2 minutos)

1. **Visita** la URL de tu app
2. **Prueba** login:
   - Admin: `admin@pilatesmermaid.com` / `admin123`
   - Coach: `esmeralda@pilatesmermaid.com` / `coach123`
   - Cliente: `laura@example.com` / `cliente123`

3. **Verifica** funcionalidades:
   - ✅ Login funciona
   - ✅ Dashboard carga
   - ✅ Clases se muestran
   - ✅ Pagos funcionan

---

## 🐛 Solución Rápida de Problemas

### Error: "Cannot connect to database"
- **Solución**: Verifica que `DATABASE_URL` esté configurado
- **Solución**: Render crea el directorio `data` automáticamente

### Error: "CORS error"
- **Solución**: Verifica que `CORS_ORIGIN` incluya tu URL exacta
- **Solución**: Verifica que `FRONTEND_URL` esté configurado

### Error: "JWT_SECRET not found"
- **Solución**: Agrega `JWT_SECRET` a las variables de entorno
- **Solución**: Usa: `pilates-mermaid-secret-key-production-2024`

### Error: "Port already in use"
- **Solución**: Render usa el puerto automáticamente, no configures `PORT`
- **Solución**: O usa `PORT` que Render proporciona

---

## 🎯 Checklist Final

- [ ] Repositorio en GitHub
- [ ] Deployment en Render/Vercel+Railway
- [ ] Variables de entorno configuradas
- [ ] URL de la app funcionando
- [ ] Login funcionando
- [ ] Dashboard funcionando

---

## 📞 Si Algo Falla

1. **Revisa** los logs en Render/Railway/Vercel
2. **Verifica** las variables de entorno
3. **Verifica** que `NODE_ENV=production`
4. **Verifica** que `DATABASE_URL` esté configurado
5. **Verifica** que `CORS_ORIGIN` incluya tu URL

---

## 🚀 ¡LISTO PARA ENTREGAR!

**Tiempo total**: ~10-15 minutos

**URL de tu app**: `https://TU-APP.onrender.com` (o tu URL)

**✅ ENTREGADO EN 30 MINUTOS**


