import { WELCOME_MESSAGE, type ChatMessage } from "./types"

const STORAGE_KEY = "alfagent.chat.history.v1"
const MAX_STORED = 80

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === "string" &&
    (row.role === "user" || row.role === "assistant") &&
    typeof row.content === "string"
  )
}

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [WELCOME_MESSAGE]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [WELCOME_MESSAGE]
    const messages = parsed.filter(isChatMessage).map((msg) => ({
      ...msg,
      pending: false,
    }))
    if (messages.length === 0) return [WELCOME_MESSAGE]
    return messages
  } catch {
    return [WELCOME_MESSAGE]
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    const toStore = messages
      .filter((msg) => !msg.pending && msg.content.trim().length > 0)
      .slice(-MAX_STORED)
      .map(({ id, role, content, createdAt }) => ({
        id,
        role,
        content,
        createdAt: createdAt ?? Date.now(),
      }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // Quota / private mode — ignore
  }
}

export function clearChatHistory(): ChatMessage[] {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return [WELCOME_MESSAGE]
}

/** Last N completed turns for the API (exclude welcome-only / empty / pending). */
export function historyForApi(
  messages: ChatMessage[],
  limit = 12,
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter(
      (msg) =>
        !msg.pending &&
        msg.id !== "welcome" &&
        msg.content.trim().length > 0,
    )
    .slice(-limit)
    .map(({ role, content }) => ({ role, content }))
}
