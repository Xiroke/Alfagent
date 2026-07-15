import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle } from "@phosphor-icons/react"
import { useState } from "react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { FormField } from "@/shared/components/ui/form-field"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { cn } from "@/shared/lib/utils"

import { useWizardNavigation } from "../hooks/use-wizard-navigation"
import { taxStepSchema, type TaxStepValues } from "../schemas"
import { useRegistrationWizardStore } from "../store"
import type { TaxRegime } from "../types"

const TAX_OPTIONS: Array<{
  value: TaxRegime
  title: string
  summary: string
  points: string[]
}> = [
  {
    value: "usn",
    title: "УСН",
    summary: "Упрощённая система для малого бизнеса",
    points: ["Объект «доходы» или «доходы минус расходы»", "Меньше отчётности, чем на ОСН", "Лимиты по выручке и сотрудникам"],
  },
  {
    value: "ausn",
    title: "АУСН",
    summary: "Автоматизированный режим с банком и ФНС",
    points: ["Расчёт налогов на стороне ФНС", "Подходит микробизнесу", "Ограничения по видам деятельности"],
  },
  {
    value: "osn",
    title: "ОСН",
    summary: "Общий режим: прибыль, НДС, имущество",
    points: ["Работа с крупными контрагентами-плательщиками НДС", "Полный бухучёт", "Нет лимитов спецрежимов"],
  },
]

export function TaxStep() {
  const tax = useRegistrationWizardStore((s) => s.draft.tax)
  const draft = useRegistrationWizardStore((s) => s.draft)
  const setTax = useRegistrationWizardStore((s) => s.setTax)
  const markStepCompleted = useRegistrationWizardStore((s) => s.markStepCompleted)
  const resetWizard = useRegistrationWizardStore((s) => s.resetWizard)
  const { goBack } = useWizardNavigation()
  const [submitted, setSubmitted] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TaxStepValues>({
    resolver: zodResolver(taxStepSchema),
    defaultValues: tax,
  })

  const onSubmit = handleSubmit((values) => {
    setTax(values)
    markStepCompleted(3)
    setSubmitted(true)
    // Payload ready for POST /api/v1/companies/registrations
    console.info("[registration-wizard] draft ready", { ...draft, tax: values })
  })

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card md:p-10">
        <CheckCircle className="mx-auto size-10 text-accent" weight="duotone" />
        <h3 className="mt-4 text-xl font-bold tracking-tight text-ink">Заявка собрана</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Данные сохранены локально. Следующий шаг - отправка на бэкенд
          <span className="font-mono"> POST /api/v1/companies/registrations</span>.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Badge variant="soft">{draft.company.name || "Без названия"}</Badge>
          <Badge variant="soft">{draft.founders.length} учредителей</Badge>
          <Badge variant="soft">{draft.tax.taxRegime.toUpperCase()}</Badge>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Button type="button" variant="secondary" onClick={() => setSubmitted(false)}>
            Изменить налоги
          </Button>
          <Button type="button" onClick={resetWizard}>
            Новая заявка
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormField label="Система налогообложения" error={errors.taxRegime?.message}>
        <Controller
          control={control}
          name="taxRegime"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="grid gap-3"
            >
              {TAX_OPTIONS.map((option) => {
                const active = field.value === option.value
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors md:p-5",
                      active && "border-accent bg-accent-soft/50 ring-4 ring-accent/10",
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold tracking-tight text-ink">{option.title}</p>
                        {option.value === "usn" ? <Badge variant="soft">Рекомендуем</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{option.summary}</p>
                      <ul className="mt-3 space-y-1">
                        {option.points.map((point) => (
                          <li key={point} className="text-xs text-ink-muted">
                            - {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          )}
        />
      </FormField>

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack}>
          Назад
        </Button>
        <Button type="submit">Завершить мастер</Button>
      </div>
    </form>
  )
}
