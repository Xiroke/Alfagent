import type { WizardDraft } from "../types"

function draftToProtocolPayload(draft: WizardDraft) {
  return {
    company: {
      name: draft.company.name,
      short_name: draft.company.shortName,
      okved_codes: draft.company.okvedCodes,
      authorized_capital: draft.company.authorizedCapital,
    },
    founders: draft.founders.map((f) => ({
      full_name: f.fullName,
      email: f.email,
      phone: f.phone,
      inn: f.inn,
      ownership_share: f.ownershipShare,
      is_director: f.isDirector,
    })),
    address: {
      address_type: draft.address.addressType,
      region: draft.address.region,
      city: draft.address.city,
      street: draft.address.street,
      building: draft.address.building,
      apartment: draft.address.apartment,
      postal_code: draft.address.postalCode,
      full_address: draft.address.fullAddress,
      founder_full_name_for_home: null,
    },
    tax: {
      tax_regime: draft.tax.taxRegime,
    },
  }
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim())
    } catch {
      return utf[1].trim()
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1]?.trim() ?? null
}

/** Generate founders meeting protocol and trigger browser download. */
export async function downloadProtocolFromDraft(draft: WizardDraft): Promise<void> {
  const response = await fetch("/api/v1/companies/generate-protocol", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draftToProtocolPayload(draft)),
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

  const blob = await response.blob()
  const name =
    filenameFromDisposition(response.headers.get("Content-Disposition")) ??
    "protokol_uchreditelej.docx"

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
