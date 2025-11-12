# ⚡ DEPLOYMENT RÁPIDO - 30 MINUTOS ⚡

## 🚀 Opción RÁPIDA: Render (5 minutos)

### Paso 1: Frontend + Backend en Render (TODO EN UNO)

1. **Ve a**: https://render.com
2. **Crea cuenta** con GitHub
3. **Haz clic en**: "New" > "Web Service"
4. **Conecta** tu repositorio de GitHub
5. **Configura**:
   - **Name**: `pilates-mermaid`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (para empezar)

6. **Variables de entorno** (agregar todas):
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=pilates-mermaid-secret-key-production-2024
   FRONTEND_URL=https://tu-app.onrender.com
   CORS_ORIGIN=https://tu-app.onrender.com
   NEXT_PUBLIC_API_URL=https://tu-app.onrender.com
   DATABASE_URL=./data/pilates_mermaid.db
   STUDIO_WHATSAPP_PHONE=5259581062606
   ```

7. **Haz clic en**: "Create Web Service"

8. **Espera** a que termine el deployment (5-10 minutos)

9. **¡LISTO!** Tu app estará en: `https://tu-app.onrender.com`

---

## 🎯 Alternativa: Vercel + Railway (10 minutos)

### Frontend en Vercel (2 minutos)

1. **Ve a**: https://vercel.com
2. **Inicia sesión** con GitHub
3. **Haz clic en**: "New Project"
4. **Importa** tu repositorio
5. **Configura**:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. **Variables de entorno**:
   - `NEXT_PUBLIC_API_URL`: `https://tu-backend.railway.app` (después de crear backend)
7. **Deploy**

### Backend en Railway (3 minutos)

1. **Ve a**: https://railway.app
2. **Inicia sesión** con GitHub
3. **Haz clic en**: "New Project"
4. **Selecciona**: "Deploy from GitHub repo"
5. **Elige** tu repositorio
6. **Variables de entorno**:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=pilates-mermaid-secret-key-production-2024
   FRONTEND_URL=https://tu-app.vercel.app
   CORS_ORIGIN=https://tu-app.vercel.app
   DATABASE_URL=./data/pilates_mermaid.db
   STUDIO_WHATSAPP_PHONE=5259581062606
   ```
7. **Deploy**
8. **Copia** la URL del backend
9. **Actualiza** `NEXT_PUBLIC_API_URL` en Vercel

---

## 📝 Configuración Rápida

### 1. Actualizar variables de entorno

Edita `.env.production` con tus valores:

```env
FRONTEND_URL=https://tu-app.onrender.com
NEXT_PUBLIC_API_URL=https://tu-app.onrender.com
CORS_ORIGIN=https://tu-app.onrender.com
```

### 2. Si usas Render (TODO EN UNO)

Render ejecuta frontend y backend juntos. Necesitas actualizar `package.json`:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "next build"
  }
}
```

### 3. Si usas Vercel + Railway

- Vercel ejecuta solo el frontend
- Railway ejecuta solo el backend
- Actualiza `NEXT_PUBLIC_API_URL` en Vercel con la URL de Railway

---

## ✅ Verificación Rápida

1. **Verifica** que el deployment terminó
2. **Visita** la URL de tu app
3. **Prueba** login:
   - Admin: `admin@pilatesmermaid.com` / `admin123`
   - Coach: `esmeralda@pilatesmermaid.com` / `coach123`
   - Cliente: `laura@example.com` / `cliente123`

4. **Verifica** que las funcionalidades funcionen:
   - ✅ Login
   - ✅ Dashboard
   - ✅ Clases
   - ✅ Pagos

---

## 🐛 Problemas Comunes

### Error: "Cannot connect to database"
- **Solución**: Verifica que `DATABASE_URL` esté configurado
- **Solución**: Si usas Render, la base de datos SQLite funciona

### Error: "CORS error"
- **Solución**: Verifica que `CORS_ORIGIN` incluya tu URL de frontend
- **Solución**: Verifica que `FRONTEND_URL` esté configurado

### Error: "JWT_SECRET not found"
- **Solución**: Agrega `JWT_SECRET` a las variables de entorno
- **Solución**: Genera uno nuevo: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## 🎯 Checklist Final (2 minutos)

- [ ] Deployment completado
- [ ] URL de la app funcionando
- [ ] Login funcionando
- [ ] Dashboard funcionando
- [ ] Clases funcionando
- [ ] Variables de entorno configuradas

---

## 📞 Si algo falla

1. **Revisa** los logs en Render/Railway/Vercel
2. **Verifica** las variables de entorno
3. **Verifica** que `NODE_ENV=production`
4. **Verifica** que `DATABASE_URL` esté configurado
5. **Verifica** que `CORS_ORIGIN` incluya tu URL

---

## 🚀 ¡LISTO PARA ENTREGAR!

Tu app está en: `https://tu-app.onrender.com` (o tu URL)

**Tiempo total**: ~10-15 minutos

**✅ ENTREGADO**


