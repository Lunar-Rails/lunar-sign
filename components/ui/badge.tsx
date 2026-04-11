import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-lr-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-lr-accent-dim text-lr-accent",
        success: "bg-lr-success-dim text-lr-success",
        warning: "bg-lr-warning-dim text-lr-warning",
        destructive: "bg-lr-error-dim text-lr-error",
        gold: "bg-lr-gold-dim text-lr-gold",
        cyan: "bg-lr-cyan-dim text-lr-cyan",
        outline: "border border-lr-border text-lr-muted bg-transparent",
        secondary: "bg-lr-surface-2 text-lr-text-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
