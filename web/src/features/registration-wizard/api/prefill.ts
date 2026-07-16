import type {
  AddressDraft,
  CompanyDraft,
  FounderDraft,
  TaxDraft,
  TaxRegime,
  AddressType,
} from "../types"

export interface WizardPrefillApiResponse {
  company: {
    name: string
    short_name: string
    okved_codes: string[]
    authorized_capital: number
  }
  founders: Array<{
    full_name: string
    email: string
    phone: string
    inn: string
    ownership_share: number
    is_director: boolean
  }>
  address: {
    address_type: AddressType
    region: string
    city: string
    street: string
    building: string
    apartment: string
    postal_code: string
    full_address: string
    founder_full_name_for_home: string | null
  }
  tax: {
    tax_regime: TaxRegime
  }
  extracted_chars: number
  source_filename: string
  model_notes: string | null
}

const ACCEPT =
  ".txt,.docx,.pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"

export async function prefillFromDocument(file: File): Promise<WizardPrefillApiResponse> {
  const form = new FormData()
  form.append("file", file)

  const response = await fetch("/api/v1/companies/prefill-from-document", {
    method: "POST",
    body: form,
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as {
        detail?: unknown
        error?: { message?: string }
      }
      if (typeof body.detail === "string") detail = body.detail
      else if (body.error?.message) detail = body.error.message
      else if (body.detail != null) detail = JSON.stringify(body.detail)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  return (await response.json()) as WizardPrefillApiResponse
}

export const PREFILL_ACCEPT = ACCEPT

export function mapPrefillToDraft(
  data: WizardPrefillApiResponse,
  createFounder: (partial?: Partial<FounderDraft>) => FounderDraft,
): {
  company: CompanyDraft
  founders: FounderDraft[]
  address: AddressDraft
  tax: TaxDraft
} {
  const founders: FounderDraft[] = data.founders.map((f) =>
    createFounder({
      fullName: f.full_name,
      email: f.email,
      phone: f.phone,
      inn: f.inn,
      ownershipShare: f.ownership_share,
      isDirector: f.is_director,
      passportFileName: null,
      passportFileSize: null,
    }),
  )

  if (founders.length === 0) {
    founders.push(createFounder({ isDirector: true, ownershipShare: 100 }))
  }

  let founderIdForHome: string | null = null
  const homeName = data.address.founder_full_name_for_home?.trim().toLowerCase()
  if (data.address.address_type === "home" && homeName) {
    const match = founders.find((f) => f.fullName.trim().toLowerCase() === homeName)
    founderIdForHome = match?.id ?? founders[0]?.id ?? null
  }

  return {
    company: {
      name: data.company.name,
      shortName: data.company.short_name,
      okvedCodes: data.company.okved_codes,
      authorizedCapital: Math.max(10_000, data.company.authorized_capital || 10_000),
    },
    founders,
    address: {
      addressType: data.address.address_type,
      region: data.address.region,
      city: data.address.city,
      street: data.address.street,
      building: data.address.building,
      apartment: data.address.apartment,
      postalCode: data.address.postal_code,
      fiasId: null,
      fullAddress: data.address.full_address,
      lat: null,
      lon: null,
      founderIdForHome,
    },
    tax: {
      taxRegime: data.tax.tax_regime,
    },
  }
}
