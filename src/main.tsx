import { StrictMode, useMemo, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { useThemeStore } from './store/themeStore'

const queryClient = new QueryClient()

// Инициализация темы при загрузке
const initializeTheme = () => {
  const saved = localStorage.getItem('theme-mode')
  if (saved === 'dark' || saved === 'light') {
    document.body.setAttribute('data-theme', saved)
    return saved as 'light' | 'dark'
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.setAttribute('data-theme', 'dark')
    return 'dark'
  }
  document.body.setAttribute('data-theme', 'light')
  return 'light'
}

// Инициализируем тему до рендеринга
initializeTheme()

const AppWithTheme = () => {
  const mode = useThemeStore((state) => state.mode)

  useEffect(() => {
    document.body.setAttribute('data-theme', mode)
  }, [mode])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#ec407a',
          },
        },
      }),
    [mode],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppWithTheme />
    </QueryClientProvider>
  </StrictMode>,
)
