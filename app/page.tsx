import Link from 'next/link'
import {
  ArrowRight,
  FileSignature,
  Orbit,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import LunarSignWordmark from '@/components/LunarSignWordmark'

const featureCards = [
  {
    icon: FileSignature,
    label: 'Signature flows',
    title: 'Upload, route, and track contracts without leaving the portal.',
  },
  {
    icon: ShieldCheck,
    label: 'Audit trail',
    title: 'Every signer event lands in a clear compliance timeline.',
  },
  {
    icon: Orbit,
    label: 'Company views',
    title: 'Segment document operations across teams while keeping one shell.',
  },
]

const stats = [
  { value: '10px / 14px', label: 'Compact control geometry' },
  { value: 'Violet glass', label: 'Primary shell material' },
  { value: 'Space + Inter', label: 'Brand typography pairing' },
]

export default function Home() {
  return (
    <main className="lr-shell min-h-screen">
      <header className="lr-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <LunarSignWordmark />
          <div className="hidden items-center gap-3 sm:flex">
            <span className="lr-chip">Dark neon-glass shell</span>
            <Link href="/login" className="lr-button lr-button-secondary">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-14 pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,440px)] lg:items-start">
        <div>
          <span className="lr-pill mb-5 inline-flex bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]">
            <Sparkles className="h-3.5 w-3.5" />
            Lunar Rails design system applied
          </span>
          <h1 className="font-display max-w-3xl text-[clamp(2.7rem,6vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-white">
            Secure document signing, rebuilt as a Lunar Rails control room.
          </h1>
          <p className="mt-6 max-w-2xl text-[1rem] leading-7 text-[var(--lr-text-soft)]">
            Lunar Sign now opens with a public-facing brand surface, then drops
            authenticated users into a compact violet-glass workspace built for
            drafts, pending signatures, and audit-heavy detail views.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="lr-button lr-button-primary">
              Enter the signing portal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="lr-button lr-button-ghost">
              Existing session? Open dashboard
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="lr-grid-card p-5">
                <div className="font-display text-lg font-semibold text-white">
                  {stat.value}
                </div>
                <p className="mt-2 text-sm text-[var(--lr-text-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lr-panel px-6 py-6 sm:px-7 sm:py-7">
          <p className="lr-label">Mission control</p>
          <h2 className="font-display mt-3 text-2xl font-semibold text-white">
            Same product, sharper brand.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--lr-text-soft)]">
            The shell now follows the Lunar Rails playbook: dark starfield
            backdrop, violet focus states, gold reserved for reward moments, and
            compact controls that feel closer to a live build hub than a generic
            admin console.
          </p>

          <div className="mt-6 space-y-3">
            {featureCards.map(({ icon: Icon, label, title }) => (
              <div key={label} className="lr-grid-card flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(193,178,255,0.16)] bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="lr-label text-[0.6rem]">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--lr-text-soft)]">
                    {title}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[14px] border border-[rgba(244,197,106,0.22)] bg-[rgba(244,197,106,0.08)] p-4">
            <p className="lr-label text-[rgba(255,219,160,0.82)]">Reward lane</p>
            <p className="mt-2 text-sm leading-6 text-[var(--lr-text-soft)]">
              Gold stays reserved for high-value actions and completion moments,
              keeping the core navigation and editing system unmistakably violet.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map(({ icon: Icon, label, title }) => (
            <article key={`${label}-detail`} className="lr-grid-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(193,178,255,0.16)] bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="lr-label">{label}</span>
              </div>
              <p className="mt-4 text-base leading-7 text-[var(--lr-text-soft)]">
                {title}
              </p>
            </article>
          ))}
        </div>

        <footer className="mt-12 pb-8">
          <div className="lr-footer">
            <span>Lunar Sign · dark glass signing portal</span>
            <div className="flex flex-wrap gap-4">
              <Link href="/login">Sign in</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
          </div>
        </footer>
      </section>
    </main>
  )
}
