import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lr border border-lr-border bg-lr-surface px-3 py-2 text-lr-base text-lr-text font-sans placeholder:text-lr-muted resize-y transition-colors duration-lr-fast",
        "focus-visible:outline-none focus-visible:border-lr-accent focus-visible:ring-1 focus-visible:ring-lr-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-lr-surface-2",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
