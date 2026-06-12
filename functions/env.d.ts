export interface Env {
  DB: D1Database
  R2: R2Bucket
  ANTHROPIC_API_KEY: string
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
  APP_URL: string
}

export interface SessionData {
  userId: string
  email: string
}

declare module '@cloudflare/workers-types' {}
