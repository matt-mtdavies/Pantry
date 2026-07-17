import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../hooks/useAuth'
import { useOnboarding } from '../App'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { backfillNutrition, backfillImages, getPublicProfile, uploadAvatar, removeAvatar, createInvite } from '../lib/api'
import { avatarEmoji } from '../lib/avatars'
import { StarIcon, CameraIcon } from '../components/icons'
import { imageUrl } from '../lib/utils'
import { FeedbackModal } from '../components/FeedbackModal'
import styles from './ProfilePage.module.css'

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']
const AGE_OPTIONS = ['Prefer not to say', 'Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+']

export default function ProfilePage() {
  const { user, refetch, logout } = useAuth()
  const navigate = useNavigate()
  const onboarding = useOnboarding()
  const { canPrompt, isIos, isInstalled, install } = useInstallPrompt()

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [defaultServings, setDefaultServings] = useState(user?.default_servings ?? 2)
  const [isPublic, setIsPublic] = useState(user?.is_public ?? true)
  const [country, setCountry] = useState(user?.country ?? '')
  const [gender, setGender] = useState(user?.gender ?? 'Prefer not to say')
  const [ageBracket, setAgeBracket] = useState(user?.age_bracket ?? 'Prefer not to say')
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(user?.unit_system ?? 'metric')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState('')
  const [backfillingImgs, setBackfillingImgs] = useState(false)
  const [backfillImgsMsg, setBackfillImgsMsg] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [stats, setStats] = useState<{ recipe_count: number; avg_rating: number | null; total_ratings: number } | null>(null)

  // Avatar upload state
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const cropUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current)
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

  // Step 1: file selected → normalise EXIF orientation, then open crop modal
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError(null)

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setAvatarError('Image must be under 20 MB.')
      return
    }

    if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current)

    try {
      // Re-encode through canvas to bake EXIF orientation into pixel data.
      // Explicitly request 'from-image' so Safari honours the EXIF tag;
      // older browsers that don't support the option fall back gracefully.
      let bitmap: ImageBitmap
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
      } catch {
        bitmap = await createImageBitmap(file)
      }
      const MAX = 2400
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), 'image/jpeg', 0.92)
      )
      const src = URL.createObjectURL(blob)
      cropUrlRef.current = src
      setCropSrc(src)
    } catch {
      // Fallback: use the raw file directly
      const src = URL.createObjectURL(file)
      cropUrlRef.current = src
      setCropSrc(src)
    }
  }

  // Step 2: crop confirmed → upload blob
  const handleCropSave = async (blob: Blob) => {
    if (cropUrlRef.current) { URL.revokeObjectURL(cropUrlRef.current); cropUrlRef.current = null }
    setCropSrc(null)

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const preview = URL.createObjectURL(blob)
    previewUrlRef.current = preview
    setAvatarPreview(preview)

    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
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
    }
  }

  const handleCropCancel = () => {
    if (cropUrlRef.current) { URL.revokeObjectURL(cropUrlRef.current); cropUrlRef.current = null }
    setCropSrc(null)
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
          unit_system: unitSystem,
        }),
      })
      await refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => { await logout(); navigate('/auth') }

  const handleBackfill = async () => {
    setBackfilling(true); setBackfillMsg('')
    try {
      const r = await backfillNutrition()
      setBackfillMsg(r.message + (r.has_more ? ' — run again for more.' : ''))
    } catch { setBackfillMsg('Something went wrong. Please try again.') }
    finally { setBackfilling(false) }
  }

  const handleBackfillImages = async () => {
    setBackfillingImgs(true); setBackfillImgsMsg('')
    try {
      const r = await backfillImages()
      setBackfillImgsMsg(r.message + (r.has_more ? ' — run again for more.' : ''))
    } catch { setBackfillImgsMsg('Something went wrong. Please try again.') }
    finally { setBackfillingImgs(false) }
  }

  const getInviteUrl = async (): Promise<string> => {
    try {
      const { url } = await createInvite()
      return url
    } catch {
      return `${window.location.origin}/auth`
    }
  }

  const handleInviteCopy = async () => {
    setInviteLoading(true)
    try {
      const url = await getInviteUrl()
      await navigator.clipboard.writeText(url)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2500)
    } catch { /* ignore */ }
    finally { setInviteLoading(false) }
  }

  const handleInviteShare = async () => {
    setInviteLoading(true)
    try {
      const url = await getInviteUrl()
      const name = user?.display_name?.split(' ')[0] ?? null
      const text = name
        ? `${name} invited you to Pantry — save, share, discover and cook from your recipe collection.`
        : 'You\'re invited to Pantry — save, share, discover and cook from your recipe collection.'
      await navigator.share?.({ title: 'Join me on Pantry', text: `${text} ${url}` })
    } catch { /* user cancelled or share failed */ }
    finally { setInviteLoading(false) }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await fetch('/api/me', { method: 'DELETE', credentials: 'include' })
      try { localStorage.removeItem('pantry_session') } catch { /* ignore */ }
      navigate('/auth')
    } catch { setDeleting(false) }
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="content-col">

          {/* Profile hero */}
          <div className={styles.profileHero}>
            <div className={styles.avatarArea}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                aria-hidden="true"
              />
              <button
                className={`${styles.avatarBtn} ${avatarUploading ? styles.avatarBtnLoading : ''}`}
                onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change profile picture"
              >
                <span className={styles.avatarInner}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Profile picture" className={styles.avatarPhoto} />
                    : <span className={styles.avatarEmojiWrap}>{avatarEmoji(user.avatar_id)}</span>
                  }
                  <span className={styles.avatarOverlay} aria-hidden="true">
                    {avatarUploading
                      ? <span className={styles.avatarSpinner} />
                      : <><CameraIcon size={22} /><span className={styles.avatarOverlayLabel}>Change photo</span></>
                    }
                  </span>
                </span>
                {!avatarUploading && (
                  <span className={styles.avatarBadge} aria-hidden="true">
                    <CameraIcon size={12} />
                  </span>
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
            <div className={styles.field}>
              <label className={styles.label} htmlFor="display-name">Your name</label>
              <input id="display-name" className={styles.input} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Margaret" />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Profile visibility</span>
              <p className={styles.hint}>{isPublic ? 'Your recipes appear in the community feed and others can view your profile.' : 'Your recipes and profile are hidden from the community.'}</p>
              <div className={styles.toggle}>
                <button className={`${styles.toggleBtn} ${isPublic ? styles.toggleBtnActive : ''}`} onClick={() => setIsPublic(true)} aria-pressed={isPublic}>Public</button>
                <button className={`${styles.toggleBtn} ${!isPublic ? styles.toggleBtnActive : ''}`} onClick={() => setIsPublic(false)} aria-pressed={!isPublic}>Private</button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="country">Country <span className={styles.optional}>(optional)</span></label>
              <input id="country" className={styles.input} value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Australia" />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="gender">Gender</label>
              <select id="gender" className={styles.select} value={gender} onChange={e => setGender(e.target.value)}>
                {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="age-bracket">Age group</label>
              <select id="age-bracket" className={styles.select} value={ageBracket} onChange={e => setAgeBracket(e.target.value)}>
                {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Unit system</span>
              <p className={styles.hint}>Measurements across the app will be shown in your preferred units.</p>
              <div className={styles.toggle}>
                <button className={`${styles.toggleBtn} ${unitSystem === 'metric' ? styles.toggleBtnActive : ''}`} onClick={() => setUnitSystem('metric')} aria-pressed={unitSystem === 'metric'}>Metric</button>
                <button className={`${styles.toggleBtn} ${unitSystem === 'imperial' ? styles.toggleBtnActive : ''}`} onClick={() => setUnitSystem('imperial')} aria-pressed={unitSystem === 'imperial'}>Imperial</button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Default number of servings</label>
              <p className={styles.hint}>Used when scaling recipes in cook mode</p>
              <div className={styles.servingsRow}>
                <button className={styles.servingsBtn} onClick={() => setDefaultServings(s => Math.max(1, s - 1))} disabled={defaultServings <= 1} aria-label="Decrease">−</button>
                <span className={styles.servingsNum}>{defaultServings}</span>
                <button className={styles.servingsBtn} onClick={() => setDefaultServings(s => s + 1)} aria-label="Increase">+</button>
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
                <p className={styles.backfillText}>Find food photos for any recipes that don't have one yet.</p>
                <button className={styles.backfillBtn} onClick={handleBackfillImages} disabled={backfillingImgs}>{backfillingImgs ? 'Searching…' : 'Add missing photos'}</button>
                {backfillImgsMsg && <p className={styles.backfillResult}>{backfillImgsMsg}</p>}
              </div>
              <div className={styles.backfillItem}>
                <p className={styles.backfillLabel}>Add missing estimates</p>
                <p className={styles.backfillText}>Estimate calories and cost{user.country ? ` (${user.country} prices)` : ''} for recipes missing them.</p>
                <button className={styles.backfillBtn} onClick={handleBackfill} disabled={backfilling}>{backfilling ? 'Estimating…' : 'Fill in missing estimates'}</button>
                {backfillMsg && <p className={styles.backfillResult}>{backfillMsg}</p>}
              </div>
            </div>
          </div>

          <div className={styles.signOutSection}>
            <button className={styles.signOutBtn} onClick={handleLogout}>Sign out of Pantry</button>

            <button
              className={styles.inviteLinkBtn}
              onClick={typeof navigator.share === 'function' ? handleInviteShare : handleInviteCopy}
              disabled={inviteLoading}
            >
              {inviteLoading ? 'Preparing…' : inviteCopied ? '✓ Link copied' : 'Invite a friend'}
            </button>
            <button className={styles.inviteLinkBtn} onClick={() => onboarding?.open()}>
              How Pantry works
            </button>
            <button className={styles.inviteLinkBtn} onClick={() => setFeedbackOpen(true)}>
              Share feedback
            </button>
            {!isInstalled && (canPrompt || isIos) && (
              <>
                <button
                  className={styles.inviteLinkBtn}
                  onClick={isIos ? () => setShowIosHint(v => !v) : install}
                >
                  Add to Home Screen
                </button>
                {isIos && showIosHint && (
                  <div className={styles.iosHint}>
                    <div className={styles.iosHintBody}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.iosHintIcon} aria-hidden="true">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      <p className={styles.iosHintText}>
                        Tap the <strong>Share</strong> button in Safari, then choose <strong>"Add to Home Screen"</strong>
                      </p>
                    </div>
                    <button className={styles.iosHintClose} onClick={() => setShowIosHint(false)} aria-label="Dismiss">✕</button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.dangerZone}>
            <h2 className={styles.dangerTitle}>Danger zone</h2>
            {!confirmDelete ? (
              <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>Delete my account</button>
            ) : (
              <div className={styles.deleteConfirm}>
                <p className={styles.deleteWarning}>This permanently deletes your account and all your recipes. It can't be undone.</p>
                <div className={styles.deleteActions}>
                  <button className={styles.deleteConfirmBtn} onClick={handleDeleteAccount} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, delete everything'}</button>
                  <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.legalFooter}>
            <Link to="/terms" className={styles.legalFooterLink}>Terms of Service</Link>
            <Link to="/privacy" className={styles.legalFooterLink}>Privacy Policy</Link>
          </div>
        </div>
      </main>

      {cropSrc && <CropModal src={cropSrc} onSave={handleCropSave} onCancel={handleCropCancel} />}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}

/* ── Crop modal ──────────────────────────────────────────────────── */

const CROP_VIEW = 280

interface CropModalProps {
  src: string
  onSave: (blob: Blob) => void
  onCancel: () => void
}

function CropModal({ src, onSave, onCancel }: CropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [baseW, setBaseW] = useState(0)
  const [baseH, setBaseH] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  const baseWRef = useRef(0)
  const baseHRef = useRef(0)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

  const clampOffset = (x: number, y: number, z: number) => {
    const w = baseWRef.current * z
    const h = baseHRef.current * z
    const mx = Math.max(0, (w - CROP_VIEW) / 2)
    const my = Math.max(0, (h - CROP_VIEW) / 2)
    return { x: clamp(x, -mx, mx), y: clamp(y, -my, my) }
  }

  const applyZoom = (z: number) => {
    const cz = clamp(z, 1, 4)
    zoomRef.current = cz
    setZoom(cz)
    setOffset(prev => clampOffset(prev.x, prev.y, cz))
  }

  const onImgLoad = () => {
    const img = imgRef.current!
    const fitScale = Math.max(CROP_VIEW / img.naturalWidth, CROP_VIEW / img.naturalHeight)
    const bw = img.naturalWidth * fitScale
    const bh = img.naturalHeight * fitScale
    baseWRef.current = bw
    baseHRef.current = bh
    setBaseW(bw)
    setBaseH(bh)
    setLoaded(true)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = activePointers.current.get(e.pointerId)
    if (!prev) return

    if (activePointers.current.size >= 2) {
      // Pinch zoom
      const others = Array.from(activePointers.current.entries()).filter(([id]) => id !== e.pointerId)
      if (others.length > 0) {
        const other = others[0][1]
        const prevDist = Math.hypot(prev.x - other.x, prev.y - other.y)
        const newDist = Math.hypot(e.clientX - other.x, e.clientY - other.y)
        if (prevDist > 0) applyZoom(zoomRef.current * (newDist / prevDist))
      }
    } else {
      // Pan
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      setOffset(o => clampOffset(o.x + dx, o.y + dy, zoomRef.current))
    }
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    applyZoom(zoomRef.current * (1 - e.deltaY * 0.002))
  }

  const handleSave = () => {
    const img = imgRef.current!
    const OUTPUT = 400
    const ratio = OUTPUT / CROP_VIEW
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')!

    const dw = baseW * zoom * ratio
    const dh = baseH * zoom * ratio
    const dx = ((CROP_VIEW - baseW * zoom) / 2 + offset.x) * ratio
    const dy = ((CROP_VIEW - baseH * zoom) / 2 + offset.y) * ratio

    ctx.drawImage(img, dx, dy, dw, dh)
    canvas.toBlob(blob => { if (blob) onSave(blob) }, 'image/jpeg', 0.92)
  }

  const displayW = baseW * zoom
  const displayH = baseH * zoom
  const imgLeft = (CROP_VIEW - displayW) / 2 + offset.x
  const imgTop = (CROP_VIEW - displayH) / 2 + offset.y

  return (
    <div className={styles.cropOverlay} onWheel={onWheel}>
      <div className={styles.cropSheet}>
        <div className={styles.cropHandle} />
        <div className={styles.cropHeader}>
          <h2 className={styles.cropTitle}>Adjust your photo</h2>
          <button className={styles.wizardClose} onClick={onCancel} aria-label="Cancel">✕</button>
        </div>
        <p className={styles.cropHint}>Drag to reposition · pinch or use buttons to zoom</p>

        <div
          className={styles.cropCircle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            className={styles.cropImg}
            style={{ width: displayW, height: displayH, left: imgLeft, top: imgTop }}
            onLoad={onImgLoad}
            draggable={false}
          />
        </div>

        <div className={styles.cropZoomRow}>
          <button className={styles.cropZoomBtn} onClick={() => applyZoom(zoom - 0.15)} aria-label="Zoom out">−</button>
          <div className={styles.cropZoomTrack}>
            <div className={styles.cropZoomFill} style={{ width: `${((zoom - 1) / 3) * 100}%` }} />
          </div>
          <button className={styles.cropZoomBtn} onClick={() => applyZoom(zoom + 0.15)} aria-label="Zoom in">+</button>
        </div>

        <div className={styles.cropActions}>
          <button className={styles.deleteCancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.saveBtn} style={{ flex: 1 }} onClick={handleSave} disabled={!loaded}>
            Save photo
          </button>
        </div>
      </div>
    </div>
  )
}
