import * as React from "react"

import { cn } from "@/shared/lib/utils"

/**
 * Touch-friendly Alfa form control: tall field, rounded-xl, clear border, soft focus ring.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink shadow-sm placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-200",
          "hover:border-border-strong",
          "focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus",
          "disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-60",
          "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
