// GET  /api/passkeys            — list the signed-in user's passkeys
// POST /api/passkeys            — { step: 'options' } begin creating a passkey
//                                 { step: 'verify', challengeId, response } finish and save it
import { generateRegistrationOptions, verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { checkRateLimit } from '../../lib/rateLimit'
import {
  ensurePasskeyTables, relyingParty, storeChallenge, consumeChallenge, userHandle, isDemoUser,
  passkeyName, toPublicPasskey, json, RP_NAME, type Env, type PasskeyRow,
} from '../../lib/passkeys'

const MAX_PASSKEYS = 20

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  await ensurePasskeyTables(ctx.env.DB)
  const { results } = await ctx.env.DB.prepare(
    'SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all<PasskeyRow>()
  return json({ passkeys: results.map(toPublicPasskey), userHandle: isoBase64URL.fromBuffer(userHandle(userId)) })
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const email = ctx.data.email as string
  if (isDemoUser(userId)) {
    return json({ error: "Passkeys can't be added to the shared demo account. Create your own account to use one.", code: 'demo_account' }, 403)
  }
  if (!(await checkRateLimit(ctx.env.DB, `passkey-register:${userId}`, 20, 15 * 60))) {
    return json({ error: 'Too many attempts. Please try again in a few minutes.' }, 429)
  }

  let body: { step?: string; challengeId?: string; response?: RegistrationResponseJSON }
  try { body = await ctx.request.json() } catch { return json({ error: 'Invalid request body' }, 400) }

  await ensurePasskeyTables(ctx.env.DB)
  const db = ctx.env.DB
  const { rpID, origin } = relyingParty(ctx.request)

  const { results: existing } = await db.prepare('SELECT id, transports FROM passkeys WHERE user_id = ?')
    .bind(userId).all<{ id: string; transports: string | null }>()

  if (body.step === 'options') {
    if (existing.length >= MAX_PASSKEYS) {
      return json({ error: `You can have up to ${MAX_PASSKEYS} passkeys. Remove one to add another.` }, 400)
    }
    const user = await db.prepare('SELECT display_name FROM users WHERE id = ?').bind(userId).first<{ display_name: string | null }>()
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: userHandle(userId),
      userName: email,
      userDisplayName: user?.display_name || email,
      attestationType: 'none',
      timeout: 5 * 60 * 1000,
      // One passkey per provider: the browser skips providers that already hold one.
      excludeCredentials: existing.map(c => ({
        id: c.id,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'required',        // discoverable → email-free sign-in + autofill
        userVerification: 'preferred',
      },
      // Ed25519, ES256, RS256 (SimpleWebAuthn's defaults cover every common provider).
    })
    const challengeId = await storeChallenge(db, options.challenge, 'register', userId)
    return json({ challengeId, options })
  }

  if (body.step === 'verify') {
    if (!body.challengeId || !body.response?.id) return json({ error: 'Invalid request body' }, 400)
    const challenge = await consumeChallenge(db, body.challengeId, 'register', userId)
    if (!challenge) return json({ error: 'That request expired. Please try again.', code: 'challenge_expired' }, 400)

    let verification
    try {
      verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      })
    } catch (e) {
      console.error('passkey registration failed', e instanceof Error ? e.message : e)
      return json({ error: "We couldn't save that passkey. Please try again." }, 400)
    }
    if (!verification.verified || !verification.registrationInfo) {
      return json({ error: "We couldn't save that passkey. Please try again." }, 400)
    }

    const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo
    const taken = await db.prepare('SELECT user_id FROM passkeys WHERE id = ?').bind(credential.id).first<{ user_id: string }>()
    if (taken) return json({ error: 'That passkey is already saved.' }, 409)

    const now = Math.floor(Date.now() / 1000)
    const row: PasskeyRow = {
      id: credential.id,
      user_id: userId,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: JSON.stringify(credential.transports ?? body.response.response.transports ?? []),
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp ? 1 : 0,
      aaguid: aaguid ?? null,
      name: passkeyName(aaguid, credentialDeviceType, ctx.request),
      created_at: now,
      last_used_at: null,
    }
    await db.prepare(`
      INSERT INTO passkeys (id, user_id, public_key, counter, transports, device_type, backed_up, aaguid, name, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(row.id, row.user_id, row.public_key, row.counter, row.transports, row.device_type,
      row.backed_up, row.aaguid, row.name, row.created_at, row.last_used_at).run()

    return json({ passkey: toPublicPasskey(row) }, 201)
  }

  return json({ error: 'Unknown step' }, 400)
}
