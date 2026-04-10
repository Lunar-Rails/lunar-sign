import Link from 'next/link'
import clsx from 'clsx'

interface LunarSignWordmarkProps {
  href?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function LunarSignWordmark({
  href = '/',
  className,
  size = 'md',
}: LunarSignWordmarkProps) {
  const textSize = size === 'sm' ? 'text-lg' : 'text-[1.35rem]'
  const subText = size === 'sm' ? 'text-[0.62rem]' : 'text-[0.68rem]'

  return (
    <Link
      href={href}
      className={clsx('inline-flex flex-col leading-none', className)}
    >
      <span className={clsx('font-display font-semibold tracking-[0.16em] uppercase', textSize)}>
        <span className="text-[var(--lr-text)]">Lunar</span>{' '}
        <span className="text-[var(--lr-accent-soft)]">Sign</span>
      </span>
      <span className={clsx('font-display mt-1 uppercase tracking-[0.22em] text-[var(--lr-text-muted)]', subText)}>
        Secure signing relay
      </span>
    </Link>
  )
}
