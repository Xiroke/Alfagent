import * as React from "react"

import { cn } from "@/shared/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[112px] w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink shadow-sm placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-200",
          "hover:border-border-strong",
          "focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus",
          "disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-60",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
