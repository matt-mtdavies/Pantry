// POST /api/auth/passkey/verify — finish a passkey sign-in and start a session.
// Body: { challengeId, response: AuthenticationResponseJSON }
import { verifyAuthenticationResponse, type AuthenticationResponseJSON, type AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit'
import {
  ensurePasskeyTables, relyingParty, consumeChallenge, createSession, json,
  type Env, type PasskeyRow,
} from '../../../lib/passkeys'

const GENERIC = "We couldn't sign you in with that passkey. Please try again."

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const ip = getClientIp(ctx.request)
  if (!(await checkRateLimit(ctx.env.DB, `passkey-verify:${ip}`, 20, 15 * 60))) {
    return json({ error: 'Too many sign-in attempts. Please try again later.' }, 429)
  }

  let challengeId: string, response: AuthenticationResponseJSON
  try {
    const body = await ctx.request.json() as { challengeId?: string; response?: AuthenticationResponseJSON }
    if (!body.challengeId || !body.response?.id) throw new Error()
    challengeId = body.challengeId
    response = body.response
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  await ensurePasskeyTables(ctx.env.DB)
  const challenge = await consumeChallenge(ctx.env.DB, challengeId, 'authenticate', null)
  if (!challenge) return json({ error: 'That sign-in request expired. Please try again.', code: 'challenge_expired' }, 400)

  const passkey = await ctx.env.DB.prepare('SELECT * FROM passkeys WHERE id = ?')
    .bind(response.id).first<PasskeyRow>()
  if (!passkey) {
    // The browser can use this to tell the password manager to forget the stale passkey.
    return json({ error: "This passkey isn't linked to a Pantry account any more. Sign in another way, then add a new passkey in your profile.", code: 'unknown_credential' }, 401)
  }

  const { rpID, origin } = relyingParty(ctx.request)
  let verified = false
  let newCounter = passkey.counter
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.id,
        publicKey: isoBase64URL.toBuffer(passkey.public_key),
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) as AuthenticatorTransportFuture[] : undefined,
      },
    })
    verified = result.verified
    newCounter = result.authenticationInfo.newCounter
  } catch (e) {
    console.error('passkey verify failed', e instanceof Error ? e.message : e)
    return json({ error: GENERIC }, 401)
  }
  if (!verified) return json({ error: GENERIC }, 401)

  const now = Math.floor(Date.now() / 1000)
  await ctx.env.DB.prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE id = ?')
    .bind(newCounter, now, passkey.id).run()

  const { sessionId, cookie } = await createSession(ctx.env.DB, passkey.user_id)
  return json({ ok: true, sessionId }, 200, { 'Set-Cookie': cookie })
}
