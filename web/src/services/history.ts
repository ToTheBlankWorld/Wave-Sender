export interface ReceivedMessage {
  id: string
  text: string
  receivedAt: number
}

const STORAGE_KEY = 'wave-sender.web.history.v1'
const MAX_MESSAGES = 20

const isMessage = (value: unknown): value is ReceivedMessage => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ReceivedMessage>
  return (
    typeof item.id === 'string' &&
    typeof item.text === 'string' &&
    item.text.length > 0 &&
    typeof item.receivedAt === 'number' &&
    Number.isFinite(item.receivedAt)
  )
}

export const loadHistory = (): ReceivedMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter(isMessage).slice(0, MAX_MESSAGES) : []
  } catch {
    return []
  }
}

export const saveHistory = (history: ReceivedMessage[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_MESSAGES)))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}
