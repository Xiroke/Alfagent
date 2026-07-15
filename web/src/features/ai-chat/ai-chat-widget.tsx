import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { PaperPlaneTilt } from "@phosphor-icons/react"

import { cn } from "@/shared/lib/utils"

import { streamChat } from "./api"

interface ChatMessage {
  id: string
  role: "assistant" | "user"
  content: string
  pending?: boolean
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Здравствуйте! Я помогу с регистрацией ООО: название, доли учредителей, юридический адрес и выбор налоговой системы. Спросите, например, про УСН или домашний адрес.",
}

function newId(): string {
  return crypto.randomUUID()
}

export function AiChatWidget({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, statusLabel])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const appendToken = (assistantId: string, token: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantId
          ? { ...msg, content: msg.content + token, pending: false }
          : msg,
      ),
    )
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
    }
    const assistantId = newId()
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    }

    setDraft("")
    setSending(true)
    setStatusLabel("Думаю…")
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder])

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let receivedToken = false
    let streamError: string | null = null

    try {
      await streamChat({
        message: text,
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
            appendToken(assistantId, token)
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: msg.content || `Не удалось ответить: ${streamError}`,
                  pending: false,
                }
              : msg,
          ),
        )
      } else if (!receivedToken) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    "Ответ пустой. Проверьте, что backend и OpenRouter доступны.",
                  pending: false,
                }
              : msg,
          ),
        )
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const message =
        err instanceof Error ? err.message : "Не удалось связаться с ассистентом"
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: `Ошибка: ${message}`, pending: false }
            : msg,
        ),
      )
    } finally {
      setSending(false)
      setStatusLabel(null)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, pending: false } : msg,
        ),
      )
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col rounded-2xl bg-white shadow-sm",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-[#0B1F35]">Бизнес-ассистент</h2>
          <span className="relative flex size-2.5" aria-label="Онлайн" title="Онлайн">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
        </div>
        <p className="text-xs font-medium text-[#59606D]">Alfa AI</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
                "max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                message.role === "assistant" &&
                  "rounded-2xl rounded-tl-none bg-[#F3F4F6] text-[#0B1F35]",
                message.role === "user" &&
                  "rounded-2xl rounded-tr-none bg-[#EF3124] text-white",
              )}
            >
              {message.pending && !message.content ? (
                <span className="inline-flex gap-1 text-[#8A919C]">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:150ms]">●</span>
                  <span className="animate-pulse [animation-delay:300ms]">●</span>
                </span>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {statusLabel ? (
          <p className="px-1 text-xs text-[#8A919C]">{statusLabel}</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
        className="shrink-0 border-t border-[#E5E7EB] px-3 py-3"
      >
        <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Спросите про налоги, адрес или доли…"
            disabled={sending}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#0B1F35] outline-none placeholder:text-[#8A919C] disabled:opacity-60"
            aria-label="Сообщение ассистенту"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#EF3124] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Отправить"
          >
            <PaperPlaneTilt className="size-5" weight="fill" />
          </button>
        </div>
      </form>
    </aside>
  )
}
