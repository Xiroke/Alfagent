import { create } from "zustand"
import { persist } from "zustand/middleware"

import type {
  AddressDraft,
  CompanyDraft,
  FounderDraft,
  TaxDraft,
  WizardDraft,
  WizardStepId,
} from "./types"

const STORAGE_KEY = "alfagent.registration-wizard.v1"

function createFounder(partial?: Partial<FounderDraft>): FounderDraft {
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

export const defaultCompany: CompanyDraft = {
  name: "",
  shortName: "",
  okvedCodes: [],
  authorizedCapital: 10_000,
}

export const defaultAddress: AddressDraft = {
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
}

export const defaultTax: TaxDraft = {
  taxRegime: "usn",
}

export interface RegistrationWizardState {
  currentStep: WizardStepId
  completedSteps: WizardStepId[]
  draft: WizardDraft
  draftRevision: number
  setStep: (step: WizardStepId) => void
  markStepCompleted: (step: WizardStepId) => void
  setCompany: (company: CompanyDraft) => void
  setFounders: (founders: FounderDraft[]) => void
  addFounder: () => void
  removeFounder: (id: string) => void
  updateFounder: (id: string, patch: Partial<FounderDraft>) => void
  setAddress: (address: AddressDraft) => void
  setTax: (tax: TaxDraft) => void
  applyPrefill: (draft: WizardDraft) => void
  resetWizard: () => void
  progressPercent: () => number
}

const initialDraft: WizardDraft = {
  company: defaultCompany,
  founders: [createFounder()],
  address: defaultAddress,
  tax: defaultTax,
}

export const useRegistrationWizardStore = create<RegistrationWizardState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      completedSteps: [],
      draft: initialDraft,
      draftRevision: 0,

      setStep: (step) => set({ currentStep: step }),

      markStepCompleted: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step].sort(),
        })),

      setCompany: (company) =>
        set((state) => ({
          draft: { ...state.draft, company },
        })),

      setFounders: (founders) =>
        set((state) => ({
          draft: { ...state.draft, founders },
        })),

      addFounder: () =>
        set((state) => {
          const founders = [
            ...state.draft.founders.map((f) => ({ ...f, isDirector: false })),
            createFounder({
              ownershipShare: 0,
              isDirector: false,
            }),
          ]
          return { draft: { ...state.draft, founders } }
        }),

      removeFounder: (id) =>
        set((state) => {
          if (state.draft.founders.length <= 1) return state
          const founders = state.draft.founders.filter((f) => f.id !== id)
          if (!founders.some((f) => f.isDirector) && founders[0]) {
            founders[0] = { ...founders[0], isDirector: true }
          }
          return { draft: { ...state.draft, founders } }
        }),

      updateFounder: (id, patch) =>
        set((state) => {
          let founders = state.draft.founders.map((f) =>
            f.id === id ? { ...f, ...patch } : f,
          )
          if (patch.isDirector === true) {
            founders = founders.map((f) => ({
              ...f,
              isDirector: f.id === id,
            }))
          }
          return { draft: { ...state.draft, founders } }
        }),

      setAddress: (address) =>
        set((state) => ({
          draft: { ...state.draft, address },
        })),

      setTax: (tax) =>
        set((state) => ({
          draft: { ...state.draft, tax },
        })),

      applyPrefill: (draft) =>
        set((state) => ({
          currentStep: 0,
          completedSteps: [],
          draft,
          draftRevision: state.draftRevision + 1,
        })),

      resetWizard: () =>
        set({
          currentStep: 0,
          completedSteps: [],
          draft: {
            company: defaultCompany,
            founders: [createFounder()],
            address: defaultAddress,
            tax: defaultTax,
          },
          draftRevision: 0,
        }),

      progressPercent: () => {
        const { completedSteps, currentStep } = get()
        const unique = new Set([...completedSteps, currentStep])
        return Math.round((unique.size / 4) * 100)
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        draft: state.draft,
      }),
    },
  ),
)
