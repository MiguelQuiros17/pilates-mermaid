# 🚀 DEPLOY EN RENDER - 15 MINUTOS

## ⚡ PASO A PASO

### 1. Subir a GitHub (2 min)
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 2. Render (10 min)

1. **Ve a**: https://render.com
2. **Inicia sesión** con GitHub
3. **Haz clic en**: "New" > "Web Service"
4. **Conecta** tu repositorio
5. **Configura**:
   - Name: `pilates-mermaid`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: `Free`

6. **Variables de entorno** (Advanced):
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

7. **Deploy**
8. **Espera** 5-10 minutos
9. **¡LISTO!** URL: `https://pilates-mermaid.onrender.com`

---

## ✅ Verificar (2 min)

1. Visita la URL
2. Prueba login:
   - Admin: `admin@pilatesmermaid.com` / `admin123`
   - Coach: `esmeralda@pilatesmermaid.com` / `coach123`
   - Cliente: `laura@example.com` / `cliente123`

---

## 🐛 Problemas?

1. Revisa logs en Render
2. Verifica variables de entorno
3. Verifica que `NODE_ENV=production`

---

## ✅ ENTREGADO EN 15 MINUTOS

