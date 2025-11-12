# 🚀 LEE ESTO PRIMERO - DEPLOYMENT

## ✅ TODO ESTÁ LISTO

Tu proyecto está **100% preparado** para deployment. Solo necesitas seguir estos pasos:

---

## 📋 PASO 1: Crear Repositorio en GitHub (2 min)

1. Ve a: **https://github.com/new**
2. Nombre: `pilates-mermaid`
3. **NO** marques "Add README" ni "Add .gitignore"
4. Clic en "Create repository"
5. **Copia la URL** que aparece

---

## 🔗 PASO 2: Conectar con GitHub (1 min)

Ejecuta estos comandos (reemplaza `TU-USUARIO`):

```bash
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
git branch -M main
git push -u origin main
```

**Si pide autenticación**:
- Ve a: https://github.com/settings/tokens
- Crea un **Personal Access Token**
- Usa el token como contraseña

---

## 🚀 PASO 3: Deploy en Render (10 min)

1. Ve a: **https://render.com**
2. Inicia sesión con GitHub
3. Clic en: **"New"** > **"Web Service"**
4. Conecta tu repositorio: `pilates-mermaid`
5. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Agrega variables de entorno (ver abajo)
7. Clic en: **"Create Web Service"**
8. Espera 5-10 minutos
9. ¡LISTO!

---

## 🔐 VARIABLES DE ENTORNO

Agrega estas variables en Render:

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
- Después del deployment, actualiza `FRONTEND_URL` y `CORS_ORIGIN` con la URL real que Render te dé

---

## ✅ VERIFICAR

1. Visita la URL de Render
2. Prueba login:
   - **Admin**: `admin@pilatesmermaid.com` / `admin123`
   - **Coach**: `esmeralda@pilatesmermaid.com` / `coach123`
   - **Cliente**: `laura@example.com` / `cliente123`

---

## 📖 MÁS AYUDA

- **DEPLOY_INSTRUCCIONES_FINALES.md** - Instrucciones detalladas
- **AYUDA_DEPLOYMENT.md** - Guía completa paso a paso
- **GUIA_VISUAL_DEPLOYMENT.md** - Guía visual

---

## 🎯 ¡EMPIEZA AHORA!

**Tiempo total**: ~15 minutos

**✅ ¡TODO LISTO!**

---

**🚀 ¡ÉXITO EN TU DEPLOYMENT!**

