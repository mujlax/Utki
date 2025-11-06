const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:4000'
  }
  // In production (e.g., Vercel), API is on the same domain at /api/*
  // Empty string means relative paths will be used
  return ''
}

export const clientEnv = {
  apiBaseUrl: resolveApiBaseUrl(),
  appName:
    import.meta.env.NEXT_PUBLIC_APP_NAME ?? 'Колесо уточечной удачи',
}
