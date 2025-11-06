import { config } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

config()

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`)
  }
  return value
}

const parseServiceAccountKey = (rawKey: string) => {
  const normalized = rawKey.trim()
  const unescaped = normalized.replace(/\\n/g, '\n')
  if (unescaped.includes('BEGIN PRIVATE KEY')) {
    return unescaped
  }
  try {
    const decoded = Buffer.from(normalized, 'base64').toString('utf-8')
    if (decoded.includes('BEGIN PRIVATE KEY')) {
      return decoded
    }
  } catch {
    // fall through
  }
  return unescaped
}

const loadCredentialsFromFile = () => {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    resolve(process.cwd(), 'actual_credentials.json'),
  ].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    try {
      const filePath = candidate.startsWith('/')
        ? candidate
        : resolve(process.cwd(), candidate)
      if (!existsSync(filePath)) {
        continue
      }
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as {
        client_email?: string
        private_key?: string
      }
      if (parsed.client_email && parsed.private_key) {
        return {
          email: parsed.client_email,
          key: parseServiceAccountKey(parsed.private_key),
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to read service account credentials file: ${(error as Error).message}`,
      )
    }
  }
  return null
}

const resolveServiceAccount = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (email && key) {
    return {
      email,
      key: parseServiceAccountKey(key),
    }
  }
  const fromFile = loadCredentialsFromFile()
  if (fromFile) {
    return fromFile
  }
  throw new Error(
    'Missing Google service account credentials. Provide GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY env vars or set GOOGLE_APPLICATION_CREDENTIALS pointing to a JSON key file.',
  )
}

const serviceAccount = resolveServiceAccount()

export const env = {
  spreadsheetId: required('GOOGLE_SHEETS_SPREADSHEET_ID'),
  serviceAccountEmail: serviceAccount.email,
  serviceAccountKey: serviceAccount.key,
  authSecret: process.env.AUTH_SECRET ?? '',
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Колесо уточечной удачи',
}
