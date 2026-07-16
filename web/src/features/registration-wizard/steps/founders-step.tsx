import { useRef } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash, UploadSimple, User } from "@phosphor-icons/react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { FormField } from "@/shared/components/ui/form-field"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/lib/utils"

import { useOwnershipShares } from "../hooks/use-ownership-shares"
import { useWizardNavigation } from "../hooks/use-wizard-navigation"
import { foundersStepSchema, type FoundersStepValues } from "../schemas"
import { useRegistrationWizardStore } from "../store"

export function FoundersStep() {
  const founders = useRegistrationWizardStore((s) => s.draft.founders)
  const setFounders = useRegistrationWizardStore((s) => s.setFounders)
  const { goNext, goBack } = useWizardNavigation()
  const { total, remaining, isValid } = useOwnershipShares()
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FoundersStepValues>({
    resolver: zodResolver(foundersStepSchema),
    defaultValues: { founders },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "founders",
  })

  const watched = watch("founders")
  const liveTotal = watched?.reduce((sum, f) => sum + (Number(f.ownershipShare) || 0), 0) ?? 0

  const onSubmit = handleSubmit((values) => {
    setFounders(values.founders)
    goNext()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-canvas px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold text-ink">Распределение долей</p>
          <p className="text-xs text-ink-muted">Сумма должна равняться 100%</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={Math.abs(liveTotal - 100) < 0.01 ? "soft" : "warn"}>
            Итого: {liveTotal}%
          </Badge>
          <Badge variant="soft">Остаток: {Math.round((100 - liveTotal) * 100) / 100}%</Badge>
        </div>
      </div>

      {typeof errors.founders?.message === "string" ? (
        <p className="text-sm text-danger-fg">{errors.founders.message}</p>
      ) : null}
      {!isValid && remaining !== 0 ? (
        <p className="text-xs text-ink-muted">
          В сторе сейчас {total}% (обновится после сохранения шага)
        </p>
      ) : null}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const passportError = errors.founders?.[index]?.passportFileName?.message
          const passportName = watched?.[index]?.passportFileName

          return (
            <div
              key={field.id}
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm md:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-fg">
                    <User className="size-4" weight="duotone" />
                  </span>
                  <p className="text-sm font-bold">Собственник {index + 1}</p>
                </div>
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash className="size-4" />
                    Удалить
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="ФИО"
                  htmlFor={`founders.${index}.fullName`}
                  error={errors.founders?.[index]?.fullName?.message}
                >
                  <Input
                    id={`founders.${index}.fullName`}
                    placeholder="Ирина Соколова"
                    {...register(`founders.${index}.fullName`)}
                  />
                </FormField>

                <FormField
                  label="Email"
                  htmlFor={`founders.${index}.email`}
                  error={errors.founders?.[index]?.email?.message}
                >
                  <Input
                    id={`founders.${index}.email`}
                    type="email"
                    placeholder="irina@example.com"
                    {...register(`founders.${index}.email`)}
                  />
                </FormField>

                <FormField
                  label="Телефон"
                  htmlFor={`founders.${index}.phone`}
                  error={errors.founders?.[index]?.phone?.message}
                >
                  <Input
                    id={`founders.${index}.phone`}
                    placeholder="+7 999 123-45-67"
                    {...register(`founders.${index}.phone`)}
                  />
                </FormField>

                <FormField
                  label="ИНН"
                  htmlFor={`founders.${index}.inn`}
                  error={errors.founders?.[index]?.inn?.message}
                >
                  <Input
                    id={`founders.${index}.inn`}
                    placeholder="770708389312"
                    {...register(`founders.${index}.inn`)}
                  />
                </FormField>

                <FormField
                  label="Доля, %"
                  htmlFor={`founders.${index}.ownershipShare`}
                  error={errors.founders?.[index]?.ownershipShare?.message}
                >
                  <Input
                    id={`founders.${index}.ownershipShare`}
                    type="number"
                    step="0.01"
                    min={0.01}
                    max={100}
                    {...register(`founders.${index}.ownershipShare`, { valueAsNumber: true })}
                  />
                </FormField>

                <FormField label="Роль">
                  <Controller
                    control={control}
                    name={`founders.${index}.isDirector`}
                    render={({ field: directorField }) => (
                      <label
                        className={cn(
                          "flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 text-sm font-medium",
                          directorField.value && "border-accent bg-accent-soft",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={directorField.value}
                          onChange={(e) => {
                            const checked = e.target.checked
                            if (checked) {
                              watched.forEach((_, i) => {
                                setValue(`founders.${i}.isDirector`, i === index)
                              })
                            } else {
                              directorField.onChange(false)
                            }
                          }}
                          className="size-4 accent-[var(--color-accent)]"
                        />
                        Генеральный директор
                      </label>
                    )}
                  />
                </FormField>
              </div>

              <FormField
                className="mt-4"
                label="Скан паспорта"
                error={passportError}
                hint="PDF или изображение, до 10 МБ"
              >
                <div
                  className={cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-canvas px-4 py-3.5 transition-colors",
                    passportName && "border-solid border-accent/40 bg-accent-soft/50",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <UploadSimple className="size-4 text-accent" />
                    <span>
                      {passportName ?? "Загрузить файл"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">
                      {watched?.[index]?.passportFileSize
                        ? `${Math.round((watched[index]!.passportFileSize! / 1024) * 10) / 10} КБ`
                        : "Файл не выбран"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.current[field.id]?.click()}
                    >
                      Выбрать
                    </Button>
                  </div>
                </div>
                <input
                  ref={(node) => {
                    fileInputRefs.current[field.id] = node
                  }}
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setValue(`founders.${index}.passportFileName`, file.name, {
                      shouldValidate: true,
                    })
                    setValue(`founders.${index}.passportFileSize`, file.size, {
                      shouldValidate: true,
                    })
                    // Allow re-selecting the same file on the next click.
                    e.currentTarget.value = ""
                  }}
                />
                {/* Ensure these fields are registered so RHF/watch updates immediately after setValue(). */}
                <input type="hidden" {...register(`founders.${index}.id`)} />
                <input
                  type="hidden"
                  {...register(`founders.${index}.passportFileName` as const)}
                />
                <input
                  type="hidden"
                  {...register(`founders.${index}.passportFileSize` as const, { valueAsNumber: true })}
                />
              </FormField>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            fullName: "",
            email: "",
            phone: "",
            inn: "",
            ownershipShare: Math.max(0, Math.round((100 - liveTotal) * 100) / 100),
            isDirector: false,
            passportFileName: null,
            passportFileSize: null,
          })
        }
      >
        <Plus className="size-4" />
        Добавить собственника
      </Button>

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack}>
          Назад
        </Button>
        <Button type="submit">Далее: адрес</Button>
      </div>
    </form>
  )
}
