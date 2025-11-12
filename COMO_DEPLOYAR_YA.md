# ⚡ CÓMO DEPLOYAR YA - 15 MINUTOS

## 🎯 OPCIÓN MÁS RÁPIDA: Render (TODO EN UNO)

### ⏱️ Tiempo: 10-15 minutos

---

## 📋 PASO 1: Subir a GitHub (2 minutos)

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

**⚠️ IMPORTANTE**: Si no tienes git inicializado:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
git push -u origin main
```

---

## 🚀 PASO 2: Deploy en Render (8 minutos)

### 2.1 Crear cuenta
1. Ve a: **https://render.com**
2. Haz clic en: **"Get Started for Free"**
3. Inicia sesión con **GitHub**
4. Autoriza Render para acceder a tus repositorios

### 2.2 Crear Web Service
1. Haz clic en: **"New"** > **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Selecciona: `pilates-mermaid`
4. Configura:
   - **Name**: `pilates-mermaid`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)` (más cerca de México)
   - **Branch**: `main`
   - **Root Directory**: `/` (raíz)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (para empezar)

### 2.3 Variables de Entorno
Haz clic en **"Advanced"** > **"Add Environment Variable"** y agrega:

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
- Si no tienes email configurado, puedes dejar `EMAIL_USER` y `EMAIL_PASSWORD` vacíos por ahora

### 2.4 Deploy
1. Haz clic en: **"Create Web Service"**
2. Espera 5-10 minutos mientras Render construye y despliega tu app
3. Verás los logs en tiempo real
4. Cuando termine, verás: **"Your service is live at: https://pilates-mermaid.onrender.com"**

---

## ✅ PASO 3: Verificar (2 minutos)

### 3.1 Verificar que la app funciona
1. Visita la URL de tu app: `https://pilates-mermaid.onrender.com`
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

---

## 🐛 SOLUCIÓN RÁPIDA DE PROBLEMAS

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

### Problema: "Port already in use"
**Solución**:
1. Render usa el puerto automáticamente
2. **NO** configures `PORT` manualmente
3. O elimina `PORT` de las variables de entorno
4. Render proporciona el puerto en `process.env.PORT`

### Problema: "Next.js build failed"
**Solución**:
1. Verifica los logs en Render
2. Verifica que `npm install` se ejecutó correctamente
3. Verifica que `npm run build` se ejecutó correctamente
4. Verifica que no hay errores de TypeScript

---

## ✅ CHECKLIST FINAL

- [ ] Repositorio en GitHub
- [ ] Deployment en Render completado
- [ ] Variables de entorno configuradas
- [ ] URL de la app funcionando
- [ ] Login funcionando
- [ ] Dashboard funcionando
- [ ] Clases funcionando
- [ ] Pagos funcionando

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

## 📞 SI ALGO FALLA

1. **Revisa** los logs en Render
2. **Verifica** las variables de entorno
3. **Verifica** que `NODE_ENV=production`
4. **Verifica** que `DATABASE_URL` esté configurado
5. **Verifica** que `CORS_ORIGIN` incluya tu URL

---

## 🚀 ¡LISTO PARA ENTREGAR!

**Tiempo total**: ~10-15 minutos

**URL de tu app**: `https://pilates-mermaid.onrender.com` (o tu URL)

**✅ ENTREGADO EN 30 MINUTOS**

---

## 📝 NOTAS IMPORTANTES

1. **Render Free Tier**: 
   - Tiene limitaciones (se duerme después de 15 minutos de inactividad)
   - Para producción, considera el plan de pago ($7/mes)

2. **Base de Datos**:
   - SQLite funciona perfectamente para empezar
   - Para producción con muchos usuarios, considera PostgreSQL

3. **Email**:
   - Si no configuras email, las notificaciones no se enviarán
   - Puedes configurarlo después

4. **Dominio Personalizado**:
   - Puedes agregar un dominio personalizado después
   - Render te dará instrucciones

---

**✅ ¡ÉXITO EN TU ENTREGA!**


