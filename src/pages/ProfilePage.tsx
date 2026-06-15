import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../hooks/useAuth'
import { backfillNutrition, backfillImages, getPublicProfile, uploadAvatar, removeAvatar } from '../lib/api'
import { avatarEmoji } from '../lib/avatars'
import { StarIcon, CameraIcon } from '../components/icons'
import { imageUrl } from '../lib/utils'
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
  const [inviteCopied, setInviteCopied] = useState(false)
  const [stats, setStats] = useState<{ recipe_count: number; avg_rating: number | null; total_ratings: number } | null>(null)

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    getPublicProfile(user.id)
      .then(p => setStats({ recipe_count: p.recipe_count, avg_rating: p.avg_rating, total_ratings: p.total_ratings }))
      .catch(() => {})
  }, [user])

  if (!user) return null

  const avatarSrc = avatarPreview ?? imageUrl(user.avatar_image_key ?? null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5 MB.')
      return
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const preview = URL.createObjectURL(file)
    previewUrlRef.current = preview
    setAvatarPreview(preview)

    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
      await refetch()
      setAvatarPreview(null)
      if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
    } catch {
      setAvatarError('Upload failed — please try again.')
      setAvatarPreview(null)
      if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      await removeAvatar()
      await refetch()
    } catch {
      setAvatarError('Could not remove photo — please try again.')
    } finally {
      setAvatarUploading(false)
    }
  }

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
          avatar_id: user.avatar_id,
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

  const handleInviteCopy = async () => {
    const url = `${window.location.origin}/auth`
    try {
      await navigator.clipboard.writeText(url)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2500)
    } catch { /* ignore */ }
  }

  const handleInviteShare = () => {
    const url = `${window.location.origin}/auth`
    navigator.share?.({ title: 'Join me on Pantry', text: 'Track and share your favourite recipes on Pantry.', url }).catch(() => {})
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
          {/* Profile hero */}
          <div className={styles.profileHero}>
            {/* Avatar upload */}
            <div className={styles.avatarArea}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
                aria-hidden="true"
              />
              <button
                className={`${styles.avatarBtn} ${avatarUploading ? styles.avatarBtnLoading : ''}`}
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change profile picture"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile picture" className={styles.avatarPhoto} />
                ) : (
                  <span className={styles.avatarEmoji}>{avatarEmoji(user.avatar_id)}</span>
                )}
                <div className={styles.avatarOverlay} aria-hidden="true">
                  {avatarUploading ? (
                    <span className={styles.avatarSpinner} />
                  ) : (
                    <>
                      <CameraIcon size={22} />
                      <span className={styles.avatarOverlayLabel}>Change photo</span>
                    </>
                  )}
                </div>
                {!avatarUploading && (
                  <div className={styles.avatarBadge} aria-hidden="true">
                    <CameraIcon size={12} />
                  </div>
                )}
              </button>
              {(user.avatar_image_key || avatarPreview) && !avatarUploading && (
                <button className={styles.avatarRemoveBtn} onClick={handleRemoveAvatar}>
                  Remove photo
                </button>
              )}
              {avatarError && <p className={styles.avatarError}>{avatarError}</p>}
            </div>

            <h1 className={styles.profileName}>{displayName || 'Your profile'}</h1>
            <p className={styles.profileEmail}>{user.email}</p>

            {stats && (
              <div className={styles.profileStats}>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatValue}>{stats.recipe_count}</span>
                  <span className={styles.profileStatLabel}>Recipe{stats.recipe_count !== 1 ? 's' : ''}</span>
                </div>
                {stats.avg_rating != null && (
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatValue}>
                      <StarIcon size={13} className={styles.profileStatStar} />
                      {stats.avg_rating.toFixed(1)}
                    </span>
                    <span className={styles.profileStatLabel}>Avg rating</span>
                  </div>
                )}
                {stats.total_ratings > 0 && (
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatValue}>{stats.total_ratings}</span>
                    <span className={styles.profileStatLabel}>Rating{stats.total_ratings !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            )}

            {user.is_public && (
              <Link to={`/user/${user.id}`} className={styles.viewProfileLink}>
                View your public profile →
              </Link>
            )}
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

            {/* Privacy toggle */}
            <div className={styles.field}>
              <span className={styles.label}>Profile visibility</span>
              <p className={styles.hint}>
                {isPublic
                  ? 'Your recipes appear in the community feed and others can view your profile and see your ratings.'
                  : 'Your recipes and profile are hidden from the community. Only you can see them.'}
              </p>
              <div className={styles.toggle}>
                <button
                  className={`${styles.toggleBtn} ${isPublic ? styles.toggleBtnActive : ''}`}
                  onClick={() => setIsPublic(true)}
                  aria-pressed={isPublic}
                >
                  Public
                </button>
                <button
                  className={`${styles.toggleBtn} ${!isPublic ? styles.toggleBtnActive : ''}`}
                  onClick={() => setIsPublic(false)}
                  aria-pressed={!isPublic}
                >
                  Private
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

          <div className={styles.inviteSection}>
            <h2 className={styles.inviteTitle}>Invite friends</h2>
            <p className={styles.inviteText}>
              Know someone who'd love to track their recipes? Send them a link.
            </p>
            {typeof navigator.share === 'function' ? (
              <button className={styles.inviteShareBtn} onClick={handleInviteShare}>
                Share Pantry
              </button>
            ) : (
              <button className={styles.inviteCopyBtn} onClick={handleInviteCopy}>
                {inviteCopied ? '✓ Copied!' : 'Copy invite link'}
              </button>
            )}
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
