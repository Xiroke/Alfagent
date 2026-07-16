import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { PaperPlaneTilt, ListChecks, Trash } from "@phosphor-icons/react"

import { streamChat } from "@/features/ai-chat/api"
import { MarkdownMessage } from "@/features/ai-chat/markdown-message"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import { ChatDocumentUpload } from "./document-upload"
import { extractAlphaQuestion } from "./flow"
import { useRegistrationChatStore } from "./store"

export function RegistrationInterviewChat({ className }: { className?: string }) {
  const messages = useRegistrationChatStore((s) => s.messages)
  const sendAnswer = useRegistrationChatStore((s) => s.sendAnswer)
  const beginAiReply = useRegistrationChatStore((s) => s.beginAiReply)
  const appendAiToken = useRegistrationChatStore((s) => s.appendAiToken)
  const finishAiReply = useRegistrationChatStore((s) => s.finishAiReply)
  const reset = useRegistrationChatStore((s) => s.reset)
  const openSummary = useRegistrationChatStore((s) => s.openSummary)
  const phase = useRegistrationChatStore((s) => s.phase)
  const aiBusy = useRegistrationChatStore((s) => s.aiBusy)

  const [draft, setDraft] = useState("")
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, statusLabel])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (phase !== "interview") return null

  const askNeural = async (rawText: string, question: string) => {
    if (aiBusy) return

    if (!question) {
      const { assistantId } = beginAiReply(rawText)
      finishAiReply(
        assistantId,
        "Напишите вопрос после слова «альфа», например: `альфа чем УСН отличается от ОСН?`",
      )
      return
    }

    const priorAiHistory = messages
      .filter((m) => m.kind === "ai" && m.content.trim())
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content:
          m.role === "user"
            ? (extractAlphaQuestion(m.content) ?? m.content)
            : m.content,
      }))

    const { assistantId } = beginAiReply(rawText)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let receivedToken = false
    let streamError: string | null = null
    setStatusLabel("Думаю…")

    try {
      await streamChat({
        message: question,
        history: priorAiHistory,
        signal: controller.signal,
        handlers: {
          onRouting: (data) => {
            setStatusLabel(`Маршрутизация → ${data.agent}`)
          },
          onRag: (data) => {
            setStatusLabel(
              data.chunk_count > 0
                ? `База знаний: ${data.chunk_count} фрагм.`
                : "База знаний: без совпадений",
            )
          },
          onAgentStart: () => {
            setStatusLabel("Отвечаю…")
          },
          onToken: (token) => {
            receivedToken = true
            setStatusLabel(null)
            appendAiToken(assistantId, token)
          },
          onError: (message) => {
            streamError = message
          },
          onDone: () => {
            setStatusLabel(null)
          },
        },
      })

      if (streamError) {
        finishAiReply(assistantId, `Не удалось ответить: ${streamError}`)
      } else if (!receivedToken) {
        finishAiReply(
          assistantId,
          "Ответ пустой. Проверьте, что backend и API_KEY (Cloud.ru) доступны.",
        )
      } else {
        finishAiReply(assistantId)
      }
    } catch (err) {
      if (controller.signal.aborted) {
        finishAiReply(assistantId, "Запрос отменён.")
        return
      }
      const message =
        err instanceof Error ? err.message : "Не удалось связаться с ассистентом"
      finishAiReply(assistantId, `Ошибка: ${message}`)
    } finally {
      setStatusLabel(null)
    }
  }

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || aiBusy) return
    setDraft("")

    const alphaQuestion = extractAlphaQuestion(text)
    if (alphaQuestion !== null) {
      void askNeural(text, alphaQuestion)
      return
    }

    sendAnswer(text)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm",
        className,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0B1F35]">Регистрация в диалоге</h2>
          <p className="mt-0.5 text-xs text-[#59606D]">
            Отвечайте на вопросы или загрузите документ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openSummary}
            title="Посмотреть черновик"
            disabled={aiBusy}
          >
            <ListChecks className="size-4" />
            Черновик
          </Button>
          <ChatDocumentUpload />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              abortRef.current?.abort()
              reset()
            }}
            aria-label="Начать заново"
            title="Начать заново"
          >
            <Trash className="size-4" />
          </Button>
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 md:p-6"
        style={{ overflowAnchor: "none" }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[90%] px-4 py-3 md:max-w-[75%]",
                message.role === "assistant" &&
                  "rounded-2xl rounded-tl-none bg-[#F3F4F6] text-[#0B1F35]",
                message.role === "user" &&
                  "rounded-2xl rounded-tr-none bg-[#EF3124] text-white",
                message.kind === "ai" &&
                  message.role === "assistant" &&
                  "ring-1 ring-[#EF3124]/15",
              )}
            >
              {message.kind === "ai" && message.role === "assistant" ? (
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EF3124]">
                  Alfa AI
                </p>
              ) : null}
              {message.kind === "ai" &&
              message.role === "assistant" &&
              !message.content &&
              aiBusy ? (
                <span className="inline-flex gap-1 text-[#8A919C]">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:150ms]">●</span>
                  <span className="animate-pulse [animation-delay:300ms]">●</span>
                </span>
              ) : (
                <MarkdownMessage content={message.content} variant={message.role} />
              )}
            </div>
          </div>
        ))}
        {statusLabel ? (
          <p className="px-1 text-xs text-[#8A919C]">{statusLabel}</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[#E5E7EB] px-3 pt-2 md:px-4">
        <p className="mb-2 rounded-lg bg-[#F3F4F6] px-3 py-2 text-xs leading-relaxed text-[#59606D]">
          Вопрос нейросети без заполнения данных — начните сообщение со слова{" "}
          <span className="font-semibold text-[#0B1F35]">альфа</span>, например:{" "}
          <span className="font-medium text-[#0B1F35]">альфа чем УСН отличается от ОСН?</span>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 px-3 pb-3 md:px-4"
      >
        <div className="flex items-center gap-2 rounded-xl border border-transparent bg-[#F3F4F6] px-3 py-2 transition-[border-color,background-color] focus-within:border-[#D1D5DB] focus-within:bg-white">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={aiBusy ? "Ждём ответ ассистента…" : "Ответ или «альфа …» вопрос"}
            disabled={aiBusy}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#0B1F35] outline-none ring-0 shadow-none placeholder:text-[#8A919C] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:shadow-none focus-visible:ring-0 disabled:opacity-60"
            aria-label="Ответ на вопрос"
          />
          <button
            type="submit"
            disabled={!draft.trim() || aiBusy}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#EF3124] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Отправить"
          >
            <PaperPlaneTilt className="size-5" weight="fill" />
          </button>
        </div>
      </form>
    </div>
  )
}
