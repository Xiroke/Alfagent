import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

/**
 * Alfa-Bank CTA language:
 * - primary = Alfa Red (#EF3124)
 * - secondary = white surface with ink border
 * - large touch targets (min h-12)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white shadow-sm hover:bg-accent-hover",
        secondary:
          "border border-border bg-surface text-ink shadow-sm hover:bg-canvas",
        outline:
          "border border-border-strong bg-transparent text-ink hover:bg-surface",
        ghost: "text-ink-muted hover:bg-surface hover:text-ink",
        accent: "bg-accent text-white shadow-sm hover:bg-accent-hover",
        destructive: "bg-danger-fg text-white hover:bg-accent-hover",
      },
      size: {
        default: "h-12 min-h-12 px-5 py-2.5",
        sm: "h-10 rounded-xl px-4 text-xs",
        lg: "h-14 rounded-2xl px-7 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
