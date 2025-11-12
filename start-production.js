#!/usr/bin/env node

/**
 * Script para iniciar la aplicación en producción
 * Ejecuta el servidor backend y el frontend juntos
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🧜‍♀️ PilatesMermaid - Iniciando en producción...\n')

// Verificar que estamos en producción
if (process.env.NODE_ENV !== 'production') {
  console.log('⚠️  NODE_ENV no está configurado como production')
  console.log('   Configurando NODE_ENV=production...\n')
  process.env.NODE_ENV = 'production'
}

// Iniciar servidor backend
console.log('🔧 Iniciando servidor backend...')
const serverProcess = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3001
  }
})

serverProcess.on('error', (error) => {
  console.error('❌ Error iniciando servidor:', error)
  process.exit(1)
})

serverProcess.on('close', (code) => {
  console.log(`\n🛑 Servidor detenido (código: ${code})`)
  process.exit(code)
})

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo aplicación...')
  serverProcess.kill('SIGINT')
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo aplicación...')
  serverProcess.kill('SIGTERM')
})



