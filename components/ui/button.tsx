import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lr font-sans text-lr-sm font-medium transition-all duration-lr-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lr-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-lr-accent to-lr-accent-hover text-white shadow hover:-translate-y-px hover:shadow-lr-glow-accent active:scale-[0.98]",
        secondary:
          "bg-transparent text-lr-text-2 border border-lr-border hover:border-lr-border-2 hover:text-lr-text hover:-translate-y-px active:scale-[0.98]",
        ghost:
          "bg-transparent text-lr-muted hover:bg-lr-surface hover:text-lr-text-2",
        destructive:
          "bg-lr-error-dim text-lr-error border border-lr-error/30 hover:bg-lr-error/20 hover:-translate-y-px active:scale-[0.98]",
        gold:
          "bg-lr-gold-dim text-lr-gold border border-lr-gold/30 hover:bg-lr-gold/20 hover:-translate-y-px active:scale-[0.98]",
        link: "text-lr-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-lr-xs",
        lg: "h-10 px-5 text-lr-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
