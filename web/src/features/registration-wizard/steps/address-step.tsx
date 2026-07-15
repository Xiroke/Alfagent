import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { House, Buildings } from "@phosphor-icons/react"

import { MapWidgetStub } from "@/features/map-widget"
import { Button } from "@/shared/components/ui/button"
import { FormField } from "@/shared/components/ui/form-field"
import { Input } from "@/shared/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { cn } from "@/shared/lib/utils"

import { useWizardNavigation } from "../hooks/use-wizard-navigation"
import { addressStepSchema, type AddressStepValues } from "../schemas"
import { useRegistrationWizardStore } from "../store"
import type { MapPoint } from "../types"

function parseAddressLabel(label: string): Partial<AddressStepValues> {
  // Expected demo format: "Москва, ул. Тверская, 7"
  const parts = label.split(",").map((p) => p.trim())
  const city = parts[0] ?? ""
  const street = parts[1] ?? ""
  const building = parts[2] ?? ""
  return {
    region: "г. Москва",
    city,
    street,
    building,
    postalCode: "101000",
    fullAddress: label,
  }
}

export function AddressStep() {
  const address = useRegistrationWizardStore((s) => s.draft.address)
  const founders = useRegistrationWizardStore((s) => s.draft.founders)
  const setAddress = useRegistrationWizardStore((s) => s.setAddress)
  const { goNext, goBack } = useWizardNavigation()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressStepValues>({
    resolver: zodResolver(addressStepSchema),
    defaultValues: address,
  })

  const addressType = watch("addressType")
  const lat = watch("lat")
  const lon = watch("lon")
  const fullAddress = watch("fullAddress")

  const selectedPoint: MapPoint | null =
    lat !== null && lon !== null && fullAddress
      ? { lat, lon, label: fullAddress }
      : null

  const onSelectPoint = (point: MapPoint) => {
    const parsed = parseAddressLabel(point.label)
    setValue("lat", point.lat, { shouldValidate: true })
    setValue("lon", point.lon, { shouldValidate: true })
    setValue("fullAddress", point.label, { shouldValidate: true })
    setValue("fiasId", point.providerMeta?.listingId ?? null)
    if (parsed.region) setValue("region", parsed.region, { shouldValidate: true })
    if (parsed.city) setValue("city", parsed.city, { shouldValidate: true })
    if (parsed.street) setValue("street", parsed.street, { shouldValidate: true })
    if (parsed.building) setValue("building", parsed.building, { shouldValidate: true })
    if (parsed.postalCode) setValue("postalCode", parsed.postalCode, { shouldValidate: true })
  }

  const onSubmit = handleSubmit((values) => {
    setAddress({
      ...values,
      apartment: values.apartment ?? "",
    })
    goNext()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormField label="Тип юридического адреса" error={errors.addressType?.message}>
        <Controller
          control={control}
          name="addressType"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="grid gap-3 md:grid-cols-2"
            >
              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors",
                  field.value === "rental" && "border-accent bg-accent-soft/60 shadow-sm",
                )}
              >
                <RadioGroupItem value="rental" className="mt-1" />
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                    <Buildings className="size-4 text-accent" weight="duotone" />
                    Аренда офиса
                  </div>
                  <p className="text-xs leading-relaxed text-ink-muted">
                    Выберите помещение на карте. Удобно для банковской проверки.
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors",
                  field.value === "home" && "border-accent bg-accent-soft/60 shadow-sm",
                )}
              >
                <RadioGroupItem value="home" className="mt-1" />
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                    <House className="size-4 text-accent" weight="duotone" />
                    Адрес учредителя
                  </div>
                  <p className="text-xs leading-relaxed text-ink-muted">
                    Регистрация по месту жительства одного из собственников.
                  </p>
                </div>
              </label>
            </RadioGroup>
          )}
        />
      </FormField>

      {addressType === "rental" ? (
        <MapWidgetStub
          provider="yandex"
          selectedPoint={selectedPoint}
          onSelectPoint={onSelectPoint}
        />
      ) : (
        <FormField
          label="Учредитель для домашнего адреса"
          error={errors.founderIdForHome?.message}
        >
          <Controller
            control={control}
            name="founderIdForHome"
            render={({ field }) => (
              <select
                className="flex h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] shadow-sm focus-visible:border-accent focus-visible:shadow-focus focus-visible:outline-none"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <option value="">Выберите учредителя</option>
                {founders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fullName || "Без имени"} ({f.email || "email не указан"})
                  </option>
                ))}
              </select>
            )}
          />
        </FormField>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Регион" htmlFor="region" error={errors.region?.message}>
          <Input id="region" {...register("region")} />
        </FormField>
        <FormField label="Город" htmlFor="city" error={errors.city?.message}>
          <Input id="city" {...register("city")} />
        </FormField>
        <FormField label="Улица" htmlFor="street" error={errors.street?.message}>
          <Input id="street" {...register("street")} />
        </FormField>
        <FormField label="Дом" htmlFor="building" error={errors.building?.message}>
          <Input id="building" {...register("building")} />
        </FormField>
        <FormField
          label="Квартира / офис"
          htmlFor="apartment"
          error={errors.apartment?.message}
        >
          <Input id="apartment" {...register("apartment")} />
        </FormField>
        <FormField label="Индекс" htmlFor="postalCode" error={errors.postalCode?.message}>
          <Input id="postalCode" {...register("postalCode")} />
        </FormField>
      </div>

      <FormField label="Полный адрес" htmlFor="fullAddress" error={errors.fullAddress?.message}>
        <Input id="fullAddress" {...register("fullAddress")} />
      </FormField>

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack}>
          Назад
        </Button>
        <Button type="submit">Далее: налоги</Button>
      </div>
    </form>
  )
}
