# Guía: Cómo Ver los Logs en el Navegador

## Pasos para Ver los Logs

1. **Abre la página del cliente** en tu navegador (http://localhost:3000)

2. **Abre la Consola del Navegador:**
   - Presiona **F12** en tu teclado
   - O haz clic derecho en la página → **Inspeccionar** → pestaña **Console**

3. **Busca los mensajes con estos símbolos:**
   - `📦 RESPUESTA DEL SERVIDOR:` - Muestra lo que el servidor devuelve
   - `🔄 ESTADO DE activePackage CAMBIÓ:` - Muestra cuando cambia el estado
   - `🎨 RENDERIZANDO COMPONENTE:` - Muestra qué se está renderizando

4. **Recarga la página** (F5) para ver los logs desde el inicio

## Qué Buscar en los Logs

### Si el servidor devuelve el paquete:
```
📦 RESPUESTA DEL SERVIDOR:
Success: true
Active Package: SÍ
  - Nombre: 12 Clases Grupales
  - Status: active
```

### Si el estado se establece correctamente:
```
🔄 ESTADO DE activePackage CAMBIÓ:
✅ activePackage ESTÁ ESTABLECIDO:
  - Nombre: 12 Clases Grupales
  - Status: active
✅ EL PAQUETE SE MOSTRARÁ EN LA PÁGINA
```

### Si se renderiza correctamente:
```
🎨 RENDERIZANDO COMPONENTE:
hasActivePackage: true
¿Se mostrará el paquete?: SÍ ✅
```

## Si No Ves los Logs

1. Asegúrate de que la consola esté abierta (F12)
2. Asegúrate de estar en la pestaña **Console** (no "Network" o "Elements")
3. Recarga la página (F5)
4. Si ves errores en rojo, cópialos y compártelos

## Compartir los Logs

1. Abre la consola (F12)
2. Haz clic derecho en los logs
3. Selecciona "Save as..." o "Copy"
4. Pega los logs aquí



