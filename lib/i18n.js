/**
 * Sistema de internacionalización simple
 * Soporta español e inglés
 */

const translations = {
  // Navegación
  'nav.dashboard': { es: 'Dashboard', en: 'Dashboard' },
  'nav.clients': { es: 'Clientes', en: 'Clients' },
  'nav.coaches': { es: 'Coaches', en: 'Coaches' },
  'nav.classes': { es: 'Clases y Calendario', en: 'Classes & Calendar' },
  'nav.packages': { es: 'Paquetes', en: 'Packages' },
  'nav.attendance': { es: 'Asistencia', en: 'Attendance' },
  'nav.payments': { es: 'Pagos', en: 'Payments' },
  'nav.reports': { es: 'Reportes', en: 'Reports' },
  'nav.settings': { es: 'Configuración', en: 'Settings' },
  'nav.logout': { es: 'Cerrar Sesión', en: 'Log Out' },

  // Dashboard Cliente
  'client.greeting.morning': { es: 'Buenos días', en: 'Good morning' },
  'client.greeting.afternoon': { es: 'Buenas tardes', en: 'Good afternoon' },
  'client.greeting.evening': { es: 'Buenas noches', en: 'Good evening' },
  'client.welcome': { es: 'Bienvenido a tu dashboard personal', en: 'Welcome to your personal dashboard' },
  'client.refresh': { es: 'Refrescar', en: 'Refresh' },
  'client.activePackage': { es: 'Paquete Activo', en: 'Active Package' },
  'client.noActivePackage': { es: 'Sin Paquete Activo', en: 'No Active Package' },
  'client.noActivePackageDesc': { es: 'Aún no tienes un paquete de clases activo. Contacta por WhatsApp para elegir y comprar tu paquete.', en: 'You don\'t have an active class package yet. Contact via WhatsApp to choose and purchase your package.' },
  'client.buyPackage': { es: 'Comprar Paquete', en: 'Buy Package' },
  'client.expiresOn': { es: 'Vence el', en: 'Expires on' },
  'client.expiresIn': { es: 'Tu paquete vence en', en: 'Your package expires in' },
  'client.days': { es: 'días', en: 'days' },
  'client.contactRenew': { es: 'Contactar para renovar', en: 'Contact to renew' },
  'client.remainingClasses': { es: 'Clases Restantes', en: 'Remaining Classes' },
  'client.classesAttended': { es: 'Clases Asistidas', en: 'Classes Attended' },
  'client.activeBookings': { es: 'Reservas Activas', en: 'Active Bookings' },
  'client.daysRemaining': { es: 'Días Restantes', en: 'Days Remaining' },
  'client.packageHistory': { es: 'Historial de Paquetes', en: 'Package History' },
  'client.packagesBought': { es: 'Paquetes Comprados', en: 'Packages Bought' },
  'client.lastPackage': { es: 'Último Paquete', en: 'Last Package' },
  'client.avgPerPackage': { es: 'Promedio por Paquete', en: 'Average per Package' },
  'client.totalInvestment': { es: 'Inversión Total', en: 'Total Investment' },
  'client.totalInvested': { es: 'Total Invertido', en: 'Total Invested' },
  'client.costPerClass': { es: 'Costo por Clase', en: 'Cost per Class' },
  'client.paymentMethod': { es: 'Método de Pago', en: 'Payment Method' },
  'client.upcomingClasses': { es: 'Próximas Clases', en: 'Upcoming Classes' },
  'client.classesAndCalendar': { es: 'Clases y calendario', en: 'Classes and calendar' },
  'client.classesDesc': { es: 'Reserva tus clases grupales. Usa el calendario o cambia a la vista de lista para confirmar tu lugar.', en: 'Book your group classes. Use the calendar or switch to list view to confirm your spot.' },
  'client.calendar': { es: 'Calendario', en: 'Calendar' },
  'client.list': { es: 'Lista', en: 'List' },
  'client.book': { es: 'Reservar', en: 'Book' },
  'client.cancel': { es: 'Cancelar', en: 'Cancel' },
  'client.quickActions': { es: 'Acciones Rápidas', en: 'Quick Actions' },
  'client.viewSchedules': { es: 'Ver Horarios', en: 'View Schedules' },
  'client.bookClass': { es: 'Reservar Clase', en: 'Book Class' },
  'client.contactSupport': { es: 'Contactar Soporte', en: 'Contact Support' },
  'client.noClasses': { es: 'Aún no hay clases programadas.', en: 'No classes scheduled yet.' },
  'client.noUpcomingClasses': { es: 'No hay clases próximas disponibles.', en: 'No upcoming classes available.' },
  'client.viewAllClasses': { es: 'Ver todas las clases', en: 'View all classes' },
  'client.confirmed': { es: 'Confirmada', en: 'Confirmed' },
  'client.pending': { es: 'Pendiente', en: 'Pending' },
  'client.cancelled': { es: 'Cancelada', en: 'Cancelled' },
  'client.availableSpots': { es: 'lugares disponibles', en: 'spots available' },
  'client.lastSpot': { es: 'Último lugar', en: 'Last spot' },
  'client.lastSpots': { es: 'Últimos lugares', en: 'Last spots' },
  'client.classFull': { es: 'Clase llena', en: 'Class full' },
  'client.monthPrev': { es: 'Anterior', en: 'Previous' },
  'client.monthNext': { es: 'Siguiente', en: 'Next' },
  'client.today': { es: 'Hoy', en: 'Today' },
  'client.noClassesForDay': { es: 'Sin clases', en: 'No classes' },
  'client.classesFor': { es: 'Clases del', en: 'Classes for' },
  'client.selectClass': { es: 'Selecciona una clase para reservar o cancelar.', en: 'Select a class to book or cancel.' },
  'client.noClassesForDate': { es: 'No hay clases programadas para este día.', en: 'No classes scheduled for this day.' },
  'client.availablePlaces': { es: 'lugar disponible', en: 'spot available' },
  'client.cancelReservation': { es: 'Cancelar reserva', en: 'Cancel reservation' },
  'client.freeSpot': { es: 'Liberarás tu lugar para otra persona.', en: 'You will free up your spot for someone else.' },
}

export const getLanguage = () => {
  if (typeof window === 'undefined') return 'es'
  const saved = localStorage.getItem('language')
  return saved === 'en' ? 'en' : 'es'
}

export const setLanguage = (lang) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('language', lang)
  window.dispatchEvent(new Event('languagechange'))
}

export const t = (key, lang) => {
  const currentLang = lang || getLanguage()
  const translation = translations[key]
  if (!translation) {
    console.warn(`Translation missing for key: ${key}`)
    return key
  }
  return translation[currentLang] || translation.es || key
}

module.exports = { getLanguage, setLanguage, t, translations }



