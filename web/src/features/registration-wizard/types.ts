export type TaxRegime = "osn" | "usn" | "ausn"
export type AddressType = "rental" | "home"
export type WizardStepId = 0 | 1 | 2 | 3

export interface CompanyDraft {
  name: string
  shortName: string
  okvedCodes: string[]
  authorizedCapital: number
}

export interface FounderDraft {
  id: string
  fullName: string
  email: string
  phone: string
  inn: string
  ownershipShare: number
  isDirector: boolean
  passportFileName: string | null
  passportFileSize: number | null
}

export interface AddressDraft {
  addressType: AddressType
  region: string
  city: string
  street: string
  building: string
  apartment: string
  postalCode: string
  fiasId: string | null
  fullAddress: string
  lat: number | null
  lon: number | null
  founderIdForHome: string | null
}

export interface TaxDraft {
  taxRegime: TaxRegime
}

export interface WizardDraft {
  company: CompanyDraft
  founders: FounderDraft[]
  address: AddressDraft
  tax: TaxDraft
}

export interface MapPoint {
  lat: number
  lon: number
  label: string
  providerMeta?: {
    source: "yandex" | "cian" | "manual"
    listingId?: string
  }
}

export interface MapWidgetProps {
  provider?: "yandex" | "cian"
  initialCenter?: { lat: number; lon: number }
  initialZoom?: number
  selectedPoint?: MapPoint | null
  onSelectPoint: (point: MapPoint) => void
  className?: string
}
