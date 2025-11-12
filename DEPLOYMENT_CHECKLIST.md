# ✅ Checklist de Deployment - PilatesMermaid

## 🎯 Antes de Hacer Deployment

### 1. Preparación del Código
- [ ] Código probado localmente
- [ ] Todas las funcionalidades funcionando
- [ ] Errores corregidos
- [ ] Código limpio y comentado
- [ ] Tests pasando (si existen)

### 2. Configuración de Entorno
- [ ] Ejecutar `node scripts/setup-production.js`
- [ ] Revisar `.env.production`
- [ ] JWT_SECRET generado y seguro
- [ ] Variables de entorno configuradas
- [ ] `.env.production` en `.gitignore`

### 3. Optimizaciones
- [ ] `next.config.js` actualizado para producción
- [ ] Imágenes optimizadas
- [ ] Bundle size verificado
- [ ] Lazy loading implementado
- [ ] Caching configurado

### 4. Seguridad
- [ ] JWT_SECRET único y seguro
- [ ] Contraseñas de aplicación configuradas
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad configurados
- [ ] Rate limiting configurado
- [ ] SSL/HTTPS planificado

### 5. Base de Datos
- [ ] Decidir entre SQLite o PostgreSQL
- [ ] Si PostgreSQL: configuración lista
- [ ] Backups configurados
- [ ] Migración de datos planificada

---

## 🚀 Durante el Deployment

### 1. Elegir Hosting
- [ ] Vercel + Railway (recomendado)
- [ ] DigitalOcean App Platform
- [ ] Render
- [ ] Fly.io
- [ ] Otro: _______________

### 2. Configurar Frontend
- [ ] Repositorio en GitHub
- [ ] Conectar a Vercel/Render
- [ ] Configurar variables de entorno
- [ ] Configurar dominio
- [ ] Verificar build exitoso

### 3. Configurar Backend
- [ ] Conectar a Railway/DigitalOcean
- [ ] Configurar variables de entorno
- [ ] Configurar base de datos
- [ ] Migrar datos (si es necesario)
- [ ] Verificar servidor corriendo

### 4. Configurar Base de Datos
- [ ] Crear base de datos PostgreSQL (si es necesario)
- [ ] Configurar conexión
- [ ] Migrar datos de SQLite (si es necesario)
- [ ] Verificar conexión
- [ ] Configurar backups

### 5. Configurar Dominio
- [ ] Comprar dominio (si es necesario)
- [ ] Configurar DNS records
- [ ] Configurar SSL/HTTPS
- [ ] Verificar dominio funcionando
- [ ] Configurar redirección HTTP a HTTPS

---

## 🔍 Después del Deployment

### 1. Verificación
- [ ] Frontend accesible
- [ ] Backend accesible
- [ ] API funcionando
- [ ] Base de datos conectada
- [ ] Autenticación funcionando
- [ ] Todas las rutas funcionando

### 2. Testing
- [ ] Login funcionando
- [ ] Registro funcionando
- [ ] Dashboard funcionando
- [ ] Clases funcionando
- [ ] Pagos funcionando
- [ ] Emails funcionando
- [ ] WhatsApp funcionando

### 3. Seguridad
- [ ] SSL/HTTPS funcionando
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad verificados
- [ ] Rate limiting funcionando
- [ ] Logs de seguridad verificados

### 4. Monitoring
- [ ] Error tracking configurado (Sentry)
- [ ] Uptime monitoring configurado
- [ ] Logs accesibles
- [ ] Alertas configuradas
- [ ] Analytics configurado (opcional)

### 5. Backups
- [ ] Backups automáticos configurados
- [ ] Backups probados
- [ ] Plan de recuperación documentado
- [ ] Frecuencia de backups definida

### 6. Documentación
- [ ] URL de producción documentada
- [ ] Credenciales de acceso documentadas
- [ ] Variables de entorno documentadas
- [ ] Procedimientos de backup documentados
- [ ] Procedimientos de recuperación documentados

---

## 📝 Post-Deployment

### 1. Primera Semana
- [ ] Monitorear errores diariamente
- [ ] Verificar logs diariamente
- [ ] Verificar backups diariamente
- [ ] Responder a problemas rápidamente
- [ ] Documentar problemas encontrados

### 2. Primera Mes
- [ ] Revisar métricas de uso
- [ ] Revisar errores acumulados
- [ ] Optimizar rendimiento
- [ ] Ajustar configuración según necesidad
- [ ] Planificar mejoras

### 3. Mantenimiento Continuo
- [ ] Actualizar dependencias regularmente
- [ ] Revisar logs de seguridad semanalmente
- [ ] Verificar backups semanalmente
- [ ] Actualizar documentación según necesidad
- [ ] Planificar nuevas features

---

## 🐛 Troubleshooting

### Problemas Comunes

#### Error de CORS
- [ ] Verificar `CORS_ORIGIN` en backend
- [ ] Verificar que el dominio esté en la lista
- [ ] Verificar headers de CORS

#### Error de conexión a base de datos
- [ ] Verificar `DATABASE_URL`
- [ ] Verificar que la base de datos esté accesible
- [ ] Verificar firewalls
- [ ] Verificar credenciales

#### Error 500 en producción
- [ ] Revisar logs del servidor
- [ ] Verificar variables de entorno
- [ ] Verificar que `NODE_ENV=production`
- [ ] Revisar error tracking (Sentry)

#### Emails no se envían
- [ ] Verificar `EMAIL_USER` y `EMAIL_PASSWORD`
- [ ] Verificar contraseña de aplicación
- [ ] Verificar puerto 587
- [ ] Revisar logs del servidor

#### Imágenes no cargan
- [ ] Verificar `next.config.js`
- [ ] Verificar que las imágenes estén en `public/`
- [ ] Verificar permisos de archivos
- [ ] Verificar dominio en `images.domains`

---

## 📞 Contacto de Soporte

Si tienes problemas:
1. Revisa los logs
2. Revisa la documentación
3. Revisa los issues en GitHub
4. Contacta al equipo de desarrollo

---

**Última actualización**: 2024-11-12


