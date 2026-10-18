import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'studysite-theme'

/** Preferência local do leitor; escuro é o padrão. localStorage pode falhar (modo privado). */
export function storedTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(storedTheme)
  useEffect(() => applyTheme(theme), [theme])
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // sem persistência: vale só para esta visita
      }
      return next
    })
  }, [])
  return { theme, toggle }
}
