import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import Navigation from '../components/Navigation'
import { useAuth } from '../hooks/useAuth'
import styles from './AdminPage.module.css'

interface AdminStats {
  users: {
    total: number; newThisWeek: number; newThisMonth: number; activeThisWeek: number
    daily: Array<{ date: string; count: number }>
  }
  recipes: {
    total: number; public: number; withImages: number; newThisWeek: number; newThisMonth: number
    daily: Array<{ date: string; count: number }>
  }
  engagement: {
    totalFavourites: number; totalRatings: number; avgRating: number | null; totalCollections: number
    dailyFavourites: Array<{ date: string; count: number }>
    dailyRatings: Array<{ date: string; count: number }>
    topRecipes: Array<{ id: string; title: string; fave_count: number; avg_rating: number | null }>
  }
  invites: {
    total: number; used: number; thisWeek: number; conversionPct: number
  } | null
  ai: {
    thisMonth: { screenshot: number; url: number; dinner: number; tts: number }
    anthropicCostUsd: number
    openaiCostUsd: number
    totalCostUsd: number
    daily: Array<{ date: string; screenshots: number; urls: number; dinner: number; tts: number }>
  }
  cloudflare: {
    totalVisits: number; totalBytes: number
    daily: Array<{ date: string; visits: number; bytes: number }>
  } | null
  email: { thisMonth: number; recentTotal: number } | null
  insights: string[]
}

const fmtDate = (d: unknown) => {
  if (typeof d !== 'string') return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const fmtBytes = (b: number) => {
  if (b < 1_000) return `${b} B`
  if (b < 1_000_000) return `${(b / 1_000).toFixed(1)} KB`
  if (b < 1_000_000_000) return `${(b / 1_000_000).toFixed(1)} MB`
  return `${(b / 1_000_000_000).toFixed(2)} GB`
}

const CHART_COLORS = {
  primary: '#C4633E',
  secondary: '#9C9189',
  screenshot: '#C4633E',
  url: '#6B8FBF',
  dinner: '#8BAF6B',
  tts: '#B07CC6',
  visits: '#C4633E',
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={`${styles.cardValue} ${accent ? styles.cardValueAccent : ''}`}>{value}</div>
      {sub && <div className={styles.cardSub}>{sub}</div>}
    </div>
  )
}

const tooltipStyle = {
  contentStyle: { background: '#FFFFFF', border: '1px solid #E8E0D4', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 12 },
  labelStyle: { color: '#1F1B16', fontWeight: 600 },
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 403) { setError('Access denied.'); return }
      if (!res.ok) throw new Error()
      setStats(await res.json())
      setRefreshedAt(new Date())
    } catch {
      setError('Failed to load stats. Check the console.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user?.is_admin) navigate('/', { replace: true })
  }, [user, authLoading, navigate])

  useEffect(() => { load() }, [])

  return (
    <div className={styles.page}>
      <Navigation />
      <main className="wide-col">
        <div className={styles.header}>
          <h1 className={styles.title}>Admin</h1>
          <div className={styles.headerRight}>
            {refreshedAt && (
              <span className={styles.refreshed}>
                Updated {refreshedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className={styles.refreshBtn} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {loading && !stats && <div className={styles.loading}>Loading dashboard…</div>}

        {stats && (
          <>
            {/* ── Insights ─────────────────────────────────────────────────── */}
            {stats.insights.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>Insights</div>
                <ul className={styles.insights}>
                  {stats.insights.map((text, i) => (
                    <li key={i} className={styles.insight}>
                      <span className={styles.insightDot} />
                      {text}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Users ────────────────────────────────────────────────────── */}
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Users</div>
              <div className={styles.cards}>
                <StatCard label="Total users" value={stats.users.total.toLocaleString()} />
                <StatCard label="New this week" value={stats.users.newThisWeek} />
                <StatCard label="New this month" value={stats.users.newThisMonth} />
                <StatCard label="Active (7d)" value={stats.users.activeThisWeek} sub="created recipe or rated" />
              </div>
              <div className={styles.charts}>
                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>New users — last 30 days</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.users.daily} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9C9189' }} interval={6} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9C9189' }} />
                      <Tooltip {...tooltipStyle} labelFormatter={fmtDate} formatter={(v: unknown) => [`${v}`, 'New users']} />
                      <Line type="monotone" dataKey="count" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>New recipes — last 30 days</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.recipes.daily} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9C9189' }} interval={6} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9C9189' }} />
                      <Tooltip {...tooltipStyle} labelFormatter={fmtDate} formatter={(v: unknown) => [`${v}`, 'New recipes']} />
                      <Line type="monotone" dataKey="count" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ── Recipes ──────────────────────────────────────────────────── */}
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Recipes</div>
              <div className={styles.cards}>
                <StatCard label="Total recipes" value={stats.recipes.total.toLocaleString()} />
                <StatCard label="Public" value={stats.recipes.public} sub={`${Math.round(stats.recipes.public / Math.max(stats.recipes.total, 1) * 100)}% of total`} />
                <StatCard label="With hero image" value={stats.recipes.withImages} sub={`${Math.round(stats.recipes.withImages / Math.max(stats.recipes.total, 1) * 100)}% of total`} />
                <StatCard label="New this week" value={stats.recipes.newThisWeek} />
              </div>
            </section>

            {/* ── Engagement ───────────────────────────────────────────────── */}
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Engagement</div>
              <div className={styles.cards}>
                <StatCard label="Favourites" value={stats.engagement.totalFavourites.toLocaleString()} />
                <StatCard label="Ratings" value={stats.engagement.totalRatings.toLocaleString()} />
                <StatCard
                  label="Avg rating"
                  value={stats.engagement.avgRating != null ? `${stats.engagement.avgRating} ★` : '—'}
                  accent={stats.engagement.avgRating != null && stats.engagement.avgRating >= 4}
                />
                <StatCard label="Collections" value={stats.engagement.totalCollections} />
              </div>
              <div className={styles.charts}>
                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>Daily ratings — last 30 days</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats.engagement.dailyRatings} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9C9189' }} interval={6} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9C9189' }} />
                      <Tooltip {...tooltipStyle} labelFormatter={fmtDate} formatter={(v: unknown) => [`${v}`, 'Ratings']} />
                      <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>Daily favourites — last 30 days</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats.engagement.dailyFavourites} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9C9189' }} interval={6} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9C9189' }} />
                      <Tooltip {...tooltipStyle} labelFormatter={fmtDate} formatter={(v: unknown) => [`${v}`, 'Favourites']} />
                      <Bar dataKey="count" fill="#6B8FBF" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top recipes by favourites */}
              {stats.engagement.topRecipes.length > 0 && (
                <div className={styles.topRecipes}>
                  <div className={styles.chartTitle}>Most favourited recipes</div>
                  <ol className={styles.topList}>
                    {stats.engagement.topRecipes.map((r, i) => (
                      <li key={r.id} className={styles.topItem}>
                        <span className={styles.topRank}>{i + 1}</span>
                        <Link to={`/recipe/${r.id}`} className={styles.topTitle}>{r.title}</Link>
                        <span className={styles.topMeta}>
                          {r.fave_count} ♥{r.avg_rating != null ? ` · ${r.avg_rating} ★` : ''}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>

            {/* ── Invites ──────────────────────────────────────────────────── */}
            {stats.invites && (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>Invites</div>
                <div className={styles.cards}>
                  <StatCard label="Invites sent" value={stats.invites.total} />
                  <StatCard label="Accepted" value={stats.invites.used} sub="invite → new account" />
                  <StatCard
                    label="Conversion rate"
                    value={`${stats.invites.conversionPct}%`}
                    accent={stats.invites.conversionPct >= 30}
                  />
                  <StatCard label="Sent this week" value={stats.invites.thisWeek} />
                </div>
              </section>
            )}

            {/* ── AI & Cost ────────────────────────────────────────────────── */}
            <section className={styles.section}>
              <div className={styles.sectionTitle}>AI Usage & Cost</div>
              <div className={styles.cards}>
                <StatCard label="Screenshots (mo)" value={stats.ai.thisMonth.screenshot} sub="Anthropic Sonnet · ~$0.015/call" />
                <StatCard label="URL imports (mo)" value={stats.ai.thisMonth.url} sub="Anthropic Haiku · ~$0.004/call" />
                <StatCard label="Dinner suggests (mo)" value={stats.ai.thisMonth.dinner} sub="Anthropic Haiku · ~$0.005/call" />
                <StatCard label="TTS reads (mo)" value={stats.ai.thisMonth.tts} sub="OpenAI tts-1 · ~$0.003/call" />
              </div>
              <div className={styles.cards} style={{ marginTop: 0 }}>
                <StatCard
                  label="Anthropic cost"
                  value={`$${stats.ai.anthropicCostUsd.toFixed(2)}`}
                  sub="this calendar month"
                  accent={stats.ai.anthropicCostUsd > 50}
                />
                <StatCard
                  label="OpenAI cost"
                  value={`$${stats.ai.openaiCostUsd.toFixed(2)}`}
                  sub="this calendar month"
                />
                <StatCard
                  label="Total AI cost"
                  value={`$${stats.ai.totalCostUsd.toFixed(2)}`}
                  sub="this calendar month"
                  accent={stats.ai.totalCostUsd > 60}
                />
              </div>
              <div className={styles.chartBoxFull}>
                <div className={styles.chartTitle}>Daily AI calls — last 30 days</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.ai.daily} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9C9189' }} interval={6} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9C9189' }} />
                    <Tooltip {...tooltipStyle} labelFormatter={fmtDate} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-ui)' }} />
                    <Bar dataKey="screenshots" name="Screenshot" stackId="a" fill={CHART_COLORS.screenshot} />
                    <Bar dataKey="urls" name="URL import" stackId="a" fill={CHART_COLORS.url} />
                    <Bar dataKey="dinner" name="Dinner suggest" stackId="a" fill={CHART_COLORS.dinner} />
                    <Bar dataKey="tts" name="TTS" stackId="a" fill={CHART_COLORS.tts} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ── Cloudflare ───────────────────────────────────────────────── */}
            {stats.cloudflare ? (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>Cloudflare</div>
                <div className={styles.cards}>
                  <StatCard label="Visits (30d)" value={stats.cloudflare.totalVisits.toLocaleString()} />
                  <StatCard label="Bandwidth (30d)" value={fmtBytes(stats.cloudflare.totalBytes)} />
                </div>
                <div className={styles.chartBoxFull}>
                  <div className={styles.chartTitle}>Daily visits — last 30 days</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.cloudflare.daily} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9C9189' }} interval={6} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9C9189' }} />
                      <Tooltip {...tooltipStyle} labelFormatter={fmtDate} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : `${v}`, 'Visits']} />
                      <Line type="monotone" dataKey="visits" stroke={CHART_COLORS.visits} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>Cloudflare</div>
                <div className={styles.card} style={{ maxWidth: 480 }}>
                  <div className={styles.cardLabel}>Not configured</div>
                  <div className={styles.cardSub} style={{ marginTop: 4 }}>
                    Add <code>CF_ZONE_ID</code> and <code>CF_API_TOKEN</code> (Zone Analytics Read permission) to your Cloudflare Pages environment variables to see traffic data here.
                  </div>
                </div>
              </section>
            )}

            {/* ── Email ────────────────────────────────────────────────────── */}
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Email · Resend</div>
              {stats.email ? (
                <div className={styles.cards}>
                  <StatCard label="Sent this month" value={stats.email.thisMonth} />
                  <StatCard label="Recent total" value={stats.email.recentTotal} sub="last 100 emails via API" />
                </div>
              ) : (
                <div className={styles.card} style={{ maxWidth: 480 }}>
                  <div className={styles.cardLabel}>Unavailable</div>
                  <div className={styles.cardSub} style={{ marginTop: 4 }}>
                    Resend API did not return data. Check your RESEND_API_KEY or visit the Resend dashboard for email analytics.
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
