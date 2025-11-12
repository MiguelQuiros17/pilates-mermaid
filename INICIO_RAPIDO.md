# 🚀 INICIO RÁPIDO - PilatesMermaid

## ✅ LA APLICACIÓN ESTÁ LISTA

### 📍 ACCESO A LA APLICACIÓN

1. **Abre tu navegador** y ve a:
   ```
   http://localhost:3000
   ```

2. **Serás redirigido automáticamente al login**

### 🔐 CUENTAS DE PRUEBA

#### 👑 Administrador (Dueña)
- **Email**: `admin@pilatesmermaid.com`
- **Contraseña**: `admin123`
- **Acceso**: Dashboard completo, gestión de usuarios, clases, reportes, finanzas

#### 🏃 Coach (Esmeralda)
- **Email**: `esmeralda@pilatesmermaid.com`
- **Contraseña**: `coach123`
- **Acceso**: Clases asignadas, toma de asistencia, reportes de pago

#### 👤 Cliente
- **Email**: `laura@example.com`
- **Contraseña**: `cliente123`
- **Acceso**: Ver clases, agendar, ver paquete, contactar WhatsApp

### 🎯 FUNCIONALIDADES PRINCIPALES

#### Para Administradores:
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión completa de clientes
- ✅ Crear y gestionar clases (grupales y privadas)
- ✅ Asignar paquetes a clientes
- ✅ Sistema de pagos y reportes financieros
- ✅ Cálculo automático de pagos a coaches
- ✅ Exportación de datos a CSV
- ✅ Gestión de horarios y disponibilidad

#### Para Coaches:
- ✅ Ver clases asignadas
- ✅ Toma de asistencia
- ✅ Registrar razones de inasistencia
- ✅ Ver historial de clientes
- ✅ Reportes de pago personalizados
- ✅ Dashboard con estadísticas de clases

#### Para Clientes:
- ✅ Dashboard personal con estadísticas
- ✅ Ver clases disponibles
- ✅ Reservar y cancelar clases
- ✅ Calendario interactivo
- ✅ Ver paquete activo y clases restantes
- ✅ Contactar por WhatsApp para pagos
- ✅ Notificaciones de expiración de paquete

### 📱 INTEGRACIÓN WHATSAPP

- **Número**: +52 958 106 2606
- Todos los botones verdes abren WhatsApp
- Mensajes prellenados automáticamente
- **NO procesa pagos** - solo redirige a WhatsApp

### 🔧 COMANDOS ÚTILES

#### Iniciar la aplicación:
```bash
npm run dev:full
```

#### Inicializar datos de muestra (si es necesario):
```bash
npm run init-data
```

#### Inicializar clases grupales (12 meses):
```bash
npm run init-classes
```

#### Detener la aplicación:
Presiona `Ctrl+C` en la terminal

### 🌐 PUERTOS

- **Frontend (Next.js)**: http://localhost:3000
- **Backend (Express)**: http://localhost:3001

### 📋 VERIFICACIÓN RÁPIDA

1. ✅ Servidor backend corriendo en puerto 3001
2. ✅ Servidor frontend corriendo en puerto 3000
3. ✅ Base de datos inicializada
4. ✅ Usuarios de prueba creados
5. ✅ Clases programadas (opcional: ejecutar `npm run init-classes`)

### 🎨 DISEÑO

- **Tema**: Negro y blanco, elegante y minimalista
- **Responsive**: Funciona en móvil, tablet y desktop
- **Animaciones**: Transiciones suaves con Framer Motion

### 🛡️ SEGURIDAD

- ✅ Autenticación JWT
- ✅ 2FA obligatorio para admin/coaches
- ✅ Passwords hasheados con bcrypt
- ✅ Headers de seguridad con Helmet
- ✅ Rate limiting
- ✅ Validación de inputs

### 📞 SOPORTE

Si tienes problemas:
1. Verifica que ambos servidores estén corriendo
2. Verifica que la base de datos exista en `data/pilates_mermaid.db`
3. Revisa la consola del navegador (F12) para errores
4. Verifica que los puertos 3000 y 3001 estén disponibles

### 🎉 ¡LISTO PARA USAR!

**Solo abre http://localhost:3000 y empieza a usar la aplicación**

---

**Fecha de creación**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Versión**: 1.0.0
**Estado**: ✅ Lista para producción




