import { useMemo } from "react"

import { useRegistrationWizardStore } from "../store"
import type { WizardStepId } from "../types"

export const WIZARD_STEPS: Array<{ id: WizardStepId; title: string; description: string }> = [
  {
    id: 0,
    title: "Компания",
    description: "Название и виды деятельности",
  },
  {
    id: 1,
    title: "Собственники",
    description: "Доли и документы",
  },
  {
    id: 2,
    title: "Адрес",
    description: "Юридический адрес",
  },
  {
    id: 3,
    title: "Налоги",
    description: "ОСН, УСН или АУСН",
  },
]

export function useWizardNavigation() {
  const currentStep = useRegistrationWizardStore((s) => s.currentStep)
  const completedSteps = useRegistrationWizardStore((s) => s.completedSteps)
  const setStep = useRegistrationWizardStore((s) => s.setStep)
  const markStepCompleted = useRegistrationWizardStore((s) => s.markStepCompleted)
  const progressPercent = useRegistrationWizardStore((s) => s.progressPercent)

  const meta = useMemo(
    () => WIZARD_STEPS.find((step) => step.id === currentStep) ?? WIZARD_STEPS[0],
    [currentStep],
  )

  const goNext = () => {
    markStepCompleted(currentStep)
    if (currentStep < 3) {
      setStep((currentStep + 1) as WizardStepId)
    }
  }

  const goBack = () => {
    if (currentStep > 0) {
      setStep((currentStep - 1) as WizardStepId)
    }
  }

  const canJumpTo = (step: WizardStepId) => {
    if (step === currentStep) return true
    if (step < currentStep) return true
    return completedSteps.includes(step) || completedSteps.includes((step - 1) as WizardStepId)
  }

  return {
    currentStep,
    completedSteps,
    meta,
    steps: WIZARD_STEPS,
    progressPercent: progressPercent(),
    setStep,
    goNext,
    goBack,
    canJumpTo,
    isFirst: currentStep === 0,
    isLast: currentStep === 3,
  }
}
