#!/usr/bin/env node

/**
 * Script para configurar el proyecto para producción
 * Ejecuta: node scripts/setup-production.js
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupProduction() {
  console.log('🚀 Configurando proyecto para producción...\n')

  // 1. Generar JWT_SECRET
  console.log('1. Generando JWT_SECRET seguro...')
  const jwtSecret = crypto.randomBytes(64).toString('hex')
  console.log(`✅ JWT_SECRET generado: ${jwtSecret.substring(0, 20)}...\n`)

  // 2. Solicitar información del usuario
  console.log('2. Configuración del proyecto:\n')
  
  const frontendUrl = await question('URL del frontend (ej: https://pilatesmermaid.com): ') || 'https://pilatesmermaid.com'
  const emailUser = await question('Email para notificaciones (ej: notificaciones@pilatesmermaid.com): ') || ''
  const emailPassword = await question('Contraseña de aplicación de Gmail (dejar vacío si no se tiene): ') || ''
  const whatsappPhone = await question('Número de WhatsApp (ej: 5259581062606): ') || '5259581062606'
  const databaseUrl = await question('URL de base de datos PostgreSQL (dejar vacío para SQLite): ') || ''
  const corsOrigin = await question('Orígenes CORS permitidos (separados por coma): ') || frontendUrl

  // 3. Crear archivo .env.production
  console.log('\n3. Creando archivo .env.production...')
  
  const envContent = `# JWT Secret (GENERADO AUTOMÁTICAMENTE - NO COMPARTIR)
JWT_SECRET=${jwtSecret}

# WhatsApp Business Number
STUDIO_WHATSAPP_PHONE=${whatsappPhone}

# Email Configuration
${emailUser ? `EMAIL_USER=${emailUser}` : '# EMAIL_USER=tu-email@gmail.com'}
${emailPassword ? `EMAIL_PASSWORD=${emailPassword}` : '# EMAIL_PASSWORD=tu-app-password-de-gmail'}

# Frontend URL
FRONTEND_URL=${frontendUrl}

# Logo URL (opcional)
LOGO_URL=${frontendUrl}/Logo.png

# Base de datos
${databaseUrl ? `DATABASE_URL=${databaseUrl}` : 'DATABASE_URL=./data/pilates_mermaid.db'}

# Entorno
NODE_ENV=production

# Puerto del servidor backend
PORT=3001

# CORS Origins
CORS_ORIGIN=${corsOrigin}

# API URL (para el frontend)
NEXT_PUBLIC_API_URL=${frontendUrl.replace('https://', 'https://api.') || 'http://localhost:3001'}
`

  const envPath = path.join(process.cwd(), '.env.production')
  fs.writeFileSync(envPath, envContent)
  console.log(`✅ Archivo .env.production creado en ${envPath}\n`)

  // 4. Verificar next.config.js
  console.log('4. Verificando next.config.js...')
  const nextConfigPath = path.join(process.cwd(), 'next.config.js')
  
  if (fs.existsSync(nextConfigPath)) {
    const nextConfig = fs.readFileSync(nextConfigPath, 'utf8')
    
    if (!nextConfig.includes('output: \'standalone\'')) {
      console.log('⚠️  next.config.js no tiene output: standalone')
      console.log('   Considera agregarlo para mejor deployment\n')
    }
  } else {
    console.log('⚠️  next.config.js no existe\n')
  }

  // 5. Crear archivo .gitignore para .env.production
  console.log('5. Verificando .gitignore...')
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8')
    
    if (!gitignore.includes('.env.production')) {
      fs.appendFileSync(gitignorePath, '\n# Production environment variables\n.env.production\n')
      console.log('✅ .env.production agregado a .gitignore\n')
    }
  } else {
    fs.writeFileSync(gitignorePath, '.env.production\n')
    console.log('✅ .gitignore creado\n')
  }

  // 6. Mostrar resumen
  console.log('📋 Resumen de configuración:\n')
  console.log(`   ✅ JWT_SECRET: Generado`)
  console.log(`   ✅ FRONTEND_URL: ${frontendUrl}`)
  console.log(`   ✅ EMAIL_USER: ${emailUser || 'No configurado'}`)
  console.log(`   ✅ DATABASE_URL: ${databaseUrl ? 'Configurado' : 'SQLite (local)'}`)
  console.log(`   ✅ CORS_ORIGIN: ${corsOrigin}`)
  console.log('\n✅ Configuración completada!\n')
  
  console.log('📝 Próximos pasos:')
  console.log('   1. Revisa el archivo .env.production')
  console.log('   2. Configura las variables de entorno en tu hosting')
  console.log('   3. Haz el deployment (ver GUIA_DEPLOYMENT.md)')
  console.log('   4. Configura el dominio personalizado')
  console.log('   5. Configura SSL/HTTPS')
  console.log('   6. Configura backups\n')

  rl.close()
}

setupProduction().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

