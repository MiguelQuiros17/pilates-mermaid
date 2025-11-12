# 🎯 GUÍA VISUAL - DEPLOYMENT EN RENDER

## 📋 PASO 1: Crear Repositorio en GitHub

### 1.1 Ir a GitHub
```
🌐 https://github.com/new
```

### 1.2 Configurar Repositorio
```
┌─────────────────────────────────────┐
│ Repository name: pilates-mermaid    │
│ Description: Sistema de gestión...  │
│                                     │
│ ○ Public                            │
│ ● Private  ← RECOMENDADO            │
│                                     │
│ ☐ Add a README file  ← NO MARCAR   │
│ ☐ Add .gitignore     ← NO MARCAR   │
│ ☐ Choose a license    ← NO MARCAR   │
│                                     │
│ [Create repository]                 │
└─────────────────────────────────────┘
```

### 1.3 Copiar URL del Repositorio
```
https://github.com/TU-USUARIO/pilates-mermaid.git
```

---

## 🔗 PASO 2: Conectar con GitHub

### 2.1 Ejecutar Comandos
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

## 🚀 PASO 3: Deploy en Render

### 3.1 Ir a Render
```
🌐 https://render.com
```

### 3.2 Crear Web Service
```
┌─────────────────────────────────────┐
│ [New] → [Web Service]               │
└─────────────────────────────────────┘
```

### 3.3 Conectar Repositorio
```
┌─────────────────────────────────────┐
│ Connect a repository                │
│                                     │
│ 🔍 Search: pilates-mermaid          │
│                                     │
│ ✓ pilates-mermaid                   │
│   https://github.com/.../...        │
│                                     │
│ [Connect]                           │
└─────────────────────────────────────┘
```

### 3.4 Configurar Servicio
```
┌─────────────────────────────────────┐
│ Name: pilates-mermaid               │
│ Environment: Node                   │
│ Region: Oregon (US West)            │
│ Branch: main                        │
│ Root Directory: / (vacío)           │
│                                     │
│ Build Command:                      │
│ npm install && npm run build        │
│                                     │
│ Start Command:                      │
│ npm start                           │
│                                     │
│ Instance Type: Free                 │
└─────────────────────────────────────┘
```

### 3.5 Variables de Entorno
```
┌─────────────────────────────────────┐
│ [Advanced] → [Add Environment Var]  │
│                                     │
│ NODE_ENV = production               │
│ PORT = 3001                         │
│ JWT_SECRET = pilates-mermaid-...    │
│ FRONTEND_URL = https://...          │
│ CORS_ORIGIN = https://...           │
│ NEXT_PUBLIC_API_URL = https://...   │
│ DATABASE_URL = ./data/...           │
│ STUDIO_WHATSAPP_PHONE = 525958...   │
│                                     │
│ [Save Changes]                      │
└─────────────────────────────────────┘
```

### 3.6 Crear Servicio
```
┌─────────────────────────────────────┐
│ [Create Web Service]                │
│                                     │
│ ⏳ Building...                      │
│ ⏳ Installing dependencies...       │
│ ⏳ Building application...          │
│ ⏳ Starting application...          │
│                                     │
│ ✅ Your service is live at:         │
│ https://pilates-mermaid-XXXX...     │
└─────────────────────────────────────┘
```

---

## ✅ PASO 4: Verificar

### 4.1 Visitar URL
```
🌐 https://pilates-mermaid-XXXX.onrender.com
```

### 4.2 Probar Login
```
Email: admin@pilatesmermaid.com
Password: admin123
```

### 4.3 Verificar Funcionalidades
```
✅ Login funciona
✅ Dashboard carga
✅ Clases se muestran
✅ Pagos funcionan
✅ WhatsApp funciona
✅ Selector de idioma funciona
```

---

## 🎯 ¡LISTO!

**URL**: `https://pilates-mermaid-XXXX.onrender.com`

**✅ ENTREGADO**

---

## 📞 SI ALGO FALLA

1. Revisa logs en Render
2. Verifica variables de entorno
3. Verifica que `NODE_ENV=production`
4. Verifica que `DATABASE_URL` esté configurado
5. Verifica que `CORS_ORIGIN` incluya tu URL

---

**✅ ¡ÉXITO EN TU DEPLOYMENT!**


