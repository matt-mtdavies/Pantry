import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { DEMO_USER_ID } from '../../shared/demoIdentity'
import {
  passkeysSupported, listPasskeys, createPasskey, renamePasskey, deletePasskey, isPasskeyCancel,
  clearPasskeyNudge, type Passkey,
} from '../lib/passkeys'
import { PasskeyIcon, CheckIcon } from './icons'
import LoadError from './LoadError'
import styles from './PasskeyManager.module.css'

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function relativeTime(unix: number): string {
  const diff = unix - Date.now() / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return 'just now'
  if (abs < 3600) return rel.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rel.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rel.format(Math.round(diff / 86400), 'day')
  return dateFmt.format(new Date(unix * 1000))
}

/** Profile section: create, rename and remove passkeys. */
export default function PasskeyManager() {
  const { user } = useAuth()
  const [supported] = useState(passkeysSupported)
  const isDemo = user?.id === DEMO_USER_ID

  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null)
  const [handle, setHandle] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const renameInput = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoadFailed(false)
    listPasskeys()
      .then(({ passkeys, userHandle }) => { setPasskeys(passkeys); setHandle(userHandle) })
      .catch(() => setLoadFailed(true))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (editing) renameInput.current?.select() }, [editing])

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    try {
      const pk = await createPasskey()
      setPasskeys(list => [pk, ...(list ?? [])])
      setJustAdded(pk.id)
      setAnnounce(`Passkey saved: ${pk.name}`)
      clearPasskeyNudge()
    } catch (err) {
      if (err instanceof Error && err.name === 'InvalidStateError') {
        setError('This device or password manager already has a Pantry passkey. Use it to sign in, or add one from another device.')
      } else if (!isPasskeyCancel(err)) {
        setError(err instanceof Error ? err.message : "We couldn't create a passkey. Please try again.")
      }
    } finally {
      setCreating(false)
    }
  }

  const startRename = (pk: Passkey) => {
    setConfirmRemove(null)
    setEditing(pk.id)
    setDraft(pk.name)
  }

  const saveRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const id = editing
    const name = draft.trim()
    const current = passkeys?.find(p => p.id === id)
    if (!name || name === current?.name) { setEditing(null); return }
    setBusyId(id)
    setError('')
    try {
      const updated = await renamePasskey(id, name)
      setPasskeys(list => list?.map(p => (p.id === id ? updated : p)) ?? null)
      setEditing(null)
      setAnnounce(`Renamed to ${updated.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't rename that passkey.")
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (pk: Passkey) => {
    setBusyId(pk.id)
    setError('')
    try {
      await deletePasskey(pk.id, handle)
      setPasskeys(list => list?.filter(p => p.id !== pk.id) ?? null)
      setConfirmRemove(null)
      setAnnounce(`Removed ${pk.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't remove that passkey.")
    } finally {
      setBusyId(null)
    }
  }

  const count = passkeys?.length ?? 0

  return (
    <section className={styles.section} aria-labelledby="passkeys-title">
      <header className={styles.header}>
        <span className={styles.badge}><PasskeyIcon size={22} /></span>
        <div className={styles.headText}>
          <h2 id="passkeys-title" className={styles.title}>Passkeys</h2>
          <p className={styles.sub}>
            Sign in with Face ID, your fingerprint or screen lock. Nothing to remember, and nothing a fake site can steal.
          </p>
        </div>
      </header>

      {loadFailed ? (
        <LoadError onRetry={load} />
      ) : passkeys === null ? (
        <div className={styles.skeleton} aria-hidden="true" />
      ) : count === 0 ? (
        <ul className={styles.benefits}>
          <li><span className={styles.benefitDot} aria-hidden="true">1</span><span><strong>One tap.</strong> No password to type on your phone mid-recipe.</span></li>
          <li><span className={styles.benefitDot} aria-hidden="true">2</span><span><strong>Phishing-proof.</strong> It only works on the real Pantry site.</span></li>
          <li><span className={styles.benefitDot} aria-hidden="true">3</span><span><strong>Synced.</strong> Your password manager carries it to your other devices.</span></li>
        </ul>
      ) : (
        <ul className={styles.list}>
          {passkeys.map(pk => (
            <li key={pk.id} className={`${styles.item} ${justAdded === pk.id ? styles.itemNew : ''}`}>
              <span className={styles.itemIcon}><PasskeyIcon size={18} /></span>
              <div className={styles.itemBody}>
                {editing === pk.id ? (
                  <form className={styles.renameForm} onSubmit={saveRename}>
                    <label htmlFor={`pk-name-${pk.id}`} className="sr-only">Passkey name</label>
                    <input
                      id={`pk-name-${pk.id}`}
                      ref={renameInput}
                      className={styles.renameInput}
                      value={draft}
                      maxLength={60}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }}
                      disabled={busyId === pk.id}
                    />
                    <button type="submit" className={styles.smallPrimary} disabled={busyId === pk.id}>Save</button>
                    <button type="button" className={styles.smallGhost} onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <p className={styles.itemName}>
                      {pk.name}
                      {pk.synced && <span className={styles.syncedPill}><CheckIcon size={11} /> Synced</span>}
                    </p>
                    <p className={styles.itemMeta}>
                      Added {dateFmt.format(new Date(pk.created_at * 1000))}
                      <span aria-hidden="true"> · </span>
                      {pk.last_used_at ? `Last used ${relativeTime(pk.last_used_at)}` : 'Not used yet'}
                    </p>
                  </>
                )}

                {editing !== pk.id && confirmRemove !== pk.id && (
                  <div className={styles.itemActions}>
                    <button className={styles.textBtn} onClick={() => startRename(pk)} aria-label={`Rename ${pk.name}`}>Rename</button>
                    <button className={`${styles.textBtn} ${styles.textBtnDanger}`} onClick={() => { setEditing(null); setConfirmRemove(pk.id) }} aria-label={`Remove ${pk.name}`}>Remove</button>
                  </div>
                )}

                {confirmRemove === pk.id && (
                  <div className={styles.confirm} role="group" aria-label={`Remove ${pk.name}?`}>
                    <p className={styles.confirmText}>
                      {count === 1
                        ? "This is your only passkey. You'll sign in with your email instead."
                        : "You won't be able to sign in with this passkey any more."}
                      {' '}Also delete it from your password manager to tidy up.
                    </p>
                    <div className={styles.confirmActions}>
                      <button className={styles.smallDanger} onClick={() => handleRemove(pk)} disabled={busyId === pk.id}>
                        {busyId === pk.id ? 'Removing…' : 'Remove passkey'}
                      </button>
                      <button className={styles.smallGhost} onClick={() => setConfirmRemove(null)}>Keep it</button>
                    </div>
                  </div>
                )}
              </div>

            </li>
          ))}
        </ul>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {isDemo ? (
        <p className={styles.note}>Passkeys are turned off for the shared demo account. Create your own account to try one.</p>
      ) : !supported ? (
        <p className={styles.note}>This browser doesn't support passkeys. Try the latest Safari, Chrome, Edge or Firefox.</p>
      ) : passkeys !== null && (
        <button className={count === 0 ? styles.createBtn : styles.addBtn} onClick={handleCreate} disabled={creating}>
          {creating ? (
            <><span className={styles.spinner} aria-hidden="true" /> Waiting for your device…</>
          ) : count === 0 ? (
            <><PasskeyIcon size={18} /> Create a passkey</>
          ) : (
            <>+ Add another passkey</>
          )}
        </button>
      )}

      <p className="sr-only" aria-live="polite">{announce}</p>
    </section>
  )
}
