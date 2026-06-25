import { useState } from 'react'
import { ShareIcon, MailIcon, CopyIcon, CheckIcon } from './icons'
import styles from './ShareListButton.module.css'

interface Props {
  items: string[]
  recipeName: string
}

export function ShareListButton({ items, recipeName }: Props) {
  const [state, setState] = useState<'idle' | 'copied'>('idle')

  const formatted = `Shopping list for ${recipeName}\n\n${items.map(i => `• ${i}`).join('\n')}\n\nMade with Pantry — myopenpantry.com`

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: `Shopping list — ${recipeName}`, text: formatted }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(formatted).catch(() => {})
    setState('copied')
    setTimeout(() => setState('idle'), 2000)
  }

  const emailHref = `mailto:?subject=${encodeURIComponent(`Shopping list — ${recipeName}`)}&body=${encodeURIComponent(formatted)}`
  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className={styles.row}>
      <button
        className={`${styles.btn} ${state === 'copied' ? styles.success : ''}`}
        onClick={handleShare}
        aria-label={hasNativeShare ? 'Share shopping list' : 'Copy shopping list'}
      >
        {state === 'copied'
          ? <><CheckIcon size={14} /> Copied!</>
          : hasNativeShare
            ? <><ShareIcon size={14} /> Share list</>
            : <><CopyIcon size={14} /> Copy list</>
        }
      </button>
      <a className={styles.btn} href={emailHref} aria-label="Email shopping list">
        <MailIcon size={14} /> Email
      </a>
    </div>
  )
}
