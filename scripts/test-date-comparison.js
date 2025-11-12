// Script para probar la lógica de comparación de fechas del endpoint
const endDateStr = '2025-12-12'
const dateParts = endDateStr.split('-')
let endDate
if (dateParts.length === 3) {
  // Crear fecha en hora local (mes es 0-indexed)
  endDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
} else {
  endDate = new Date(endDateStr)
}

const today = new Date()
today.setHours(0, 0, 0, 0)
endDate.setHours(0, 0, 0, 0)

const todayStr = today.toISOString().split('T')[0]
const endDateStr2 = endDateStr

console.log('=== TEST DE COMPARACIÓN DE FECHAS ===')
console.log('Today:', todayStr)
console.log('End date:', endDateStr2)
console.log('Today time:', today.getTime())
console.log('End date time:', endDate.getTime())
console.log('Comparison (endDate >= today):', endDate >= today)
console.log('Comparison (endDate < today):', endDate < today)
console.log('Result: Package is', endDate >= today ? 'ACTIVE' : 'EXPIRED')



