/** Client for POST /api/v1/ai/chat/stream (SSE). */

export type ChatStreamHandlers = {
  onRouting?: (data: {
    agent: string
    confidence: number
    rationale: string
    source: string
  }) => void
  onRag?: (data: { chunk_count: number; sources: unknown[] }) => void
  onAgentStart?: (data: { agent: string }) => void
  onToken: (content: string) => void
  onError?: (message: string, code?: string) => void
  onDone?: (data: { agent: string }) => void
}

export type StreamChatOptions = {
  message: string
  history?: Array<{ role: "user" | "assistant" | "system"; content: string }>
  companyProfile?: string
  signal?: AbortSignal
  handlers: ChatStreamHandlers
}

/**
 * Streams SSE events from the multi-agent orchestrator.
 * Event names: routing | rag | agent_start | token | error | done
 */
export async function streamChat({
  message,
  history,
  companyProfile,
  signal,
  handlers,
}: StreamChatOptions): Promise<void> {
  const response = await fetch("/api/v1/ai/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      history: history ?? [],
      company_profile: companyProfile ?? null,
    }),
    signal,
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    if (response.status === 502) {
      detail =
        "Сервер недоступен (502). Запустите backend: uvicorn app.main:app --reload"
    } else {
      try {
        const body = (await response.json()) as {
          detail?: unknown
          error?: { message?: string }
        }
        if (typeof body.detail === "string") detail = body.detail
        else if (body.detail != null) detail = JSON.stringify(body.detail)
        else if (body.error?.message) detail = body.error.message
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail)
  }

  if (!response.body) {
    throw new Error("Пустой ответ сервера (нет потока)")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""

    for (const part of parts) {
      dispatchSseBlock(part, handlers)
    }
  }

  if (buffer.trim()) {
    dispatchSseBlock(buffer, handlers)
  }
}

function dispatchSseBlock(block: string, handlers: ChatStreamHandlers): void {
  const lines = block.split("\n").filter((line) => line.length > 0)
  if (lines.length === 0) return

  let eventName = "message"
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) return

  let data: Record<string, unknown>
  try {
    data = JSON.parse(dataLines.join("\n")) as Record<string, unknown>
  } catch {
    return
  }

  switch (eventName) {
    case "routing":
      handlers.onRouting?.(
        data as {
          agent: string
          confidence: number
          rationale: string
          source: string
        },
      )
      break
    case "rag":
      handlers.onRag?.(data as { chunk_count: number; sources: unknown[] })
      break
    case "agent_start":
      handlers.onAgentStart?.(data as { agent: string })
      break
    case "token": {
      const content = data.content
      if (typeof content === "string" && content.length > 0) {
        handlers.onToken(content)
      }
      break
    }
    case "error": {
      const message =
        typeof data.message === "string" ? data.message : "Ошибка ассистента"
      const code = typeof data.code === "string" ? data.code : undefined
      handlers.onError?.(message, code)
      break
    }
    case "done":
      handlers.onDone?.(data as { agent: string })
      break
    default:
      break
  }
}
