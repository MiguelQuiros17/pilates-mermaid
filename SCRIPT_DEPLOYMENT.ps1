# Script de deployment para PowerShell
# Ejecuta este script paso a paso

Write-Host "=== DEPLOYMENT SCRIPT - PILATES MERMAID ===" -ForegroundColor Green
Write-Host ""

# Verificar Git
Write-Host "PASO 1: Verificando Git..." -ForegroundColor Yellow
if (git --version 2>&1) {
    Write-Host "✅ Git está instalado" -ForegroundColor Green
} else {
    Write-Host "❌ Git no está instalado. Por favor instálalo primero." -ForegroundColor Red
    exit 1
}

# Verificar que estamos en el directorio correcto
Write-Host "PASO 2: Verificando directorio..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "✅ Estamos en el directorio correcto" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró package.json. Por favor ejecuta este script en el directorio del proyecto." -ForegroundColor Red
    exit 1
}

# Verificar estado de Git
Write-Host "PASO 3: Verificando estado de Git..." -ForegroundColor Yellow
$gitStatus = git status --short 2>&1
if ($gitStatus -match "fatal: not a git repository") {
    Write-Host "⚠️  Git no está inicializado. Inicializando..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit - Ready for production"
    Write-Host "✅ Git inicializado" -ForegroundColor Green
} else {
    Write-Host "✅ Git está inicializado" -ForegroundColor Green
}

# Verificar remoto
Write-Host "PASO 4: Verificando remoto de GitHub..." -ForegroundColor Yellow
$remote = git remote -v 2>&1
if ($remote -match "origin") {
    Write-Host "✅ Remoto configurado: $remote" -ForegroundColor Green
} else {
    Write-Host "⚠️  Remoto no configurado." -ForegroundColor Yellow
    Write-Host "Por favor ejecuta:" -ForegroundColor Cyan
    Write-Host "  git remote add origin https://github.com/TU-USUARIO/pilates-mermaid.git" -ForegroundColor White
    Write-Host "  git branch -M main" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
}

Write-Host ""
Write-Host "=== SIGUIENTE PASO ===" -ForegroundColor Green
Write-Host "1. Crea un repositorio en GitHub: https://github.com/new" -ForegroundColor White
Write-Host "2. Conecta tu repositorio local con GitHub" -ForegroundColor White
Write-Host "3. Ve a Render: https://render.com" -ForegroundColor White
Write-Host "4. Crea un Web Service" -ForegroundColor White
Write-Host ""
Write-Host "Ver AYUDA_DEPLOYMENT.md para instrucciones detalladas" -ForegroundColor Cyan
Write-Host ""



