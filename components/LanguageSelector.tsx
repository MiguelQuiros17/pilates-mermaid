'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type Language = 'es' | 'en'

interface LanguageOption {
  code: Language
  name: string
  flag: string
}

const languages: LanguageOption[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
]

export default function LanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('es')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Cargar idioma guardado
    const saved = localStorage.getItem('language') as Language
    if (saved && (saved === 'es' || saved === 'en')) {
      setCurrentLanguage(saved)
    } else {
      // Detectar idioma del navegador
      const browserLang = navigator.language.split('-')[0]
      const lang = browserLang === 'en' ? 'en' : 'es'
      setCurrentLanguage(lang)
      localStorage.setItem('language', lang)
    }
  }, [])

  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang)
    localStorage.setItem('language', lang)
    window.dispatchEvent(new Event('languagechange'))
    setIsOpen(false)
    // Recargar la página para aplicar cambios
    window.location.reload()
  }

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 transition-colors touch-manipulation min-h-[44px]"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-base font-medium hidden sm:inline">{currentLang.flag}</span>
        <span className="text-xs sm:text-sm font-medium hidden lg:inline">{currentLang.code.toUpperCase()}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[9997]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-[9998] overflow-hidden"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors touch-manipulation ${
                    currentLanguage === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <span className="ml-auto text-blue-600">✓</span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

