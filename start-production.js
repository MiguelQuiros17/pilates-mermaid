#!/usr/bin/env node

// Production startup script for Railway
// This ensures Next.js is built and served correctly

process.env.NODE_ENV = process.env.NODE_ENV || 'production'

console.log('🚀 Starting PilatesMermaid in production mode...')
console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
console.log(`PORT: ${process.env.PORT || '3001'}`)

// Start the server
require('./server/index.js')