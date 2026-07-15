import * as React from "react"

import { cn } from "@/shared/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "soft" | "warn" | "danger" | "neutral"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
        variant === "default" && "bg-accent text-white",
        variant === "soft" && "bg-accent-soft text-accent-fg",
        variant === "neutral" && "bg-canvas text-ink-muted",
        variant === "warn" && "bg-warn-soft text-warn-fg",
        variant === "danger" && "bg-danger-soft text-danger-fg",
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
