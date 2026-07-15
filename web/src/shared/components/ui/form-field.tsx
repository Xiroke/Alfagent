import * as React from "react"

import { cn } from "@/shared/lib/utils"

function FormField({
  className,
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  className?: string
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-danger-fg">{error}</p> : null}
    </div>
  )
}

export { FormField }
