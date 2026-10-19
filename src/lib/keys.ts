import { useEffect, useRef } from 'react'

interface Handlers {
  /** Teclas 1–9: elegir la opción i (empezando en 0). Sin definir = desactivado */
  onOption?: (i: number) => void
  /** Intro: siguiente pregunta/partida. Sin definir = desactivado */
  onNext?: () => void
}

/**
 * Atajos de teclado de los juegos. Se ignoran mientras se escribe en un campo de
 * texto: así el Intro que envía la última respuesta no salta también a la siguiente.
 */
export function useGameKeys(handlers: Handlers) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const { onOption, onNext } = ref.current
      if (e.key === 'Enter' && onNext) {
        // Evita que un botón con el foco reciba además el clic del Intro
        e.preventDefault()
        onNext()
      } else if (/^[1-9]$/.test(e.key) && onOption) {
        e.preventDefault()
        onOption(Number(e.key) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
