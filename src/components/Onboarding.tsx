import { useState, useRef } from 'react'
import styles from './Onboarding.module.css'

interface Props {
  onClose: () => void
}

// Kept to the core loop (save → cook). Discover/share are found naturally
// in the nav once there's something in the collection.
const SLIDES = [
  {
    title: 'Welcome to Pantry',
    sub: 'Your personal recipe collection, beautifully organised and always with you.',
    Illustration: WelcomeIllustration,
  },
  {
    title: 'Save recipes in seconds',
    sub: 'Snap a screenshot or paste a URL — we extract every ingredient and step automatically.',
    Illustration: ImportIllustration,
  },
  {
    title: 'Hands-free cook mode',
    sub: 'Step-by-step instructions with your screen staying on. Focus on the food, not the phone.',
    Illustration: CookIllustration,
  },
]

export default function Onboarding({ onClose }: Props) {
  const [slide, setSlide] = useState(0)
  const touchStartX = useRef(0)
  const isLast = slide === SLIDES.length - 1

  const next = () => {
    if (slide < SLIDES.length - 1) setSlide(s => s + 1)
    else onClose()
  }

  const prev = () => {
    if (slide > 0) setSlide(s => s - 1)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
  }

  const { title, sub, Illustration } = SLIDES[slide]

  return (
    <div className={styles.overlay} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className={styles.header}>
        <span className={styles.wordmark}>Pantry</span>
        <button className={styles.skip} onClick={onClose}>Skip</button>
      </div>

      <div className={styles.middle}>
        <div className={styles.content} key={`c-${slide}`}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.sub}>{sub}</p>
        </div>

        <div className={styles.illustrationWrap}>
          <div className={styles.illustrationInner} key={slide}>
            <Illustration />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.dots} aria-label="Slide progress">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === slide ? styles.dotActive : ''}`}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button className={styles.nextBtn} onClick={next}>
          {isLast ? 'Get cooking →' : 'Next'}
        </button>
      </div>
    </div>
  )
}

/* ── Illustrations ──────────────────────────────────────────────────── */

function WelcomeIllustration() {
  return (
    <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="150" cy="122" r="92" fill="#F3EFE8" />
      {/* Plate shadow */}
      <ellipse cx="152" cy="192" rx="66" ry="9" fill="#E8E0D4" opacity="0.5" />
      {/* Plate */}
      <circle cx="150" cy="126" r="72" fill="#FFFFFF" stroke="#E8E0D4" strokeWidth="1.5" />
      {/* Inner rim */}
      <circle cx="150" cy="126" r="60" fill="none" stroke="#F3EFE8" strokeWidth="2" />
      {/* Food area */}
      <ellipse cx="150" cy="126" rx="42" ry="32" fill="#FEF7F4" />
      {/* Elegant pasta swirls */}
      <path d="M130 118 Q140 107 152 118 Q164 129 174 118" stroke="#DFA088" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M126 128 Q136 117 148 128 Q160 139 172 128" stroke="#DFA088" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M132 138 Q142 127 154 138 Q164 147 172 140" stroke="#DFA088" strokeWidth="2" strokeLinecap="round" />
      {/* Sauce dots */}
      <circle cx="138" cy="113" r="3" fill="#A0522D" opacity="0.4" />
      <circle cx="164" cy="140" r="2.5" fill="#A0522D" opacity="0.35" />
      <circle cx="158" cy="112" r="2" fill="#A0522D" opacity="0.3" />
      {/* Herb garnish */}
      <line x1="148" y1="107" x2="152" y2="118" stroke="#7A8B6F" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M152 118 C147 109 151 104 154 111" stroke="#7A8B6F" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M152 118 C157 109 161 105 156 112" stroke="#7A8B6F" strokeWidth="1.75" strokeLinecap="round" />
      {/* Fork */}
      <line x1="90" y1="84" x2="90" y2="168" stroke="#C4B8AC" strokeWidth="2" strokeLinecap="round" />
      <line x1="86" y1="84" x2="86" y2="98" stroke="#C4B8AC" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="90" y1="84" x2="90" y2="98" stroke="#C4B8AC" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="94" y1="84" x2="94" y2="98" stroke="#C4B8AC" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M86 98 Q90 105 94 98" stroke="#C4B8AC" strokeWidth="1.5" fill="none" />
      {/* Knife */}
      <line x1="210" y1="84" x2="210" y2="168" stroke="#C4B8AC" strokeWidth="2" strokeLinecap="round" />
      <path d="M210 84 Q218 94 210 112" stroke="#C4B8AC" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Decorative dots */}
      <circle cx="58" cy="78" r="4.5" fill="#EBF0E8" />
      <circle cx="250" cy="74" r="3.5" fill="#F5E8E2" />
      <circle cx="50" cy="166" r="3" fill="#F5E8E2" />
      <circle cx="256" cy="172" r="3.5" fill="#EBF0E8" />
      <circle cx="76" cy="58" r="3" fill="#E8E0D4" />
      <circle cx="230" cy="56" r="3.5" fill="#E8E0D4" />
    </svg>
  )
}

function ImportIllustration() {
  return (
    <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="150" cy="125" r="96" fill="#F3EFE8" />
      {/* Phone body */}
      <rect x="98" y="28" width="104" height="184" rx="18" fill="#FFFFFF" stroke="#E8E0D4" strokeWidth="1.5" />
      {/* Phone screen */}
      <rect x="106" y="48" width="88" height="146" rx="10" fill="#FAF7F2" />
      {/* Notch */}
      <rect x="132" y="32" width="36" height="7" rx="3.5" fill="#E8E0D4" />
      {/* Screen: hero image placeholder */}
      <rect x="106" y="48" width="88" height="55" rx="10" fill="#F5E8E2" />
      <rect x="106" y="88" width="88" height="15" fill="#F5E8E2" />
      {/* Dish icon in image area */}
      <ellipse cx="150" cy="68" rx="18" ry="5" fill="none" stroke="#DFA088" strokeWidth="1.5" />
      <path d="M132 68 Q132 52 150 52 Q168 52 168 68" fill="none" stroke="#DFA088" strokeWidth="1.5" />
      <line x1="132" y1="72" x2="168" y2="72" stroke="#DFA088" strokeWidth="1.5" strokeLinecap="round" />
      {/* Screen: title line */}
      <rect x="114" y="112" width="72" height="6" rx="3" fill="#E8E0D4" />
      {/* Screen: text lines */}
      <rect x="114" y="124" width="58" height="4" rx="2" fill="#F3EFE8" />
      <rect x="114" y="133" width="64" height="4" rx="2" fill="#F3EFE8" />
      <rect x="114" y="142" width="44" height="4" rx="2" fill="#F3EFE8" />
      {/* Screen: ingredient chips */}
      <rect x="114" y="158" width="30" height="14" rx="7" fill="#EBF0E8" />
      <rect x="149" y="158" width="36" height="14" rx="7" fill="#F5E8E2" />
      {/* Camera bubble (left) */}
      <circle cx="66" cy="85" r="30" fill="#EBF0E8" />
      <rect x="52" y="74" width="28" height="22" rx="5" fill="none" stroke="#7A8B6F" strokeWidth="1.75" />
      <circle cx="66" cy="85" r="7" fill="none" stroke="#7A8B6F" strokeWidth="1.75" />
      <path d="M58 74 l3-5 h10 l3 5" fill="none" stroke="#7A8B6F" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Arrow from camera to phone */}
      <path d="M96 85 Q88 85 98 100" stroke="#7A8B6F" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      {/* Link bubble (right) */}
      <circle cx="234" cy="155" r="30" fill="#F5E8E2" />
      <path d="M224 155 Q224 148 231 148 h6 Q244 148 244 155 Q244 162 237 162 h-6 Q224 162 224 155 z" fill="none" stroke="#A0522D" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="228" y1="155" x2="236" y2="155" stroke="#A0522D" strokeWidth="1.75" strokeLinecap="round" />
      {/* Arrow from link to phone */}
      <path d="M204 150 Q210 145 202 132" stroke="#A0522D" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      {/* Sparkles */}
      <path d="M84 126 l2 4 4 2 -4 2 -2 4 -2-4 -4-2 4-2 z" fill="#A0522D" opacity="0.55" />
      <path d="M218 108 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5-3 -3-1.5 3-1.5 z" fill="#7A8B6F" opacity="0.65" />
      <circle cx="220" cy="84" r="3" fill="#A0522D" opacity="0.35" />
      <circle cx="78" cy="153" r="2.5" fill="#7A8B6F" opacity="0.4" />
    </svg>
  )
}

function CookIllustration() {
  return (
    <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="150" cy="122" r="96" fill="#F3EFE8" />
      {/* Main card */}
      <rect x="55" y="28" width="190" height="188" rx="16" fill="#FFFFFF" stroke="#E8E0D4" strokeWidth="1.5" />
      {/* Card header */}
      <rect x="55" y="28" width="190" height="52" rx="16" fill="#F5E8E2" />
      <rect x="55" y="64" width="190" height="16" fill="#F5E8E2" />
      {/* Header text */}
      <rect x="80" y="42" width="90" height="8" rx="4" fill="#A0522D" opacity="0.5" />
      <rect x="80" y="56" width="60" height="5" rx="2.5" fill="#DFA088" opacity="0.6" />
      {/* Timer icon in header */}
      <circle cx="214" cy="51" r="14" fill="none" stroke="#A0522D" strokeWidth="1.75" opacity="0.6" />
      <line x1="214" y1="51" x2="214" y2="44" stroke="#A0522D" strokeWidth="1.75" strokeLinecap="round" opacity="0.6" />
      <line x1="214" y1="51" x2="218" y2="54" stroke="#A0522D" strokeWidth="1.75" strokeLinecap="round" opacity="0.6" />
      {/* Step 1 - done */}
      <circle cx="82" cy="104" r="12" fill="#EBF0E8" />
      <path d="M77 104 l3.5 3.5 6-6" stroke="#7A8B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="102" y="98" width="98" height="6" rx="3" fill="#E8E0D4" />
      <rect x="102" y="109" width="70" height="4" rx="2" fill="#F3EFE8" />
      {/* Step 2 - done */}
      <circle cx="82" cy="146" r="12" fill="#EBF0E8" />
      <path d="M77 146 l3.5 3.5 6-6" stroke="#7A8B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="102" y="140" width="112" height="6" rx="3" fill="#E8E0D4" />
      <rect x="102" y="151" width="82" height="4" rx="2" fill="#F3EFE8" />
      {/* Step 3 - active */}
      <circle cx="82" cy="188" r="12" fill="#A0522D" />
      <rect x="79.5" y="185.5" width="5" height="5" rx="1" fill="#FFFFFF" />
      <rect x="102" y="183" width="120" height="6" rx="3" fill="#1F1B16" opacity="0.15" />
      <rect x="102" y="193" width="88" height="4" rx="2" fill="#1F1B16" opacity="0.08" />
      {/* Dividers */}
      <line x1="70" y1="126" x2="230" y2="126" stroke="#F3EFE8" strokeWidth="1" />
      <line x1="70" y1="168" x2="230" y2="168" stroke="#F3EFE8" strokeWidth="1" />
      {/* Screen-on badge */}
      <rect x="178" y="12" width="72" height="28" rx="14" fill="#FFFFFF" stroke="#E8E0D4" strokeWidth="1.25" />
      <circle cx="196" cy="26" r="5" fill="#EBF0E8" />
      <line x1="196" y1="23" x2="196" y2="26" stroke="#7A8B6F" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="196" y1="26" x2="198.5" y2="28" stroke="#7A8B6F" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="206" y="22" width="38" height="4" rx="2" fill="#E8E0D4" />
      <rect x="206" y="29" width="28" height="3" rx="1.5" fill="#F3EFE8" />
      {/* Decorative */}
      <circle cx="44" cy="88" r="4" fill="#F5E8E2" />
      <circle cx="262" cy="188" r="5" fill="#EBF0E8" />
      <circle cx="46" cy="178" r="3" fill="#EBF0E8" />
    </svg>
  )
}
