import React from 'react'
import { motion } from 'framer-motion'

interface MobileTableProps {
  headers: string[]
  data: any[]
  renderRow: (item: any, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
}

export default function MobileTable({
  headers,
  data,
  renderRow,
  className = '',
  emptyMessage = 'No hay datos disponibles'
}: MobileTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 table-mobile ${className}`}>
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="hover:bg-gray-50"
            >
              {renderRow(item, index)}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Componente para mostrar datos en formato de tarjetas en móvil
export function MobileCardView({
  data,
  renderCard,
  className = '',
  emptyMessage = 'No hay datos disponibles'
}: {
  data: any[]
  renderCard: (item: any, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {data.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="card-mobile"
        >
          {renderCard(item, index)}
        </motion.div>
      ))}
    </div>
  )
}







