import { ArrowCounterClockwise } from "@phosphor-icons/react"

import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"

import { WizardStepper } from "./components/wizard-stepper"
import { DocumentPrefillUpload } from "./components/document-prefill-upload"
import { useWizardNavigation } from "./hooks/use-wizard-navigation"
import { AddressStep } from "./steps/address-step"
import { CompanyStep } from "./steps/company-step"
import { FoundersStep } from "./steps/founders-step"
import { TaxStep } from "./steps/tax-step"
import { useRegistrationWizardStore } from "./store"

function StepContent({ revision }: { revision: number }) {
  const { currentStep } = useWizardNavigation()

  switch (currentStep) {
    case 0:
      return <CompanyStep key={`company-${revision}`} />
    case 1:
      return <FoundersStep key={`founders-${revision}`} />
    case 2:
      return <AddressStep key={`address-${revision}`} />
    case 3:
      return <TaxStep key={`tax-${revision}`} />
    default:
      return <CompanyStep key={`company-${revision}`} />
  }
}

/** Form content only — page layout owns the white scrollable card. */
export function RegistrationWizard() {
  const resetWizard = useRegistrationWizardStore((s) => s.resetWizard)
  const companyName = useRegistrationWizardStore((s) => s.draft.company.name)
  const draftRevision = useRegistrationWizardStore((s) => s.draftRevision)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#EF3124]">
            Альфа-Банк для бизнеса
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0B1F35] md:text-4xl">
            Регистрация ООО
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#59606D]">
            Откройте компанию с несколькими собственниками: адрес, налоговый режим
            и банковские сервисы в одном мастере. Прогресс сохраняется автоматически.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={resetWizard}>
          <ArrowCounterClockwise className="size-4" />
          Сбросить
        </Button>
      </div>

      {companyName ? (
        <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-3 text-sm text-[#59606D]">
          Черновик:{" "}
          <span className="font-semibold text-[#0B1F35]">{companyName}</span>
        </div>
      ) : null}

      <DocumentPrefillUpload className="mb-6" />

      <WizardStepper />
      <Separator className="my-7" />
      <StepContent revision={draftRevision} />
    </div>
  )
}
