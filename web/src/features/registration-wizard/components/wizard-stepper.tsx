import { Check } from "@phosphor-icons/react"

import { Progress } from "@/shared/components/ui/progress"
import { cn } from "@/shared/lib/utils"

import { useWizardNavigation } from "../hooks/use-wizard-navigation"
import type { WizardStepId } from "../types"

export function WizardStepper() {
  const { steps, currentStep, completedSteps, canJumpTo, setStep, progressPercent, meta } =
    useWizardNavigation()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Шаг {currentStep + 1} из 4
          </p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink md:text-[28px]">
            {meta.title}
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">{meta.description}</p>
        </div>
        <p className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold tabular-nums text-ink-muted">
          {progressPercent}%
        </p>
      </div>

      <Progress value={progressPercent} />

      <ol className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {steps.map((step) => {
          const done = completedSteps.includes(step.id)
          const active = currentStep === step.id
          const jumpable = canJumpTo(step.id)

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!jumpable}
                onClick={() => jumpable && setStep(step.id as WizardStepId)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all duration-200",
                  active && "border-accent bg-accent-soft shadow-sm",
                  !active && done && "border-border bg-surface",
                  !active && !done && "border-border bg-canvas/60 text-ink-muted",
                  !jumpable && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    active && "bg-accent text-white",
                    !active && done && "bg-success-fg text-white",
                    !active && !done && "bg-border text-ink-muted",
                  )}
                >
                  {done && !active ? <Check className="size-3.5" weight="bold" /> : step.id + 1}
                </span>
                <span className="truncate text-xs font-semibold">{step.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
