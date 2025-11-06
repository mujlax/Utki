import { createApp } from '../src/server/app.js'

// Vercel serverless function wrapper
// This exports the Express app so Vercel can handle all /api/* routes
export default createApp()

