const { database } = require('../lib/database.js')
const bcrypt = require('bcryptjs')

async function createAdmin() {
  console.log('🔐 Creando usuario administrador...\n')

  try {
    // Esperar un momento para que las tablas se inicialicen
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Verificar si ya existe un admin con este email
    const existingAdmin = await database.getUserByEmail('admin@pilatesmermaid.com')
    
    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario admin con el email: admin@pilatesmermaid.com')
      console.log(`   Nombre: ${existingAdmin.nombre}`)
      console.log(`   ID: ${existingAdmin.id}`)
      console.log('\n💡 Si deseas crear otro admin, cambia el email en el script.')
      database.close()
      return
    }

    // Crear contraseña hash
    const adminPassword = await bcrypt.hash('admin123', 12)
    
    // Crear usuario admin
    const admin = await database.createUser({
      nombre: 'Administrador',
      correo: 'admin@pilatesmermaid.com',
      numero_de_telefono: '5512345678',
      instagram: null,
      role: 'admin',
      type_of_class: 'Ilimitado',
      expiration_date: null,
      cumpleanos: null,
      lesion_o_limitacion_fisica: null,
      genero: null,
      password_hash: adminPassword,
    })

    console.log('✅ Usuario administrador creado exitosamente!\n')
    console.log('📝 CREDENCIALES:')
    console.log(`   - Email: admin@pilatesmermaid.com`)
    console.log(`   - Contraseña: admin123`)
    console.log(`   - Nombre: ${admin.nombre}`)
    console.log(`   - ID: ${admin.id}`)
    console.log(`   - Rol: ${admin.role}\n`)
    console.log('🔐 Ahora puedes iniciar sesión con estas credenciales')

  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error)
  } finally {
    database.close()
  }
}

createAdmin()

