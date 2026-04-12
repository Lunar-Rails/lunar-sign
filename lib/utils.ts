import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge<'lr-typography'>({
  extend: {
    classGroups: {
      'font-size': [
        'text-lr-xs',
        'text-lr-sm',
        'text-lr-base',
        'text-lr-lg',
        'text-lr-xl',
        'text-lr-2xl',
        'text-lr-3xl',
      ],
      'lr-typography': [
        'text-kicker',
        'text-page-title',
        'text-hero-title',
        'text-card-title',
        'text-section-label',
        'text-item-label',
        'text-body',
        'text-caption',
        'text-micro',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
