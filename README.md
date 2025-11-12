# 🧜‍♀️ PilatesMermaid - WebApp de Gestión para Estudio de Pilates

Una aplicación web moderna, segura y minimalista para gestionar un estudio de pilates. Reemplaza el Excel actual y centraliza la gestión de clientes, coaches, clases, paquetes, finanzas y reportes.

## 🌟 Características Principales

### 👥 Gestión de Usuarios
- **Tres roles de usuario**: Admin (dueña), Coach, Cliente
- **Autenticación segura** con JWT
- **Perfiles completos** con información médica, cumpleaños, y paquetes

### 📅 Gestión de Clases
- **Programación de clases** grupales y privadas
- **Calendario interactivo** para agendamiento
- **Control de asistencia** con razones de inasistencia
- **Gestión de cupos** y disponibilidad

### 💰 Sistema de Pagos Interno
- **Registro de pagos** sin procesamiento en línea
- **Cálculo automático** de pagos a coaches
- **Reglas de pago**: $250 MXN primeras 3 clases, $40 MXN adicionales
- **Reportes financieros** con exportación CSV

### 📱 Integración WhatsApp
- **Redirección automática** a WhatsApp para pagos y consultas
- **Mensajes prellenados** para diferentes acciones
- **Comunicación directa** sin procesar dinero en línea

### 📊 Reportes y Analytics
- **Dashboard administrativo** con estadísticas en tiempo real
- **Reportes de asistencia** y finanzas
- **Exportación de datos** a CSV/Excel
- **Seguimiento de cumpleaños** y vencimientos

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Git

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/pilates-mermaid.git
cd pilates-mermaid
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto:

```env
# JWT Secret (cambia por una clave segura)
JWT_SECRET=tu-clave-secreta-super-segura-aqui

# WhatsApp Business Number (formato internacional sin +)
STUDIO_WHATSAPP_PHONE=5259581062606

# Base de datos (opcional, por defecto usa SQLite)
DATABASE_URL=./data/pilates_mermaid.db

# Entorno
NODE_ENV=development
```

### 4. Inicializar Datos de Muestra
```bash
npm run init-data
```

### 5. Iniciar la Aplicación
```bash
# Iniciar frontend y backend simultáneamente
npm run dev:full

# O iniciar por separado:
npm run dev      # Frontend (puerto 3000)
npm run server   # Backend (puerto 3001)
```

## 🔐 Cuentas de Prueba

Después de ejecutar `npm run init-data`, tendrás estas cuentas disponibles:

### 👑 Administrador
- **Email**: admin@pilatesmermaid.com
- **Contraseña**: admin123
- **Acceso**: Dashboard completo, gestión de usuarios, reportes

### 🏃 Coach
- **Email**: ana@pilatesmermaid.com
- **Contraseña**: coach123
- **Acceso**: Clases asignadas, toma de asistencia, reportes de pago

### 👤 Cliente
- **Email**: laura@example.com
- **Contraseña**: cliente123
- **Acceso**: Ver clases, agendar, ver paquete, contactar WhatsApp

## 📱 Uso de la Aplicación

### Para Administradores
1. **Dashboard**: Vista general con estadísticas y actividad reciente
2. **Gestión de Clientes**: Agregar, editar, ver historial médico
3. **Programación de Clases**: Crear clases, asignar coaches, gestionar horarios
4. **Reportes**: Exportar datos financieros y de asistencia
5. **Configuración**: Gestionar paquetes y configuraciones del sistema

### Para Coaches
1. **Mis Clases**: Ver clases asignadas y confirmaciones
2. **Toma de Asistencia**: Marcar asistencia y razones de inasistencia
3. **Reportes de Pago**: Ver desglose de pagos y clases impartidas
4. **Perfil de Clientes**: Ver información médica y historial

### Para Clientes
1. **Mi Dashboard**: Ver clases restantes, próximas clases, cumpleaños
2. **Agendar Clases**: Ver calendario y reservar clases disponibles
3. **Mi Paquete**: Ver clases restantes y fecha de expiración
4. **Contactar**: Botones directos a WhatsApp para pagos y consultas

## 🔧 Estructura del Proyecto

```
pilates-mermaid/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Páginas del dashboard
│   ├── login/            # Autenticación
│   ├── register/         # Registro de usuarios
│   └── globals.css       # Estilos globales
├── components/           # Componentes React reutilizables
│   ├── DashboardLayout.tsx
│   └── WhatsAppButton.tsx
├── lib/                  # Utilidades y servicios
│   ├── auth.ts          # Autenticación y 2FA
│   ├── database.ts      # Base de datos SQLite
│   └── whatsapp.ts      # Integración WhatsApp
├── server/              # Backend Express.js
│   └── index.js         # API endpoints
├── scripts/             # Scripts de utilidad
│   └── init-sample-data.js
├── types/               # Definiciones TypeScript
└── data/               # Base de datos SQLite (generada)
```

## 🛡️ Seguridad

- **Autenticación JWT** con tokens seguros
- **2FA obligatorio** para admin y coaches
- **Validación de entrada** estricta
- **Rate limiting** para prevenir abuso
- **Helmet.js** para cabeceras de seguridad
- **Bcrypt** para hash de contraseñas
- **CORS** configurado correctamente

## 📊 Base de Datos

La aplicación usa SQLite con las siguientes tablas principales:

- **users**: Usuarios (admin, coaches, clientes)
- **classes**: Clases programadas
- **packages**: Paquetes de clases disponibles
- **attendance**: Registro de asistencia
- **payments**: Pagos a coaches
- **financial_records**: Registros financieros
- **class_history**: Historial de clases por usuario

## 🔄 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/verify-2fa` - Verificar 2FA

### Usuarios
- `GET /api/users` - Listar usuarios (admin)
- `GET /api/users/:id` - Obtener usuario específico

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas del dashboard

### WhatsApp
- `POST /api/whatsapp/generate-url` - Generar URL de WhatsApp

## 🎨 Diseño

- **Estilo minimalista** en blanco y negro
- **Responsive design** para móviles, tablets y escritorio
- **Animaciones suaves** con Framer Motion
- **Componentes modulares** y reutilizables
- **Tipografía Inter** para mejor legibilidad

## 🚀 Despliegue

### Producción
1. Configurar variables de entorno de producción
2. Construir la aplicación: `npm run build`
3. Iniciar en producción: `npm start`

### Variables de Entorno de Producción
```env
NODE_ENV=production
JWT_SECRET=clave-super-secreta-de-produccion
STUDIO_WHATSAPP_PHONE=525512345678
DATABASE_URL=./data/pilates_mermaid.db
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema
4. Contacta por WhatsApp: [Tu número de soporte]

## 🔮 Roadmap

- [ ] Notificaciones push
- [ ] App móvil nativa
- [ ] Integración con Google Calendar
- [ ] Sistema de cupones y descuentos
- [ ] Reportes avanzados con gráficos
- [ ] Multi-idioma (inglés/español)
- [ ] Integración con sistemas de pago

---

**PilatesMermaid** - Transformando la gestión de estudios de pilates 🧜‍♀️✨
