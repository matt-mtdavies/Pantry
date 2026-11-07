import { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import RecipeCard from '../components/RecipeCard'
import TourPill from '../components/TourPill'
import { ShareIcon, CollectionIcon, ClockIcon, IngredientIcon } from '../components/icons'
import { getDemoRecipes } from '../lib/demo'
import { useDemoPhotos } from '../lib/demoPhotos'
import PhotoCredit from '../components/PhotoCredit'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import styles from './LandingPage.module.css'

// Front door for logged-out visitors at "/". Sells only what exists today:
// import, cook mode, collections, sharing and the dinner picker.

const STEPS = [
  {
    icon: <ShareIcon size={20} />,
    title: 'Save it from anywhere',
    text: 'Paste a link from any recipe site, or add a screenshot. The ingredients, steps and timings come through in about 20 seconds — no retyping.',
  },
  {
    icon: <ClockIcon size={20} />,
    title: 'Cook without the clutter',
    text: 'Cook mode is one big step at a time, with an ingredient checklist, built-in timers and the screen kept awake. It can read the steps aloud, too.',
  },
  {
    icon: <CollectionIcon size={20} />,
    title: 'Keep it in order',
    text: 'Favourite the keepers and group the rest into collections — weeknight dinners, weekend brunch, whatever works for you.',
  },
  {
    icon: <IngredientIcon size={20} />,
    title: 'Scale it, share it',
    text: 'Change the servings and every quantity follows, in metric or imperial. Send a recipe to anyone with a link — they don\'t need an account.',
  },
]

const DEMO_PICKS = ['de300000000000000000000000000001', 'de300000000000000000000000000002', 'de300000000000000000000000000008']

export default function LandingPage() {
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const signup = params.get('signup') === '1'

  useDocumentMeta({
    title: 'Pantry — every recipe you save, ready to cook',
    description: 'Save recipes from any site in seconds, scale them, and cook step by step. Free.',
    path: '/',
  })

  // Deep links like /?signup=1#get-started scroll to the sign-up card.
  useEffect(() => {
    if (hash === '#get-started') document.getElementById('get-started')?.scrollIntoView({ block: 'start' })
  }, [hash])

  const { ready, picks: photoPicks } = useDemoPhotos()
  const demoRecipes = ready ? getDemoRecipes() : []
  const picks = DEMO_PICKS.map(id => demoRecipes.find(r => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r)
  const heroCredit = photoPicks[DEMO_PICKS[0]] ?? null

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link to="/" className={styles.brand}>
            <img src="/pantry-mark.png" alt="" width={30} height={30} />
            <span>Pantry</span>
          </Link>
          <nav className={styles.topLinks} aria-label="Main">
            <Link to="/demo" className={styles.topLink}>Demo</Link>
            <a href="#get-started" className={styles.topSignIn}>Sign in</a>
          </nav>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.headline}>Every recipe you save, ready to cook.</h1>
            <p className={styles.lede}>
              Pantry turns recipe links and screenshots into clean, scalable recipes —
              then walks you through them one step at a time.
            </p>
            <div className={styles.heroCtas}>
              <Link to="/demo" className={styles.primaryBtn}>Explore the demo</Link>
              <a href="#get-started" className={styles.secondaryBtn}>Create free account</a>
            </div>
            <p className={styles.heroNote}>
              The demo is a real recipe box — no sign-up. Or <Link to="/tour" state={{ from: '/' }}>take the 2-minute tour</Link>.
            </p>
          </div>
          <Link to="/demo/recipe/de300000000000000000000000000001" className={styles.heroVisual} aria-label="Open the Shakshuka demo recipe">
            {ready && <img src={heroCredit?.url ?? '/demo/shakshuka.jpg'} alt="Shakshuka in a cast-iron pan" className={styles.heroImg} />}
            <div className={styles.heroCard}>
              <span className={styles.heroCardEyebrow}>From the demo</span>
              <span className={styles.heroCardTitle}>Shakshuka</span>
              <span className={styles.heroCardMeta}>30 min · serves 2 · 10 ingredients</span>
            </div>
          </Link>
          {heroCredit && <div className={styles.heroCredit}><PhotoCredit credit={heroCredit} /></div>}
        </section>

        <section className={styles.steps} aria-labelledby="how-heading">
          <h2 id="how-heading" className={styles.sectionTitle}>How it works</h2>
          <ol className={styles.stepGrid}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepIcon}>{s.icon}</span>
                <span className={styles.stepNum}>{i + 1}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepText}>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.picker} aria-labelledby="picker-heading">
          <div className={styles.pickerText}>
            <h2 id="picker-heading" className={styles.sectionTitle}>Stuck on dinner?</h2>
            <p className={styles.body}>
              Tell Pantry what you've got — say <em>eggs, spinach and feta</em> — and
              "What's for dinner tonight?" comes back with three ideas and a shopping list
              for anything you're missing. Save the one you like in a tap.
            </p>
          </div>
          <div className={styles.pickerMock} aria-hidden="true">
            <span className={styles.chip}>eggs</span>
            <span className={styles.chip}>spinach</span>
            <span className={styles.chip}>feta</span>
            <span className={styles.pickerArrow}>→</span>
            <span className={styles.pickerIdea}>Spinach &amp; feta omelette</span>
            <span className={styles.pickerIdea}>Shakshuka with greens</span>
            <span className={styles.pickerIdea}>Spanakopita-style bake</span>
          </div>
        </section>

        <section className={styles.demoStrip} aria-labelledby="demo-heading">
          <div className={styles.demoHead}>
            <h2 id="demo-heading" className={styles.sectionTitle}>Look inside a recipe box</h2>
            <Link to="/demo" className={styles.textLink}>See all 10 demo recipes →</Link>
          </div>
          <div className={styles.demoGrid}>
            {picks.map(r => <RecipeCard key={r.id} recipe={r} href={`/demo/recipe/${r.id}`} />)}
          </div>
        </section>

        <section className={styles.trust}>
          <div>
            <h2 className={styles.trustTitle}>Your recipes are yours</h2>
            <p className={styles.body}>
              Download everything you've saved, any time, from your profile.
              Pantry is free to use.
            </p>
          </div>
        </section>

        <section id="get-started" className={styles.getStarted} aria-label="Sign in or create an account">
          <AuthCard initialMode={signup ? 'register' : 'signin'} nextPath="/" />
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Pantry</span>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </footer>
      <TourPill />
    </div>
  )
}
