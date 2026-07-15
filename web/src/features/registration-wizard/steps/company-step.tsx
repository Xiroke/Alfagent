import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X } from "@phosphor-icons/react"

import { Button } from "@/shared/components/ui/button"
import { FormField } from "@/shared/components/ui/form-field"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"

import { companyStepSchema, type CompanyStepValues } from "../schemas"
import { useRegistrationWizardStore } from "../store"
import { useWizardNavigation } from "../hooks/use-wizard-navigation"

export function CompanyStep() {
  const company = useRegistrationWizardStore((s) => s.draft.company)
  const setCompany = useRegistrationWizardStore((s) => s.setCompany)
  const { goNext } = useWizardNavigation()
  const [okvedInput, setOkvedInput] = useState("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyStepValues>({
    resolver: zodResolver(companyStepSchema),
    defaultValues: {
      name: company.name,
      shortName: company.shortName,
      okvedCodes: company.okvedCodes,
      authorizedCapital: company.authorizedCapital,
    },
  })

  const okvedCodes = watch("okvedCodes")

  const addOkved = () => {
    const code = okvedInput.trim()
    if (!code || okvedCodes.includes(code)) return
    setValue("okvedCodes", [...okvedCodes, code], { shouldValidate: true })
    setOkvedInput("")
  }

  const removeOkved = (code: string) => {
    setValue(
      "okvedCodes",
      okvedCodes.filter((item) => item !== code),
      { shouldValidate: true },
    )
  }

  const onSubmit = handleSubmit((values) => {
    setCompany({
      name: values.name,
      shortName: values.shortName ?? "",
      okvedCodes: values.okvedCodes,
      authorizedCapital: values.authorizedCapital,
    })
    goNext()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormField label="Полное наименование" htmlFor="name" error={errors.name?.message}>
        <Input id="name" placeholder="Общество с ограниченной ответственностью «Северная дуга»" {...register("name")} />
      </FormField>

      <FormField
        label="Краткое наименование"
        htmlFor="shortName"
        hint="Необязательно"
        error={errors.shortName?.message}
      >
        <Input id="shortName" placeholder="ООО «Северная дуга»" {...register("shortName")} />
      </FormField>

      <FormField
        label="Виды деятельности (ОКВЭД)"
        error={errors.okvedCodes?.message}
        hint="Например: 62.01, 63.11"
      >
        <div className="flex gap-2">
          <Input
            value={okvedInput}
            onChange={(e) => setOkvedInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addOkved()
              }
            }}
            placeholder="Код ОКВЭД"
          />
          <Button type="button" variant="secondary" onClick={addOkved}>
            <Plus className="size-4" />
            Добавить
          </Button>
        </div>
        {okvedCodes.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {okvedCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => removeOkved(code)}
                className="inline-flex items-center gap-1"
              >
                <Badge variant="soft">{code}</Badge>
                <X className="size-3.5 text-ink-muted" />
              </button>
            ))}
          </div>
        ) : null}
      </FormField>

      <FormField
        label="Уставный капитал, ₽"
        htmlFor="authorizedCapital"
        error={errors.authorizedCapital?.message}
      >
          <Input
            id="authorizedCapital"
            type="number"
            min={10_000}
            step={1000}
            {...register("authorizedCapital", { valueAsNumber: true })}
          />
      </FormField>

      <div className="flex justify-end pt-2">
        <Button type="submit">Далее: собственники</Button>
      </div>
    </form>
  )
}
