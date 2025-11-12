# 💰 Reglas de Pago a Coaches - CORREGIDAS

## ✅ **REGLAS ACTUALIZADAS CORRECTAMENTE**

---

## 📋 **NUEVAS REGLAS DE PAGO (POR PERSONA)**

### **🎯 Sistema de Pago por Persona Única:**

**Las reglas de pago se calculan por PERSONA ÚNICA que asiste a las clases, NO por clase impartida.**

### **💰 Estructura de Pagos:**

1. **Primeras 3 personas del período:** $250 MXN cada una
2. **Personas adicionales:** $40 MXN cada una

---

## 📊 **EJEMPLO DE CÁLCULO:**

### **Escenario:**
- Coach: Esmeralda García
- Período: Enero 2024
- Personas que asistieron a clases: 5 personas únicas

### **Cálculo:**
- **Primeras 3 personas:** $250 × 3 = $750 MXN
- **2 personas adicionales:** $40 × 2 = $80 MXN
- **TOTAL:** $750 + $80 = **$830 MXN**

---

## 🔧 **IMPLEMENTACIÓN TÉCNICA:**

### **Base de Datos Actualizada:**
```sql
-- Tabla coach_payments con nueva estructura
CREATE TABLE coach_payments (
  id TEXT PRIMARY KEY,
  coach_name TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_students INTEGER NOT NULL,        -- Total de personas únicas
  first_three_students INTEGER NOT NULL,  -- Primeras 3 personas
  additional_students INTEGER NOT NULL,   -- Personas adicionales
  first_three_amount INTEGER NOT NULL,    -- Monto primeras 3 ($250 c/u)
  additional_amount INTEGER NOT NULL,     -- Monto adicionales ($40 c/u)
  total_amount INTEGER NOT NULL,          -- Total a pagar
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
  payment_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### **Query de Cálculo:**
```sql
-- Obtener personas únicas que asistieron
SELECT a.clientId, a.clientName, COUNT(*) as classes_attended
FROM attendance a
JOIN classes c ON a.classId = c.id
WHERE a.coach_name = ? 
  AND a.class_date >= ? 
  AND a.class_date <= ?
  AND a.status = 'attended'
GROUP BY a.clientId, a.clientName
ORDER BY classes_attended DESC
```

---

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS:**

### **✅ Página de Pagos a Coaches:**
- Cálculo automático por persona única
- Visualización clara de las reglas
- Ejemplo de cálculo incluido
- Exportación a CSV actualizada

### **✅ Dashboard del Coach:**
- Estadísticas de estudiantes únicos
- Cálculo de ganancias por persona
- Información clara de las reglas

### **✅ API Endpoints:**
- Cálculo automático por persona única
- Gestión de períodos
- Marcado de pagos realizados

---

## 🚀 **COMANDOS DISPONIBLES:**

```bash
# Migrar estructura de base de datos
npm run migrate-payments

# Calcular pagos (ya actualizado)
# Se ejecuta desde la página de admin
```

---

## 📱 **INTERFAZ DE USUARIO:**

### **Página de Pagos (`/dashboard/coach-payments`):**
- ✅ Muestra "Estudiantes" en lugar de "Clases"
- ✅ Reglas claras: "Primeras 3 Personas del Período"
- ✅ Ejemplo de cálculo incluido
- ✅ Exportación CSV actualizada

### **Dashboard Coach (`/dashboard/coach`):**
- ✅ "Estudiantes únicos" en lugar de "clases impartidas"
- ✅ Nota explicativa sobre el cálculo por persona
- ✅ Reglas actualizadas en la interfaz

---

## 🎉 **¡CORRECCIÓN COMPLETADA!**

**Las reglas de pago ahora están correctamente implementadas:**

✅ **Por PERSONA ÚNICA** (no por clase)  
✅ **$250 MXN** por las primeras 3 personas  
✅ **$40 MXN** por cada persona adicional  
✅ **Base de datos actualizada**  
✅ **Interfaz corregida**  
✅ **API endpoints actualizados**  

**El sistema ahora calcula correctamente los pagos según las reglas establecidas.** 🧜‍♀️💰








