const { database } = require('../lib/database.js')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

async function initializeSampleData() {
  console.log('🚀 Initializing sample data for PilatesMermaid...')

  try {
    // Create sample admin user
    const adminPassword = await bcrypt.hash('admin123', 12)
    const admin = await database.createUser({
      nombre: 'María González',
      correo: 'admin@pilatesmermaid.com',
      numero_de_telefono: '5512345678',
      instagram: '@maria_pilates',
      role: 'admin',
      type_of_class: 'Ilimitado',
      cumpleanos: '1980-01-15',
      lesion_o_limitacion_fisica: 'Ninguna',
      genero: 'Femenino',
      clases_tomadas: 0,
      clases_restantes: 999,
      total_pagado: 0,
      password_hash: adminPassword,
    })
    console.log('✅ Admin user created:', admin.nombre)

    // Create sample coach users
    const coach1Password = await bcrypt.hash('coach123', 12)
    const coach1 = await database.createUser({
      nombre: 'Ana Rodríguez',
      correo: 'ana@pilatesmermaid.com',
      numero_de_telefono: '5512345679',
      instagram: '@ana_pilates',
      role: 'coach',
      type_of_class: 'Ilimitado',
      cumpleanos: '1985-06-20',
      lesion_o_limitacion_fisica: 'Ninguna',
      genero: 'Femenino',
      clases_tomadas: 0,
      clases_restantes: 999,
      total_pagado: 0,
      password_hash: coach1Password,
    })

    const coach2Password = await bcrypt.hash('coach123', 12)
    const coach2 = await database.createUser({
      nombre: 'Carlos Mendoza',
      correo: 'carlos@pilatesmermaid.com',
      numero_de_telefono: '5512345680',
      instagram: '@carlos_pilates',
      role: 'coach',
      type_of_class: 'Ilimitado',
      cumpleanos: '1982-09-10',
      lesion_o_limitacion_fisica: 'Ninguna',
      genero: 'Masculino',
      clases_tomadas: 0,
      clases_restantes: 999,
      total_pagado: 0,
      password_hash: coach2Password,
    })
    console.log('✅ Coach users created:', coach1.nombre, coach2.nombre)

    // Create sample client users
    const clients = [
      {
        nombre: 'Laura Martínez',
        correo: 'laura@example.com',
        numero_de_telefono: '5512345681',
        instagram: '@laura_martinez',
        role: 'cliente',
        type_of_class: 'Sin paquete',
        cumpleanos: '1990-05-15',
        lesion_o_limitacion_fisica: 'Dolor lumbar leve',
        genero: 'Femenino',
        expiration_date: null,
        clases_tomadas: 0,
        clases_restantes: 0,
        total_pagado: 0
      },
      {
        nombre: 'Roberto Silva',
        correo: 'roberto@example.com',
        numero_de_telefono: '5512345682',
        instagram: '@roberto_silva',
        role: 'cliente',
        type_of_class: 'Sin paquete',
        cumpleanos: '1985-08-22',
        lesion_o_limitacion_fisica: '',
        genero: 'Masculino',
        expiration_date: null,
        clases_tomadas: 0,
        clases_restantes: 0,
        total_pagado: 0
      },
      {
        nombre: 'Carmen López',
        correo: 'carmen@example.com',
        numero_de_telefono: '5512345683',
        instagram: '@carmen_lopez',
        role: 'cliente',
        type_of_class: 'Sin paquete',
        cumpleanos: '1992-12-10',
        lesion_o_limitacion_fisica: 'Problemas de rodilla',
        genero: 'Femenino',
        expiration_date: null,
        clases_tomadas: 0,
        clases_restantes: 0,
        total_pagado: 0
      },
      {
        nombre: 'Miguel Torres',
        correo: 'miguel@example.com',
        numero_de_telefono: '5512345684',
        instagram: '@miguel_torres',
        role: 'cliente',
        type_of_class: 'Sin paquete',
        cumpleanos: '1988-03-18',
        lesion_o_limitacion_fisica: '',
        genero: 'Masculino',
        expiration_date: null,
        clases_tomadas: 0,
        clases_restantes: 0,
        total_pagado: 0
      }
    ]

    // Create coach
    const coachPassword = await bcrypt.hash('coach123', 12)
    const coachData = {
      nombre: 'Esmeralda García',
      correo: 'esmeralda@pilatesmermaid.com',
      numero_de_telefono: '5512345678',
      instagram: '@esmeralda_pilates',
      role: 'coach',
      type_of_class: 'Sin paquete',
      cumpleanos: '1985-03-15',
      lesion_o_limitacion_fisica: 'Ninguna',
      genero: 'Femenino',
      clases_tomadas: 0,
      clases_restantes: 999,
      total_pagado: 0,
      password_hash: coachPassword,
    }
    
    const coach = await database.createUser(coachData)
    console.log('✅ Coach created:', coach.nombre)

    // Create clients
    const clientPassword = await bcrypt.hash('cliente123', 12)
    for (const clientData of clients) {
      const client = await database.createUser({
        ...clientData,
        password_hash: clientPassword,
      })
      console.log('✅ Client created:', client.nombre)
    }

    // Create sample packages
    const packages = [
      // Clases Grupales
      {
        name: 'Clase Prueba',
        type: 'Clase Prueba',
        classes_included: 1,
        price: 300,
        validity_days: 30
      },
      {
        name: '1 Clase Grupal',
        type: '1 Clase Grupal',
        classes_included: 1,
        price: 400,
        validity_days: 30
      },
      {
        name: '4 Clases Grupales',
        type: '4 Clases Grupales',
        classes_included: 4,
        price: 1400,
        validity_days: 30
      },
      {
        name: '8 Clases Grupales',
        type: '8 Clases Grupales',
        classes_included: 8,
        price: 2600,
        validity_days: 30
      },
      {
        name: '12 Clases Grupales',
        type: '12 Clases Grupales',
        classes_included: 12,
        price: 3600,
        validity_days: 30
      },
      {
        name: 'Clases Grupales Ilimitadas',
        type: 'Clases Grupales Ilimitadas',
        classes_included: 999,
        price: 4000,
        validity_days: 30
      },
      // Clases Privadas
      {
        name: '1 Clase Privada',
        type: '1 Clase Privada',
        classes_included: 1,
        price: 1200,
        validity_days: 30
      },
      {
        name: '4 Clases Privadas',
        type: '4 Clases Privadas',
        classes_included: 4,
        price: 4400,
        validity_days: 30
      },
      {
        name: '8 Clases Privadas',
        type: '8 Clases Privadas',
        classes_included: 8,
        price: 8000,
        validity_days: 30
      },
      {
        name: '12 Clases Privadas',
        type: '12 Clases Privadas',
        classes_included: 12,
        price: 10800,
        validity_days: 30
      },
      {
        name: '16 Clases Privadas',
        type: '16 Clases Privadas',
        classes_included: 16,
        price: 13600,
        validity_days: 30
      },
      {
        name: '20 Clases Privadas',
        type: '20 Clases Privadas',
        classes_included: 20,
        price: 17000,
        validity_days: 30
      }
    ]

    for (const packageData of packages) {
      const package_ = await database.createPackage(packageData)
      console.log('✅ Package created:', package_.name)
    }

    // Create sample classes
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const classes = [
      {
        title: 'Pilates Matutino',
        type: 'group',
        coach_id: coach1.id,
        date: tomorrow.toISOString().split('T')[0],
        time: '07:00',
        duration: 60,
        max_capacity: 8,
        current_bookings: 6,
        status: 'scheduled',
        description: 'Clase de pilates matutina para empezar el día con energía'
      },
      {
        title: 'Pilates Intermedio',
        type: 'group',
        coach_id: coach2.id,
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00',
        duration: 60,
        max_capacity: 10,
        current_bookings: 8,
        status: 'scheduled',
        description: 'Clase intermedia para alumnos con experiencia'
      },
      {
        title: 'Pilates Nocturno',
        type: 'group',
        coach_id: coach1.id,
        date: tomorrow.toISOString().split('T')[0],
        time: '19:00',
        duration: 60,
        max_capacity: 12,
        current_bookings: 10,
        status: 'scheduled',
        description: 'Clase nocturna para relajar después del trabajo'
      }
    ]

    for (const classData of classes) {
      const class_ = await database.createClass(classData)
      console.log('✅ Class created:', class_.title)
    }

    // Create sample financial records
    const financialRecords = [
      {
        date: today.toISOString().split('T')[0],
        concept: 'Venta paquete 8 clases - Laura Martínez',
        amount: 2600,
        type: 'income',
        method: 'transfer',
        note: 'Pago procesado vía transferencia',
        status: 'confirmed'
      },
      {
        date: today.toISOString().split('T')[0],
        concept: 'Pago coach Ana Rodríguez - 3 clases',
        amount: 750,
        type: 'expense',
        method: 'cash',
        note: 'Pago semanal a coach en efectivo',
        status: 'pending'
      },
      {
        date: today.toISOString().split('T')[0],
        concept: 'Venta paquete 12 clases - Roberto Silva',
        amount: 3600,
        type: 'income',
        method: 'cash',
        note: 'Renovación de paquete pagada en efectivo',
        status: 'confirmed'
      }
    ]

    for (const recordData of financialRecords) {
      const record = await database.createFinancialRecord(recordData)
      console.log('✅ Financial record created:', record.concept)
    }

    console.log('\n🎉 Sample data initialization completed successfully!')
    console.log('\n📋 Test accounts created:')
    console.log('👑 Admin: admin@pilatesmermaid.com / admin123')
    console.log('🏃 Coach: esmeralda@pilatesmermaid.com / coach123')
    console.log('👤 Client: laura@example.com / cliente123')
    console.log('\n📞 WhatsApp: +52 958 106 2606')
    console.log('\n🔗 Start the application and test with these accounts!')

  } catch (error) {
    console.error('❌ Error initializing sample data:', error)
  } finally {
    database.close()
  }
}

// Run the initialization
initializeSampleData()
