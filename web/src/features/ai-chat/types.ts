export type ChatRole = "assistant" | "user"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  pending?: boolean
  createdAt?: number
}

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Здравствуйте! Я помогу с регистрацией ООО: название, доли учредителей, юридический адрес и выбор налоговой системы. Спросите, например, про УСН или домашний адрес.",
  createdAt: 0,
}
