export interface User {
  id: string
  unique_identifier: string
  nombre: string
  correo: string
  numero_de_telefono: string
  instagram?: string
  role: 'admin' | 'coach' | 'cliente'
  password_hash?: string
  type_of_class: 'Cortesía' | 'Muestra' | 'Individual' | '4' | '8' | '12' | 'Ilimitado'
  expiration_date?: string
  cumpleanos?: string
  lesion_o_limitacion_fisica?: string
  genero?: 'Masculino' | 'Femenino' | 'Otro'
  historial_de_clases: ClassHistory[]
  created_at: string
  updated_at: string
}

export interface ClassHistory {
  id: string
  class_id: string
  user_id: string
  status: 'confirmed' | 'attended' | 'no_show' | 'cancelled'
  cancellation_reason?: 'cancelled_on_time' | 'cancelled_late' | 'no_show' | 'studio_cancelled' | 'low_attendance'
  notes?: string
  created_at: string
}

export interface Class {
  id: string
  title: string
  type: 'group' | 'private'
  coach_id: string
  coach_name?: string
  date: string
  time: string
  duration: number // in minutes
  max_capacity: number
  current_bookings: number
  status: 'scheduled' | 'completed' | 'cancelled'
  description?: string
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  name: string
  type: 'Cortesía' | 'Muestra' | 'Individual' | '4' | '8' | '12' | 'Ilimitado'
  classes_included: number
  price: number
  validity_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  class_id: string
  user_id: string
  coach_id: string
  status: 'attended' | 'no_show'
  cancellation_reason?: string
  notes?: string
  created_at: string
}

export interface Payment {
  id: string
  coach_id: string
  class_id: string
  amount: number
  type: 'class_payment' | 'bonus'
  status: 'pending' | 'paid'
  payment_date?: string
  notes?: string
  created_at: string
}

export interface FinancialRecord {
  id: string
  date: string
  concept: string
  amount: number
  type: 'income' | 'expense'
  method: 'cash' | 'transfer'
  note?: string
  status: 'pending' | 'confirmed'
  created_at: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  message?: string
}

export interface DashboardStats {
  totalClients: number
  totalCoaches: number
  totalClasses: number
  totalRevenue: number
  upcomingBirthdays: User[]
  recentClasses: Class[]
  pendingPayments: Payment[]
}

export interface WhatsAppMessage {
  phone: string
  message: string
}

