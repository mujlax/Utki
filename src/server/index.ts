import { createServer } from 'http'
import { createApp } from './app'
import { env } from './config/env'

const port = Number(process.env.PORT ?? process.env.VERCEL_PORT ?? 4000)
const app = createApp()

// For Vercel serverless, the app is exported from api/index.ts
// For local development, create HTTP server
if (!process.env.VERCEL) {
  // Local development: create HTTP server
  createServer(app).listen(port, () => {
    console.log(`[wheel] Server listening on port ${port} (${env.appName})`)
  })
}
