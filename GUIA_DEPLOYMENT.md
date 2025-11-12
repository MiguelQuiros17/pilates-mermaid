# 🚀 Guía Completa de Deployment - PilatesMermaid

## 📋 Tabla de Contenidos

1. [Opciones de Hosting](#opciones-de-hosting)
2. [Preparación para Producción](#preparación-para-producción)
3. [Deployment en Vercel + Railway](#deployment-en-vercel--railway)
4. [Deployment en DigitalOcean](#deployment-en-digitalocean)
5. [Deployment en Render](#deployment-en-render)
6. [Configuración Post-Deployment](#configuración-post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## 🌐 Opciones de Hosting

### Opción 1: Vercel + Railway (Recomendado) ⭐
- **Frontend (Next.js)**: Vercel (gratis)
- **Backend (Express)**: Railway (desde $5/mes)
- **Base de datos**: Railway PostgreSQL (incluido)
- **Ventajas**: 
  - Fácil de configurar
  - Escalable
  - SSL automático
  - Deploy automático desde GitHub
- **Desventajas**: 
  - Railway puede ser costoso con mucho tráfico
  - Dos servicios separados

### Opción 2: DigitalOcean App Platform
- **Todo en uno**: Frontend + Backend + Base de datos
- **Precio**: Desde $12/mes
- **Ventajas**: 
  - Todo en un lugar
  - Fácil de gestionar
  - Escalable
- **Desventajas**: 
  - Más caro que opciones separadas
  - Menos flexible

### Opción 3: Render
- **Frontend**: Render (gratis con limitaciones)
- **Backend**: Render ($7/mes)
- **Base de datos**: Render PostgreSQL (desde $7/mes)
- **Ventajas**: 
  - Fácil de configurar
  - SSL automático
  - Deploy automático
- **Desventajas**: 
  - Puede ser lento en el plan gratis
  - Limitaciones en plan gratis

### Opción 4: Fly.io
- **Todo en uno**: Frontend + Backend + Base de datos
- **Precio**: Desde $0 (con limitaciones)
- **Ventajas**: 
  - Gratis para empezar
  - Escalable
  - Global CDN
- **Desventajas**: 
  - Curva de aprendizaje
  - Configuración más compleja

---

## 🔧 Preparación para Producción

### Paso 1: Crear archivo `.env.production`

Crea un archivo `.env.production` en la raíz del proyecto:

```env
# JWT Secret (GENERA UNO NUEVO Y SEGURO)
JWT_SECRET=tu-clave-secreta-super-segura-aqui-cambiar-en-produccion

# WhatsApp Business Number
STUDIO_WHATSAPP_PHONE=5259581062606

# Email Configuration
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-de-gmail

# Frontend URL (cambiar a tu dominio)
FRONTEND_URL=https://pilatesmermaid.com

# Logo URL (opcional)
LOGO_URL=https://pilatesmermaid.com/Logo.png

# Base de datos (PostgreSQL en producción)
DATABASE_URL=postgresql://usuario:password@host:5432/pilates_mermaid

# Entorno
NODE_ENV=production

# Puerto del servidor backend
PORT=3001

# CORS Origins (cambiar a tu dominio)
CORS_ORIGIN=https://pilatesmermaid.com,https://www.pilatesmermaid.com
```

### Paso 2: Generar JWT_SECRET seguro

```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Paso 3: Actualizar `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Para deployment en servidores
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  images: {
    domains: ['pilatesmermaid.com'], // Agregar tu dominio
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
```

### Paso 4: Actualizar `server/index.js` para producción

Asegúrate de que el servidor use las variables de entorno correctas:

```javascript
// En server/index.js, actualizar CORS origins
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : process.env.NODE_ENV === 'production' 
    ? ['https://pilatesmermaid.com', 'https://www.pilatesmermaid.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000']
```

### Paso 5: Crear script de build

Crear `scripts/build-production.js`:

```javascript
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔨 Building for production...')

// Build Next.js
console.log('📦 Building Next.js...')
execSync('npm run build', { stdio: 'inherit' })

// Verificar que el build fue exitoso
if (!fs.existsSync(path.join(__dirname, '../.next'))) {
  console.error('❌ Build failed!')
  process.exit(1)
}

console.log('✅ Build completed successfully!')
```

---

## 🚀 Deployment en Vercel + Railway

### Parte 1: Deploy Frontend en Vercel

#### 1.1 Preparar repositorio GitHub

```bash
# Si no tienes git inicializado
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/pilates-mermaid.git
git push -u origin main
```

#### 1.2 Deploy en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con GitHub
3. Haz clic en "New Project"
4. Importa tu repositorio
5. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (raíz)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

6. Agrega variables de entorno:
   - `NEXT_PUBLIC_API_URL`: `https://tu-backend.railway.app` (o tu URL de Railway)

7. Haz clic en "Deploy"

#### 1.3 Configurar dominio personalizado

1. En Vercel, ve a "Settings" > "Domains"
2. Agrega tu dominio
3. Configura los DNS records según las instrucciones de Vercel

### Parte 2: Deploy Backend en Railway

#### 2.1 Preparar proyecto para Railway

Crear `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 2.2 Deploy en Railway

1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con GitHub
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Elige tu repositorio
6. Railway detectará automáticamente el proyecto

#### 2.3 Configurar variables de entorno

En Railway, ve a "Variables" y agrega:

```
JWT_SECRET=tu-clave-secreta-generada
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://pilatesmermaid.com
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
STUDIO_WHATSAPP_PHONE=5259581062606
```

#### 2.4 Configurar PostgreSQL

1. En Railway, haz clic en "New" > "Database" > "PostgreSQL"
2. Railway creará una base de datos PostgreSQL
3. Copia la `DATABASE_URL` de las variables de entorno
4. Agrega `DATABASE_URL` a las variables de entorno de tu servicio

#### 2.5 Migrar de SQLite a PostgreSQL

Crear `scripts/migrate-to-postgres.js`:

```javascript
const { Client } = require('pg')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

async function migrate() {
  // Conectar a SQLite
  const sqliteDb = new sqlite3.Database(path.join(__dirname, '../data/pilates_mermaid.db'))
  
  // Conectar a PostgreSQL
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL
  })
  await pgClient.connect()
  
  // Aquí iría la lógica de migración
  // Esto es complejo y requiere recrear las tablas en PostgreSQL
  // y copiar los datos
  
  console.log('✅ Migration completed!')
  
  await pgClient.end()
  sqliteDb.close()
}

migrate().catch(console.error)
```

**Nota**: La migración de SQLite a PostgreSQL es compleja. Considera usar una herramienta como `pgloader` o recrear la base de datos desde cero.

#### 2.6 Actualizar `lib/database.js` para PostgreSQL

Necesitarás actualizar `lib/database.js` para usar PostgreSQL en lugar de SQLite. Esto requiere cambios significativos en el código.

**Alternativa más simple**: Usar un ORM como Prisma o Sequelize que soporte múltiples bases de datos.

#### 2.7 Configurar dominio personalizado

1. En Railway, ve a "Settings" > "Networking"
2. Haz clic en "Generate Domain"
3. O configura un dominio personalizado
4. Copia la URL y actualiza `NEXT_PUBLIC_API_URL` en Vercel

---

## 🌊 Deployment en DigitalOcean

### Paso 1: Crear App en DigitalOcean

1. Ve a [digitalocean.com](https://digitalocean.com)
2. Inicia sesión
3. Ve a "Apps" > "Create App"
4. Conecta tu repositorio de GitHub
5. Configura el proyecto:
   - **Type**: Web Service
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`
   - **HTTP Port**: `3000`

### Paso 2: Configurar variables de entorno

En DigitalOcean, ve a "Settings" > "App-Level Environment Variables" y agrega todas las variables de `.env.production`.

### Paso 3: Agregar base de datos

1. En DigitalOcean, ve a "Databases" > "Create Database"
2. Elige "PostgreSQL"
3. Crea la base de datos
4. Conecta la base de datos a tu app
5. Copia la `DATABASE_URL` y agrega a variables de entorno

### Paso 4: Configurar dominio

1. En DigitalOcean, ve a "Settings" > "Domains"
2. Agrega tu dominio
3. Configura los DNS records

---

## 🎨 Deployment en Render

### Paso 1: Deploy Frontend

1. Ve a [render.com](https://render.com)
2. Inicia sesión con GitHub
3. Haz clic en "New" > "Static Site"
4. Conecta tu repositorio
5. Configura:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`

### Paso 2: Deploy Backend

1. En Render, haz clic en "New" > "Web Service"
2. Conecta tu repositorio
3. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Environment**: `Node`

### Paso 3: Agregar base de datos

1. En Render, haz clic en "New" > "PostgreSQL"
2. Crea la base de datos
3. Conecta la base de datos a tu servicio
4. Copia la `DATABASE_URL` y agrega a variables de entorno

---

## 🔐 Configuración Post-Deployment

### 1. Configurar SSL/HTTPS

Si usas Vercel, Railway, o Render, SSL está configurado automáticamente. Solo necesitas configurar tu dominio.

### 2. Configurar CORS

Actualiza `server/index.js` para permitir solo tu dominio:

```javascript
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['https://pilatesmermaid.com', 'https://www.pilatesmermaid.com']
```

### 3. Configurar backups

#### Opción 1: Backups automáticos en Railway

Railway hace backups automáticos de PostgreSQL. Verifica en "Database" > "Backups".

#### Opción 2: Script de backup manual

Crear `scripts/backup-production.js`:

```javascript
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function backup() {
  const timestamp = new Date().toISOString().replace(/:/g, '-')
  const backupDir = path.join(__dirname, '../backups')
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  // Backup de PostgreSQL
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`)
  execSync(`pg_dump ${process.env.DATABASE_URL} > ${backupFile}`)
  
  console.log(`✅ Backup created: ${backupFile}`)
}

backup().catch(console.error)
```

### 4. Configurar monitoring

#### Opción 1: Sentry (Error Tracking)

1. Ve a [sentry.io](https://sentry.io)
2. Crea una cuenta
3. Crea un proyecto para Node.js
4. Instala Sentry:

```bash
npm install @sentry/node @sentry/nextjs
```

5. Configura Sentry en `server/index.js`:

```javascript
const Sentry = require('@sentry/node')

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

#### Opción 2: Uptime Robot (Uptime Monitoring)

1. Ve a [uptimerobot.com](https://uptimerobot.com)
2. Crea una cuenta
3. Agrega un monitor para tu URL
4. Configura alertas por email

### 5. Configurar analytics

#### Opción 1: Google Analytics

1. Ve a [analytics.google.com](https://analytics.google.com)
2. Crea una propiedad
3. Obtén el ID de tracking
4. Agrega a `app/layout.tsx`:

```tsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
  `}
</Script>
```

#### Opción 2: Plausible (Privacy-friendly)

1. Ve a [plausible.io](https://plausible.io)
2. Crea una cuenta
3. Agrega tu dominio
4. Agrega el script a `app/layout.tsx`

---

## 🐛 Troubleshooting

### Problema: Error de CORS

**Solución**: Verifica que `CORS_ORIGIN` en el backend incluya tu dominio de frontend.

### Problema: Error de conexión a base de datos

**Solución**: 
- Verifica que `DATABASE_URL` esté configurada correctamente
- Verifica que la base de datos esté accesible desde tu hosting
- Verifica los firewalls y security groups

### Problema: Error 500 en producción

**Solución**:
- Revisa los logs del servidor
- Verifica que todas las variables de entorno estén configuradas
- Verifica que `NODE_ENV=production`
- Revisa los logs de error en Sentry (si está configurado)

### Problema: Imágenes no cargan

**Solución**:
- Verifica que `next.config.js` tenga configurado el dominio correcto
- Verifica que las imágenes estén en `public/`
- Verifica los permisos de archivos

### Problema: Emails no se envían

**Solución**:
- Verifica que `EMAIL_USER` y `EMAIL_PASSWORD` estén configurados
- Verifica que la contraseña de aplicación sea correcta
- Verifica que el puerto 587 no esté bloqueado
- Revisa los logs del servidor

---

## ✅ Checklist Post-Deployment

- [ ] SSL/HTTPS configurado
- [ ] Dominio personalizado configurado
- [ ] Variables de entorno configuradas
- [ ] Base de datos configurada y migrada
- [ ] Backups configurados
- [ ] Monitoring configurado
- [ ] Error tracking configurado
- [ ] Analytics configurado (opcional)
- [ ] Testing en producción
- [ ] Documentación actualizada

---

## 📞 Soporte

Si tienes problemas con el deployment, revisa:
1. Los logs del servidor
2. Los logs del frontend
3. Los logs de la base de datos
4. La documentación del hosting
5. Los issues en GitHub

---

**Última actualización**: 2024-11-12



