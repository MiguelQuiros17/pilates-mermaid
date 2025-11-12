#!/usr/bin/env node
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🧜‍♀️ PilatesMermaid - Iniciando aplicación...\n')

// Check if .env file exists
const envPath = path.join(__dirname, '.env')
const envExamplePath = path.join(__dirname, 'env.example')

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('📝 Creando archivo .env desde plantilla...')
  fs.copyFileSync(envExamplePath, envPath)
  console.log('✅ Archivo .env creado exitosamente\n')
}

// Check if database exists
const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  console.log('📁 Creando directorio de datos...')
  fs.mkdirSync(dataDir, { recursive: true })
  console.log('✅ Directorio de datos creado\n')
}

// Check if sample data exists
const dbPath = path.join(dataDir, 'pilates_mermaid.db')
if (!fs.existsSync(dbPath)) {
  console.log('🗄️  Inicializando datos de muestra...')
  
  const initProcess = spawn('node', ['scripts/init-sample-data.js'], {
    stdio: 'inherit',
    cwd: __dirname
  })

  initProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Datos de muestra inicializados exitosamente\n')
      startApplication()
    } else {
      console.log('\n❌ Error inicializando datos de muestra')
      process.exit(1)
    }
  })
} else {
  console.log('✅ Base de datos encontrada\n')
  startApplication()
}

function startApplication() {
  console.log('🚀 Iniciando PilatesMermaid...')
  console.log('📱 Frontend: http://localhost:3000')
  console.log('🔧 Backend: http://localhost:3001')
  console.log('📊 Health Check: http://localhost:3001/api/health\n')
  
  console.log('🔐 Cuentas de prueba:')
  console.log('👑 Admin: admin@pilatesmermaid.com / admin123')
  console.log('🏃 Coach: esmeralda@pilatesmermaid.com / coach123')
  console.log('👤 Cliente: laura@example.com / cliente123')
  console.log('📞 WhatsApp: +52 958 106 2606\n')
  
  console.log('💡 Presiona Ctrl+C para detener la aplicación\n')

  // Start both frontend and backend
  const fullDevProcess = spawn('npm', ['run', 'dev:full'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
  })

  fullDevProcess.on('close', (code) => {
    console.log(`\n🛑 Aplicación detenida (código: ${code})`)
  })

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo aplicación...')
    fullDevProcess.kill('SIGINT')
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo aplicación...')
    fullDevProcess.kill('SIGTERM')
  })
}
