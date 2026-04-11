import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lr border border-lr-border bg-lr-surface px-3 py-1 text-lr-base text-lr-text font-sans placeholder:text-lr-muted transition-colors duration-lr-fast",
          "focus-visible:outline-none focus-visible:border-lr-accent focus-visible:ring-1 focus-visible:ring-lr-accent",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-lr-surface-2",
          "file:border-0 file:bg-transparent file:text-lr-sm file:font-medium file:text-lr-text",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
