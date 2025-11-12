# 🚀 Guía de Inicio del Servidor - PilatesMermaid

## 📋 Pasos para Iniciar la Aplicación

### Opción 1: Iniciar Frontend y Backend Juntos (Recomendado)

Ejecuta el siguiente comando en la terminal desde la raíz del proyecto:

```bash
npm run dev:full
```

Este comando iniciará:
- **Frontend (Next.js)**: `http://localhost:3000`
- **Backend (Express)**: `http://localhost:3001`

### Opción 2: Iniciar por Separado

#### 1. Iniciar el Backend (Servidor API)

En una terminal, ejecuta:

```bash
npm run server
```

Esto iniciará el servidor backend en `http://localhost:3001`

#### 2. Iniciar el Frontend (Next.js)

En otra terminal, ejecuta:

```bash
npm run dev
```

Esto iniciará el frontend en `http://localhost:3000`

## 🌐 Acceso a la Aplicación

Una vez que ambos servidores estén corriendo:

1. **Frontend**: Abre tu navegador en `http://localhost:3000`
2. **Backend API**: Disponible en `http://localhost:3001/api`

## ✅ Verificar que los Servidores Están Corriendo

### Verificar Backend (Puerto 3001)

Abre tu navegador o usa curl:

```
http://localhost:3001/api/health
```

Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "...",
  "service": "PilatesMermaid API"
}
```

### Verificar Frontend (Puerto 3000)

Abre tu navegador en:

```
http://localhost:3000
```

Deberías ver la página de inicio de sesión.

## 🔧 Solución de Problemas

### Error: "This site can't be reached"

**Causa**: El frontend no está corriendo.

**Solución**:
1. Verifica que el puerto 3000 no esté siendo usado por otro proceso
2. Ejecuta `npm run dev` en una terminal
3. Espera a que aparezca el mensaje "Ready" en la terminal

### Error: "Error de conexión. Intenta de nuevo"

**Causa**: El backend no está corriendo o no está respondiendo.

**Solución**:
1. Verifica que el puerto 3001 no esté siendo usado por otro proceso
2. Ejecuta `npm run server` en una terminal
3. Verifica que no haya errores en la terminal del servidor
4. Verifica que puedas acceder a `http://localhost:3001/api/health`

### Error: "Port already in use"

**Causa**: El puerto ya está siendo usado por otro proceso.

**Solución**:
1. Encuentra el proceso que está usando el puerto:
   ```bash
   # Windows PowerShell
   Get-NetTCPConnection -LocalPort 3000
   Get-NetTCPConnection -LocalPort 3001
   ```

2. Detén el proceso o usa otro puerto:
   ```bash
   # Detener procesos de Node.js
   Get-Process -Name node | Stop-Process -Force
   ```

### Verificar que los Servidores Están Corriendo

**En PowerShell**:
```powershell
# Verificar puerto 3000 (Frontend)
Test-NetConnection -ComputerName localhost -Port 3000

# Verificar puerto 3001 (Backend)
Test-NetConnection -ComputerName localhost -Port 3001
```

**En CMD**:
```cmd
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

## 📝 Notas Importantes

1. **Ambos servidores deben estar corriendo** para que la aplicación funcione correctamente
2. El frontend se comunica con el backend en `http://localhost:3001`
3. Si cambias el puerto del backend, actualiza la configuración en el frontend
4. El servidor backend necesita acceso a la base de datos SQLite (`database.db`)

## 🎯 Comandos Útiles

```bash
# Iniciar frontend y backend juntos
npm run dev:full

# Solo frontend
npm run dev

# Solo backend
npm run server

# Ver procesos de Node.js corriendo
Get-Process -Name node

# Detener todos los procesos de Node.js
Get-Process -Name node | Stop-Process -Force
```

## 🔍 Logs y Debugging

### Ver logs del Backend

Los logs del backend aparecen en la terminal donde ejecutaste `npm run server`.

### Ver logs del Frontend

Los logs del frontend aparecen en la terminal donde ejecutaste `npm run dev`.

### Ver logs en el navegador

Abre las herramientas de desarrollo (F12) y ve a la pestaña "Console" para ver errores del frontend.

## ⚠️ Si Nada Funciona

1. Detén todos los procesos de Node.js:
   ```bash
   Get-Process -Name node | Stop-Process -Force
   ```

2. Reinstala las dependencias:
   ```bash
   npm install
   ```

3. Inicia los servidores de nuevo:
   ```bash
   npm run dev:full
   ```

4. Verifica que no haya errores en las terminales

5. Verifica que los puertos 3000 y 3001 estén disponibles



