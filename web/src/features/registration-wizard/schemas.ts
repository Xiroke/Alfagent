import { z } from "zod"

export const companyStepSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Укажите полное название ООО")
    .max(255, "Слишком длинное название"),
  shortName: z.string().trim().max(128, "Слишком короткое имя").optional().or(z.literal("")),
  okvedCodes: z
    .array(z.string().regex(/^\d{2}(\.\d{1,2}){0,2}$/, "Неверный код ОКВЭД"))
    .min(1, "Добавьте хотя бы один ОКВЭД"),
  authorizedCapital: z
    .number()
    .min(10_000, "Минимальный уставный капитал - 10 000 ₽")
    .max(1_000_000_000, "Слишком большая сумма"),
})

export type CompanyStepValues = z.infer<typeof companyStepSchema>

export const founderItemSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().trim().min(2, "Укажите ФИО").max(255),
  email: z.string().trim().email("Некорректный email"),
  phone: z
    .string()
    .trim()
    .min(10, "Укажите телефон")
    .regex(/^[+\d][\d\s()-]{9,}$/, "Некорректный телефон"),
  inn: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "ИНН физлица - 12 цифр"),
  ownershipShare: z
    .number()
    .gt(0, "Доля должна быть больше 0")
    .lte(100, "Доля не может быть больше 100"),
  isDirector: z.boolean(),
  passportFileName: z.string().nullable(),
  passportFileSize: z.number().nullable(),
})

export const foundersStepSchema = z
  .object({
    founders: z.array(founderItemSchema).min(1, "Добавьте хотя бы одного собственника"),
  })
  .superRefine((data, ctx) => {
    const total = data.founders.reduce((sum, f) => sum + f.ownershipShare, 0)
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Сумма долей должна быть 100%, сейчас ${total}%`,
        path: ["founders"],
      })
    }
    const directors = data.founders.filter((f) => f.isDirector)
    if (directors.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Отметьте ровно одного директора",
        path: ["founders"],
      })
    }
    data.founders.forEach((founder, index) => {
      if (!founder.passportFileName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Загрузите скан паспорта",
          path: ["founders", index, "passportFileName"],
        })
      }
    })
  })

export type FoundersStepValues = z.infer<typeof foundersStepSchema>

export const addressStepSchema = z
  .object({
    addressType: z.enum(["rental", "home"]),
    region: z.string().trim().min(2, "Укажите регион"),
    city: z.string().trim().min(2, "Укажите город"),
    street: z.string().trim().min(1, "Укажите улицу"),
    building: z.string().trim().min(1, "Укажите дом"),
    apartment: z.string().trim().optional().or(z.literal("")),
    postalCode: z.string().trim().regex(/^\d{6}$/, "Индекс - 6 цифр"),
    fiasId: z.string().nullable(),
    fullAddress: z.string().trim().min(10, "Выберите адрес на карте или заполните поля"),
    lat: z.number().nullable(),
    lon: z.number().nullable(),
    founderIdForHome: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.addressType === "home") {
      if (!data.apartment) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для домашнего адреса укажите квартиру",
          path: ["apartment"],
        })
      }
      if (!data.founderIdForHome) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Выберите учредителя, на адресе которого регистрируете ООО",
          path: ["founderIdForHome"],
        })
      }
    }
  })

export type AddressStepValues = z.infer<typeof addressStepSchema>

export const taxStepSchema = z.object({
  taxRegime: z.enum(["osn", "usn", "ausn"], {
    error: "Выберите систему налогообложения",
  }),
})

export type TaxStepValues = z.infer<typeof taxStepSchema>
