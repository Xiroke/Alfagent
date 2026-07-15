import { useMemo } from "react"

import { useRegistrationWizardStore } from "../store"

export function useOwnershipShares() {
  const founders = useRegistrationWizardStore((s) => s.draft.founders)

  return useMemo(() => {
    const total = founders.reduce((sum, f) => sum + (Number(f.ownershipShare) || 0), 0)
    const remaining = Math.round((100 - total) * 100) / 100
    const isValid = Math.abs(total - 100) < 0.01
    return { total, remaining, isValid, founderCount: founders.length }
  }, [founders])
}
