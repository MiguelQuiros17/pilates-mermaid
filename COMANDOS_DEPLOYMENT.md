# 📋 COMANDOS PARA DEPLOYMENT

## 🚀 PASO 1: Git y GitHub

### 1.1 Inicializar Git (YA HECHO ✅)
```bash
git init
git add .
git commit -m "Initial commit - Ready for production with i18n support"
```

### 1.2 Crear repositorio en GitHub
1. Ve a: https://github.com/new
2. Nombre: `pilates-mermaid`
3. Descripción: `Sistema de gestión para estudio de Pilates`
4. Privado o Público (tu elección)
5. **NO** marques "Add README" ni "Add .gitignore"
6. Clic en "Create repository"

### 1.3 Conectar con GitHub
```bash
git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANTE**: 
- Reemplaza `TU-USUARIO` con tu usuario de GitHub
- Si te pide autenticación, usa un **Personal Access Token**
- Para crear token: GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
- Permisos: `repo` (acceso completo)

---

## 🚀 PASO 2: Render

### 2.1 Crear cuenta
1. Ve a: https://render.com
2. Clic en: "Get Started for Free"
3. Inicia sesión con GitHub
4. Autoriza Render

### 2.2 Crear Web Service
1. Clic en: "New" > "Web Service"
2. Conecta tu repositorio
3. Selecciona: `pilates-mermaid`

### 2.3 Configurar
- **Name**: `pilates-mermaid`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### 2.4 Variables de Entorno
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

### 2.5 Deploy
1. Clic en: "Create Web Service"
2. Espera 5-10 minutos
3. ¡LISTO!

---

## ✅ VERIFICAR

1. Visita la URL de Render
2. Prueba login
3. Verifica funcionalidades

---

**✅ ¡LISTO!**



