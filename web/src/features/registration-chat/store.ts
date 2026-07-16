import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { WizardDraft } from "@/features/registration-wizard/types"

import {
  applyAnswer,
  createFounder,
  initialInterviewState,
  type InterviewMessage,
  type InterviewState,
} from "./flow"

const STORAGE_KEY = "alfagent.registration-chat.v1"

interface RegistrationChatState extends InterviewState {
  error: string | null
  /** true when user opened summary mid-interview (not finished) */
  summaryPreview: boolean
  aiBusy: boolean
  reset: () => void
  sendAnswer: (text: string) => void
  /** Append user + empty assistant bubble for streaming AI reply */
  beginAiReply: (userText: string) => { assistantId: string }
  appendAiToken: (assistantId: string, token: string) => void
  finishAiReply: (assistantId: string, fallback?: string) => void
  applyDocumentDraft: (draft: WizardDraft, note?: string) => void
  openSummary: () => void
  backToInterview: () => void
}

export const useRegistrationChatStore = create<RegistrationChatState>()(
  persist(
    (set, get) => ({
      ...initialInterviewState(),
      error: null,
      summaryPreview: false,
      aiBusy: false,

      reset: () =>
        set({
          ...initialInterviewState(),
          error: null,
          summaryPreview: false,
          aiBusy: false,
        }),

      sendAnswer: (text) => {
        const state = get()
        if (state.phase !== "interview" || state.aiBusy) return

        const userMsg: InterviewMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: text.trim(),
          createdAt: Date.now(),
          kind: "interview",
        }

        const result = applyAnswer(state, text)
        if (!result.ok) {
          set({
            messages: [
              ...state.messages,
              userMsg,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: result.error,
                createdAt: Date.now(),
                kind: "interview",
              },
            ],
            error: result.error,
          })
          return
        }

        const assistantMsg: InterviewMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.assistantReply,
          createdAt: Date.now(),
          kind: "interview",
        }

        set({
          ...result.next,
          messages: [...state.messages, userMsg, assistantMsg],
          error: null,
          summaryPreview: false,
        })
      },

      beginAiReply: (userText) => {
        const assistantId = crypto.randomUUID()
        const userMsg: InterviewMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: userText.trim(),
          createdAt: Date.now(),
          kind: "ai",
        }
        const assistantMsg: InterviewMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          kind: "ai",
        }
        set({
          messages: [...get().messages, userMsg, assistantMsg],
          aiBusy: true,
          error: null,
        })
        return { assistantId }
      },

      appendAiToken: (assistantId, token) => {
        set({
          messages: get().messages.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + token }
              : msg,
          ),
        })
      },

      finishAiReply: (assistantId, fallback) => {
        set({
          aiBusy: false,
          messages: get().messages.map((msg) => {
            if (msg.id !== assistantId) return msg
            const content = msg.content.trim() || fallback || "Не удалось получить ответ."
            return { ...msg, content }
          }),
        })
      },

      applyDocumentDraft: (draft, note) => {
        const founders =
          draft.founders.length > 0
            ? draft.founders
            : [createFounder({ isDirector: true, ownershipShare: 100 })]

        const summaryMsg: InterviewMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            note ??
            "Данные из документа подставлены. Проверьте сводку ниже — при необходимости можно начать диалог заново.",
          createdAt: Date.now(),
        }

        set({
          phase: "summary",
          field: "taxRegime",
          founderIndex: 0,
          founderCount: founders.length,
          company: draft.company,
          founders,
          address: draft.address,
          tax: draft.tax,
          messages: [...get().messages, summaryMsg],
          error: null,
          summaryPreview: false,
        })
      },

      openSummary: () => {
        set({ phase: "summary", summaryPreview: true, error: null })
      },

      backToInterview: () => {
        const state = get()
        // Resume the same interview progress (do not wipe answers/messages).
        set({
          phase: "interview",
          summaryPreview: false,
          error: null,
          // Keep field / founders / messages as-is
          company: state.company,
          founders: state.founders,
          address: state.address,
          tax: state.tax,
          field: state.field,
          founderIndex: state.founderIndex,
          founderCount: state.founderCount,
          messages: state.messages,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        phase: state.phase,
        field: state.field,
        founderIndex: state.founderIndex,
        founderCount: state.founderCount,
        company: state.company,
        founders: state.founders,
        address: state.address,
        tax: state.tax,
        messages: state.messages,
        summaryPreview: state.summaryPreview,
      }),
    },
  ),
)

export function useRegistrationDraft(): WizardDraft {
  return useRegistrationChatStore((s) => ({
    company: s.company,
    founders: s.founders,
    address: s.address,
    tax: s.tax,
  }))
}
