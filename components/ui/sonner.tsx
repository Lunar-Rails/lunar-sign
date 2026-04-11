"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-lr-bg border border-lr-border rounded-lr-lg shadow-lr-dropdown text-lr-text text-lr-sm font-sans",
          description: "text-lr-muted text-lr-xs",
          actionButton: "bg-lr-accent text-white rounded-lr text-lr-xs px-3 py-1",
          cancelButton: "bg-lr-surface text-lr-muted rounded-lr text-lr-xs px-3 py-1",
          success: "border-l-4 border-l-lr-success",
          error: "border-l-4 border-l-lr-error",
          warning: "border-l-4 border-l-lr-warning",
          info: "border-l-4 border-l-lr-accent",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
