import type {
  AddressDraft,
  AddressType,
  CompanyDraft,
  FounderDraft,
  TaxDraft,
  TaxRegime,
  WizardDraft,
} from "@/features/registration-wizard/types"

export type InterviewField =
  | "companyName"
  | "shortName"
  | "okved"
  | "capital"
  | "founderCount"
  | "founderFullName"
  | "founderEmail"
  | "founderPhone"
  | "founderInn"
  | "founderShare"
  | "founderIsDirector"
  | "addressType"
  | "addressRegion"
  | "addressCity"
  | "addressStreet"
  | "addressBuilding"
  | "addressApartment"
  | "addressPostal"
  | "taxRegime"

export type InterviewPhase = "interview" | "summary"

export interface InterviewMessage {
  id: string
  role: "assistant" | "user"
  content: string
  createdAt: number
  /** Free-form AI Q&A (prefix «альфа»), not registration interview answers */
  kind?: "interview" | "ai"
}

export interface InterviewState {
  phase: InterviewPhase
  field: InterviewField
  founderIndex: number
  founderCount: number
  company: CompanyDraft
  founders: FounderDraft[]
  address: AddressDraft
  tax: TaxDraft
  messages: InterviewMessage[]
}

/** If message starts with «альфа», returns the question text (may be empty). */
export function extractAlphaQuestion(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed.toLowerCase().startsWith("альфа")) return null
  return trimmed.slice("альфа".length).replace(/^[\s.,:;!\-—–]+/u, "").trim()
}

export function createFounder(partial?: Partial<FounderDraft>): FounderDraft {
  return {
    id: crypto.randomUUID(),
    fullName: "",
    email: "",
    phone: "",
    inn: "",
    ownershipShare: 100,
    isDirector: true,
    passportFileName: null,
    passportFileSize: null,
    ...partial,
  }
}

export function emptyDraft(): WizardDraft {
  return {
    company: {
      name: "",
      shortName: "",
      okvedCodes: [],
      authorizedCapital: 10_000,
    },
    founders: [createFounder()],
    address: {
      addressType: "rental",
      region: "",
      city: "",
      street: "",
      building: "",
      apartment: "",
      postalCode: "",
      fiasId: null,
      fullAddress: "",
      lat: null,
      lon: null,
      founderIdForHome: null,
    },
    tax: { taxRegime: "usn" },
  }
}

export function welcomeMessages(): InterviewMessage[] {
  const now = Date.now()
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Здравствуйте! Зарегистрируем ООО в диалоге — я буду задавать вопросы, а вы отвечайте сообщениями.\n\n" +
        "Можно сразу загрузить документ (TXT, DOCX, PDF, XLSX) с данными компании — я заполню черновик и покажу итог.\n\n" +
        "**Спросить нейросеть** (без заполнения данных): начните сообщение со слова **альфа**, например: `альфа чем УСН отличается от ОСН?`\n\n" +
        "Или начнём с вопроса: **как называется ваше ООО?** (полное наименование)",
      createdAt: now,
      kind: "interview",
    },
  ]
}

export function questionFor(
  field: InterviewField,
  founderIndex: number,
  founderCount: number,
): string {
  switch (field) {
    case "companyName":
      return "Как называется ваше ООО? Укажите полное наименование."
    case "shortName":
      return "Какое краткое наименование? Можно написать «пропустить»."
    case "okved":
      return "Какие коды ОКВЭД? Перечислите через запятую, например: `62.01, 63.11`."
    case "capital":
      return "Какой уставный капитал в рублях? Минимум 10 000."
    case "founderCount":
      return "Сколько учредителей (собственников) будет у ООО? Число от 1."
    case "founderFullName":
      return `Учредитель ${founderIndex + 1} из ${founderCount}: укажите ФИО.`
    case "founderEmail":
      return `Учредитель ${founderIndex + 1}: email.`
    case "founderPhone":
      return `Учредитель ${founderIndex + 1}: телефон.`
    case "founderInn":
      return `Учредитель ${founderIndex + 1}: ИНН (12 цифр).`
    case "founderShare":
      return `Учредитель ${founderIndex + 1}: доля в процентах (сумма долей всех должна быть 100).`
    case "founderIsDirector":
      return `Учредитель ${founderIndex + 1} — генеральный директор? Ответьте «да» или «нет».`
    case "addressType":
      return "Юридический адрес: **аренда** офиса или **домашний** адрес учредителя?"
    case "addressRegion":
      return "Регион юридического адреса?"
    case "addressCity":
      return "Город?"
    case "addressStreet":
      return "Улица?"
    case "addressBuilding":
      return "Номер дома?"
    case "addressApartment":
      return "Квартира / офис? Можно «пропустить», если аренда без помещения."
    case "addressPostal":
      return "Почтовый индекс (6 цифр)?"
    case "taxRegime":
      return "Какую систему налогообложения выбрать: **ОСН**, **УСН** или **АУСН**?"
  }
}

function isSkip(text: string): boolean {
  const t = text.trim().toLowerCase()
  return ["пропустить", "skip", "-", "нет", "не нужно", "пусто"].includes(t)
}

function parseYesNo(text: string): boolean | null {
  const t = text.trim().toLowerCase()
  if (["да", "yes", "y", "true", "1", "директор"].includes(t)) return true
  if (["нет", "no", "n", "false", "0"].includes(t)) return false
  return null
}

function parseTax(text: string): TaxRegime | null {
  const t = text.trim().toLowerCase()
  if (t.includes("аусн") || t.includes("ausn") || t.includes("автомат")) return "ausn"
  if (t.includes("усн") || t.includes("usn") || t.includes("упрощ")) return "usn"
  if (t.includes("осн") || t.includes("osn") || t.includes("общ")) return "osn"
  return null
}

function parseAddressType(text: string): AddressType | null {
  const t = text.trim().toLowerCase()
  if (t.includes("дом") || t.includes("home") || t.includes("прописк")) return "home"
  if (t.includes("арен") || t.includes("офис") || t.includes("rental")) return "rental"
  return null
}

function parseOkved(text: string): string[] {
  return text
    .split(/[,;\s]+/)
    .map((c) => c.trim())
    .filter((c) => /^\d{2}(\.\d{1,2}){0,2}$/.test(c))
}

function composeAddress(address: AddressDraft): string {
  const parts = [
    address.postalCode,
    address.region,
    address.city,
    address.street,
    address.building ? `д. ${address.building}` : "",
    address.apartment ? `кв. ${address.apartment}` : "",
  ]
  return parts.filter(Boolean).join(", ")
}

export type ApplyResult =
  | { ok: true; next: InterviewState; assistantReply: string }
  | { ok: false; error: string }

export function applyAnswer(state: InterviewState, raw: string): ApplyResult {
  const text = raw.trim()
  if (!text) return { ok: false, error: "Напишите ответ сообщением." }

  const next: InterviewState = {
    ...state,
    company: { ...state.company },
    founders: state.founders.map((f) => ({ ...f })),
    address: { ...state.address },
    tax: { ...state.tax },
  }

  const ask = (field: InterviewField, founderIndex = next.founderIndex) => {
    next.field = field
    next.founderIndex = founderIndex
    return questionFor(field, founderIndex, next.founderCount)
  }

  switch (state.field) {
    case "companyName": {
      if (text.length < 3) return { ok: false, error: "Название слишком короткое (минимум 3 символа)." }
      next.company.name = text
      return { ok: true, next, assistantReply: ask("shortName") }
    }
    case "shortName": {
      next.company.shortName = isSkip(text) ? "" : text
      return { ok: true, next, assistantReply: ask("okved") }
    }
    case "okved": {
      const codes = parseOkved(text)
      if (codes.length === 0) {
        return { ok: false, error: "Не вижу кодов ОКВЭД. Пример: 62.01, 63.11" }
      }
      next.company.okvedCodes = codes
      return { ok: true, next, assistantReply: ask("capital") }
    }
    case "capital": {
      const num = Number(text.replace(/\s/g, "").replace(",", "."))
      if (!Number.isFinite(num) || num < 10_000) {
        return { ok: false, error: "Укажите число не меньше 10 000." }
      }
      next.company.authorizedCapital = num
      return { ok: true, next, assistantReply: ask("founderCount") }
    }
    case "founderCount": {
      const count = Number.parseInt(text, 10)
      if (!Number.isFinite(count) || count < 1 || count > 20) {
        return { ok: false, error: "Укажите целое число учредителей от 1 до 20." }
      }
      next.founderCount = count
      next.founderIndex = 0
      next.founders = Array.from({ length: count }, (_, i) =>
        createFounder({
          ownershipShare: i === 0 ? 100 : 0,
          isDirector: i === 0,
        }),
      )
      return { ok: true, next, assistantReply: ask("founderFullName", 0) }
    }
    case "founderFullName": {
      if (text.length < 2) return { ok: false, error: "Укажите ФИО." }
      next.founders[state.founderIndex] = {
        ...next.founders[state.founderIndex]!,
        fullName: text,
      }
      return { ok: true, next, assistantReply: ask("founderEmail") }
    }
    case "founderEmail": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { ok: false, error: "Некорректный email." }
      }
      next.founders[state.founderIndex] = {
        ...next.founders[state.founderIndex]!,
        email: text,
      }
      return { ok: true, next, assistantReply: ask("founderPhone") }
    }
    case "founderPhone": {
      if (text.replace(/\D/g, "").length < 10) {
        return { ok: false, error: "Укажите телефон (не меньше 10 цифр)." }
      }
      next.founders[state.founderIndex] = {
        ...next.founders[state.founderIndex]!,
        phone: text,
      }
      return { ok: true, next, assistantReply: ask("founderInn") }
    }
    case "founderInn": {
      const inn = text.replace(/\D/g, "")
      if (inn.length !== 12) return { ok: false, error: "ИНН физлица — 12 цифр." }
      next.founders[state.founderIndex] = {
        ...next.founders[state.founderIndex]!,
        inn,
      }
      return { ok: true, next, assistantReply: ask("founderShare") }
    }
    case "founderShare": {
      const share = Number(text.replace(",", "."))
      if (!Number.isFinite(share) || share <= 0 || share > 100) {
        return { ok: false, error: "Доля должна быть числом от 0.01 до 100." }
      }
      next.founders[state.founderIndex] = {
        ...next.founders[state.founderIndex]!,
        ownershipShare: share,
      }
      if (next.founderCount === 1) {
        next.founders[0] = { ...next.founders[0]!, isDirector: true, ownershipShare: 100 }
        return { ok: true, next, assistantReply: ask("addressType") }
      }
      return { ok: true, next, assistantReply: ask("founderIsDirector") }
    }
    case "founderIsDirector": {
      const yn = parseYesNo(text)
      if (yn === null) return { ok: false, error: "Ответьте «да» или «нет»." }
      next.founders = next.founders.map((f, i) => ({
        ...f,
        isDirector: yn ? i === state.founderIndex : false,
      }))
      if (!yn && !next.founders.some((f) => f.isDirector) && state.founderIndex === next.founderCount - 1) {
        next.founders[0] = { ...next.founders[0]!, isDirector: true }
      }
      if (state.founderIndex + 1 < next.founderCount) {
        return {
          ok: true,
          next,
          assistantReply: ask("founderFullName", state.founderIndex + 1),
        }
      }
      const total = next.founders.reduce((s, f) => s + f.ownershipShare, 0)
      if (!next.founders.some((f) => f.isDirector)) {
        next.founders[0] = { ...next.founders[0]!, isDirector: true }
      }
      const shareNote =
        Math.abs(total - 100) > 0.01
          ? ` Сейчас сумма долей ${total}% (нужно 100%) — поправьте на сводке или начните заново.`
          : ""
      return {
        ok: true,
        next,
        assistantReply: ask("addressType") + shareNote,
      }
    }
    case "addressType": {
      const t = parseAddressType(text)
      if (!t) return { ok: false, error: "Напишите «аренда» или «домашний»." }
      next.address.addressType = t
      if (t === "home") {
        next.address.founderIdForHome = next.founders[0]?.id ?? null
      }
      return { ok: true, next, assistantReply: ask("addressRegion") }
    }
    case "addressRegion": {
      if (text.length < 2) return { ok: false, error: "Укажите регион." }
      next.address.region = text
      return { ok: true, next, assistantReply: ask("addressCity") }
    }
    case "addressCity": {
      if (text.length < 2) return { ok: false, error: "Укажите город." }
      next.address.city = text
      return { ok: true, next, assistantReply: ask("addressStreet") }
    }
    case "addressStreet": {
      if (!text) return { ok: false, error: "Укажите улицу." }
      next.address.street = text
      return { ok: true, next, assistantReply: ask("addressBuilding") }
    }
    case "addressBuilding": {
      if (!text) return { ok: false, error: "Укажите дом." }
      next.address.building = text
      return { ok: true, next, assistantReply: ask("addressApartment") }
    }
    case "addressApartment": {
      next.address.apartment = isSkip(text) ? "" : text
      if (next.address.addressType === "home" && !next.address.apartment) {
        return { ok: false, error: "Для домашнего адреса укажите квартиру." }
      }
      return { ok: true, next, assistantReply: ask("addressPostal") }
    }
    case "addressPostal": {
      const postal = text.replace(/\D/g, "")
      if (postal.length !== 6) return { ok: false, error: "Индекс — 6 цифр." }
      next.address.postalCode = postal
      next.address.fullAddress = composeAddress(next.address)
      return { ok: true, next, assistantReply: ask("taxRegime") }
    }
    case "taxRegime": {
      const regime = parseTax(text)
      if (!regime) return { ok: false, error: "Выберите ОСН, УСН или АУСН." }
      next.tax.taxRegime = regime
      next.phase = "summary"
      return {
        ok: true,
        next,
        assistantReply:
          "Отлично, все данные собраны. Ниже — сводка заявки. Проверьте и при необходимости начните заново или загрузите документ для перезаполнения.",
      }
    }
  }
}

export function draftFromState(state: InterviewState): WizardDraft {
  return {
    company: state.company,
    founders: state.founders,
    address: state.address,
    tax: state.tax,
  }
}

export function initialInterviewState(): InterviewState {
  const draft = emptyDraft()
  return {
    phase: "interview",
    field: "companyName",
    founderIndex: 0,
    founderCount: 1,
    company: draft.company,
    founders: draft.founders,
    address: draft.address,
    tax: draft.tax,
    messages: welcomeMessages(),
  }
}
