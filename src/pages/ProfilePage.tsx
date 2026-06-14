import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../hooks/useAuth'
import { backfillNutrition, backfillImages } from '../lib/api'
import { AVATARS } from '../lib/avatars'
import styles from './ProfilePage.module.css'

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']

const AGE_OPTIONS = [
  'Prefer not to say',
  'Under 18',
  '18–24',
  '25–34',
  '35–44',
  '45–54',
  '55–64',
  '65+',
]

export default function ProfilePage() {
  const { user, refetch, logout } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [avatarId, setAvatarId] = useState(user?.avatar_id ?? 'herb')
  const [defaultServings, setDefaultServings] = useState(user?.default_servings ?? 2)
  const [isPublic, setIsPublic] = useState(user?.is_public ?? true)
  const [country, setCountry] = useState(user?.country ?? '')
  const [gender, setGender] = useState(user?.gender ?? 'Prefer not to say')
  const [ageBracket, setAgeBracket] = useState(user?.age_bracket ?? 'Prefer not to say')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState('')
  const [backfillingImgs, setBackfillingImgs] = useState(false)
  const [backfillImgsMsg, setBackfillImgsMsg] = useState('')

  if (!user) return null

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          avatar_id: avatarId,
          default_servings: defaultServings,
          is_public: isPublic,
          country: country || null,
          gender: gender === 'Prefer not to say' ? null : gender,
          age_bracket: ageBracket === 'Prefer not to say' ? null : ageBracket,
        }),
      })
      await refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  const handleBackfill = async () => {
    setBackfilling(true)
    setBackfillMsg('')
    try {
      const result = await backfillNutrition()
      setBackfillMsg(result.message + (result.has_more ? ' — run again for more.' : ''))
    } catch {
      setBackfillMsg('Something went wrong. Please try again.')
    } finally {
      setBackfilling(false)
    }
  }

  const handleBackfillImages = async () => {
    setBackfillingImgs(true)
    setBackfillImgsMsg('')
    try {
      const result = await backfillImages()
      setBackfillImgsMsg(result.message + (result.has_more ? ' — run again for more.' : ''))
    } catch {
      setBackfillImgsMsg('Something went wrong. Please try again.')
    } finally {
      setBackfillingImgs(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await fetch('/api/me', { method: 'DELETE', credentials: 'include' })
      try { localStorage.removeItem('pantry_session') } catch { /* ignore */ }
      navigate('/auth')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="content-col">
          <div className={styles.header}>
            <h1 className={styles.title}>My profile</h1>
            <p className={styles.email}>{user.email}</p>
          </div>

          <div className={styles.form}>

            {/* Display name */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="display-name">Your name</label>
              <input
                id="display-name"
                className={styles.input}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Margaret"
              />
            </div>

            {/* Avatar */}
            <div className={styles.field}>
              <span className={styles.label}>Profile picture</span>
              <div className={styles.avatars}>
                {AVATARS.map(a => (
                  <button
                    key={a.id}
                    className={`${styles.avatarBtn} ${avatarId === a.id ? styles.avatarSelected : ''}`}
                    onClick={() => setAvatarId(a.id)}
                    aria-label={a.label}
                    aria-pressed={avatarId === a.id}
                  >
                    <span className={styles.avatarEmoji}>{a.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy toggle */}
            <div className={styles.field}>
              <span className={styles.label}>Profile visibility</span>
              <p className={styles.hint}>
                Public profiles appear in community search and the leaderboard.
              </p>
              <div className={styles.toggle}>
                <button
                  className={`${styles.toggleBtn} ${isPublic ? styles.toggleBtnActive : ''}`}
                  onClick={() => setIsPublic(true)}
                  aria-pressed={isPublic}
                >
                  🌍 Public
                </button>
                <button
                  className={`${styles.toggleBtn} ${!isPublic ? styles.toggleBtnActive : ''}`}
                  onClick={() => setIsPublic(false)}
                  aria-pressed={!isPublic}
                >
                  🔒 Private
                </button>
              </div>
            </div>

            {/* Country */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="country">
                Country <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="country"
                className={styles.input}
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g. Australia"
              />
            </div>

            {/* Gender */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="gender">Gender</label>
              <select
                id="gender"
                className={styles.select}
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Age bracket */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="age-bracket">Age group</label>
              <select
                id="age-bracket"
                className={styles.select}
                value={ageBracket}
                onChange={e => setAgeBracket(e.target.value)}
              >
                {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Default servings */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="default-servings">
                Default number of servings
              </label>
              <p className={styles.hint}>Used when scaling recipes in cook mode</p>
              <div className={styles.servingsRow}>
                <button
                  className={styles.servingsBtn}
                  onClick={() => setDefaultServings(s => Math.max(1, s - 1))}
                  disabled={defaultServings <= 1}
                  aria-label="Decrease"
                >−</button>
                <span className={styles.servingsNum} id="default-servings">{defaultServings}</span>
                <button
                  className={styles.servingsBtn}
                  onClick={() => setDefaultServings(s => s + 1)}
                  aria-label="Increase"
                >+</button>
              </div>
            </div>

            <div className={styles.saveRow}>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className={styles.backfillSection}>
            <h2 className={styles.backfillTitle}>Recipe improvements</h2>

            <div className={styles.backfillRow}>
              <div className={styles.backfillItem}>
                <p className={styles.backfillLabel}>Add missing photos</p>
                <p className={styles.backfillText}>
                  Find food photos for any recipes that don't have one yet.
                </p>
                <button
                  className={styles.backfillBtn}
                  onClick={handleBackfillImages}
                  disabled={backfillingImgs}
                >
                  {backfillingImgs ? 'Searching…' : 'Add missing photos'}
                </button>
                {backfillImgsMsg && <p className={styles.backfillResult}>{backfillImgsMsg}</p>}
              </div>

              <div className={styles.backfillItem}>
                <p className={styles.backfillLabel}>Add missing estimates</p>
                <p className={styles.backfillText}>
                  Estimate calories and cost{user.country ? ` (${user.country} prices)` : ''} for recipes missing them.
                </p>
                <button
                  className={styles.backfillBtn}
                  onClick={handleBackfill}
                  disabled={backfilling}
                >
                  {backfilling ? 'Estimating…' : 'Fill in missing estimates'}
                </button>
                {backfillMsg && <p className={styles.backfillResult}>{backfillMsg}</p>}
              </div>
            </div>
          </div>

          <div className={styles.signOutSection}>
            <button className={styles.signOutBtn} onClick={handleLogout}>
              Sign out of Pantry
            </button>
          </div>

          <div className={styles.dangerZone}>
            <h2 className={styles.dangerTitle}>Danger zone</h2>
            {!confirmDelete ? (
              <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
                Delete my account
              </button>
            ) : (
              <div className={styles.deleteConfirm}>
                <p className={styles.deleteWarning}>
                  This permanently deletes your account and all your recipes. It can't be undone.
                </p>
                <div className={styles.deleteActions}>
                  <button
                    className={styles.deleteConfirmBtn}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete everything'}
                  </button>
                  <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
