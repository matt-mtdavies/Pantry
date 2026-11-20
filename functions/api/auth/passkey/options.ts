// POST /api/auth/passkey/options — begin a passkey sign-in.
// Public. Returns WebAuthn request options with no allowCredentials, so any of the
// user's discoverable Pantry passkeys can answer (button flow and autofill alike).
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit'
import { ensurePasskeyTables, relyingParty, storeChallenge, json, type Env } from '../../../lib/passkeys'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const ip = getClientIp(ctx.request)
  if (!(await checkRateLimit(ctx.env.DB, `passkey-options:${ip}`, 30, 15 * 60))) {
    return json({ error: 'Too many sign-in attempts. Please try again later.' }, 429)
  }
  await ensurePasskeyTables(ctx.env.DB)
  const { rpID } = relyingParty(ctx.request)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    timeout: 5 * 60 * 1000,
  })
  const challengeId = await storeChallenge(ctx.env.DB, options.challenge, 'authenticate', null)
  return json({ challengeId, options })
}
