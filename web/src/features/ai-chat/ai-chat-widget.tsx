import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { PaperPlaneTilt, Trash } from "@phosphor-icons/react"

import { cn } from "@/shared/lib/utils"

import { streamChat } from "./api"
import {
  clearChatHistory,
  historyForApi,
  loadChatHistory,
  saveChatHistory,
} from "./history"
import { MarkdownMessage } from "./markdown-message"
import { WELCOME_MESSAGE, type ChatMessage } from "./types"

function newId(): string {
  return crypto.randomUUID()
}

export function AiChatWidget({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory())
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    saveChatHistory(messages)
  }, [messages])

  // Scroll only inside the chat panel — never the document.
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

  const appendToken = (assistantId: string, token: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantId
          ? { ...msg, content: msg.content + token, pending: false }
          : msg,
      ),
    )
  }

  const handleClear = () => {
    if (sending) return
    abortRef.current?.abort()
    setMessages(clearChatHistory())
    setStatusLabel(null)
    setDraft("")
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    const priorHistory = historyForApi(messages)

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    }
    const assistantId = newId()
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
      createdAt: Date.now(),
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
        history: priorHistory,
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
                    "Ответ пустой. Проверьте, что backend и API_KEY (Cloud.ru) доступны.",
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

  const canClear =
    !sending &&
    messages.some((msg) => msg.id !== WELCOME_MESSAGE.id || messages.length > 1)

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={!canClear}
            className="flex size-8 items-center justify-center rounded-lg text-[#8A919C] transition-colors hover:bg-[#F3F4F6] hover:text-[#0B1F35] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Очистить историю"
            title="Очистить историю"
          >
            <Trash className="size-4" />
          </button>
          <p className="text-xs font-medium text-[#59606D]">Alfa AI</p>
        </div>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
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
                "max-w-[85%] px-4 py-3",
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
                <MarkdownMessage
                  content={message.content}
                  variant={message.role}
                />
              )}
            </div>
          </div>
        ))}
        {statusLabel ? (
          <p className="px-1 text-xs text-[#8A919C]">{statusLabel}</p>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
        className="shrink-0 border-t border-[#E5E7EB] px-3 py-3"
      >
        <div className="flex items-center gap-2 rounded-xl border border-transparent bg-[#F3F4F6] px-3 py-2 transition-[border-color,background-color] focus-within:border-[#D1D5DB] focus-within:bg-white">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Спросите про налоги, адрес или доли…"
            disabled={sending}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#0B1F35] outline-none ring-0 shadow-none placeholder:text-[#8A919C] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:shadow-none focus-visible:ring-0 disabled:opacity-60"
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
