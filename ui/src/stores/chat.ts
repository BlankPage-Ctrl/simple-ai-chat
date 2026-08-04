import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UIMessage } from 'ai'
import { deriveKey, encrypt, decrypt } from '../crypto'

export interface AIModel {
  name: string
  modelId: string
  baseURL: string
  hasApiKey: boolean
}

export interface MessagePart {
  type: 'text' | 'reasoning'
  text: string
  state?: 'streaming' | 'done'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  id: string
  content: string
  parts: MessagePart[]
  reasoningText: string
}

let nextId = 1
function genId(): string {
  return `msg_${nextId++}`
}

const BACKEND_URL = 'https://example.com'

const NGROK_HEADERS = { 'ngrok-skip-browser-warning': '1' }

const SYSTEM_PROMPT_STORAGE_KEY = 'simple-chat-system-prompt'

function loadSystemPrompt(): string {
  try {
    return localStorage.getItem(SYSTEM_PROMPT_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function apiUrl(path: string): string {
  return BACKEND_URL ? `${BACKEND_URL}${path}` : path
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const models = ref<AIModel[]>([])
  const selectedModel = ref('')
  const error = ref('')
  const systemPrompt = ref(loadSystemPrompt())

  let abortController: AbortController | null = null

  let cryptoKey: CryptoKey | null = null
  const encryptionEnabled = ref(false)

  function cnv(msg: { role: string; content: string }): ChatMessage {
    return {
      role: msg.role as 'user' | 'assistant',
      id: genId(),
      content: msg.content,
      parts: [{ type: 'text', text: msg.content, state: 'done' }],
      reasoningText: '',
    }
  }
  async function setKey(password: string) {
    cryptoKey = await deriveKey(password)
    encryptionEnabled.value = true
  }

  function clearKey() {
    cryptoKey = null
    encryptionEnabled.value = false
  }

  function setSystemPrompt(text: string) {
    systemPrompt.value = text
    try {
      localStorage.setItem(SYSTEM_PROMPT_STORAGE_KEY, text)
    } catch { /* */ }
  }

  async function loadModels() {
    try {
      const res = await fetch(apiUrl('/api/models'), { headers: NGROK_HEADERS })
      const data = await res.json() as { models: AIModel[] }
      models.value = data.models
      if (data.models.length > 0 && !selectedModel.value) {
        selectedModel.value = data.models[0]!.name
      }
    } catch {
      models.value = []
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch(apiUrl('/api/chat/history'), { headers: NGROK_HEADERS })
      const raw = await res.json() as { messages?: Array<{ role: string; content: string }>; encrypted?: string }

      let data: { messages: Array<{ role: string; content: string }> }
      if (raw.encrypted && cryptoKey) {
        const decrypted = await decrypt(raw.encrypted, cryptoKey)
        data = JSON.parse(decrypted)
      } else {
        data = raw as { messages: Array<{ role: string; content: string }> }
      }

      messages.value = (data.messages || []).map(cnv)
    } catch {
      messages.value = []
    }
  }

  function snap(): ChatMessage {
    return messages.value[messages.value.length - 1]!
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading.value) return

    error.value = ''

    messages.value.push({
      role: 'user',
      id: genId(),
      content: trimmed,
      parts: [{ type: 'text', text: trimmed, state: 'done' }],
      reasoningText: '',
    })

    messages.value.push({
      role: 'assistant',
      id: genId(),
      content: '',
      parts: [],
      reasoningText: '',
    })

    isLoading.value = true
    isStreaming.value = true

    abortController = new AbortController()

    try {
      const payload = JSON.stringify({
        message: trimmed,
        model: selectedModel.value || undefined,
        systemPrompt: systemPrompt.value.trim() || undefined,
      })

      let body: string
      if (cryptoKey) {
        const encrypted = await encrypt(payload, cryptoKey)
        body = JSON.stringify({ encrypted })
      } else {
        body = payload
      }

      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...NGROK_HEADERS },
        body,
        signal: abortController.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      const activeParts = new Map<string, { type: string; text: string }>()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const rawLines = buffer.split('\n')
        buffer = rawLines.pop() || ''

        for (const line of rawLines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let parsed: string
          if (cryptoKey) {
            try {
              parsed = await decrypt(raw, cryptoKey)
            } catch {
              continue
            }
          } else {
            parsed = raw
          }

          if (parsed === '[DONE]') continue

          try {
            const chunk = JSON.parse(parsed)
            const msg = snap()

            switch (chunk.type) {
              case 'reasoning-start': {
                activeParts.set(chunk.id, { type: 'reasoning', text: '' })
                msg.parts.push({
                  type: 'reasoning',
                  text: '',
                  state: 'streaming',
                })
                break
              }
              case 'reasoning-delta': {
                const act = activeParts.get(chunk.id)
                if (act && act.type === 'reasoning') {
                  act.text += chunk.delta || ''
                  msg.reasoningText = act.text
                  const p = msg.parts.find(
                    (p): p is MessagePart => p.type === 'reasoning' && p.state === 'streaming',
                  )
                  if (p) p.text = act.text
                }
                break
              }
              case 'reasoning-end': {
                const act = activeParts.get(chunk.id)
                if (act) {
                  const p = msg.parts.find(
                    (p): p is MessagePart => p.type === 'reasoning' && p.state === 'streaming',
                  )
                  if (p) p.state = 'done'
                  activeParts.delete(chunk.id)
                }
                break
              }
              case 'text-start': {
                activeParts.set(chunk.id, { type: 'text', text: '' })
                msg.parts.push({
                  type: 'text',
                  text: '',
                  state: 'streaming',
                })
                break
              }
              case 'text-delta': {
                const act = activeParts.get(chunk.id)
                if (act && act.type === 'text') {
                  act.text += chunk.delta || ''
                  msg.content = act.text
                  const p = msg.parts.find(
                    (p): p is MessagePart => p.type === 'text' && p.state === 'streaming',
                  )
                  if (p) p.text = act.text
                }
                break
              }
              case 'text-end': {
                const act = activeParts.get(chunk.id)
                if (act) {
                  const p = msg.parts.find(
                    (p): p is MessagePart => p.type === 'text' && p.state === 'streaming',
                  )
                  if (p) p.state = 'done'
                  activeParts.delete(chunk.id)
                }
                break
              }
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      const msg = snap()
      for (const p of msg.parts) {
        const mp = p as MessagePart
        if (mp.state === 'streaming') {
          mp.state = 'done'
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const last = messages.value[messages.value.length - 1]
        if (last?.role === 'assistant' && !last.content && last.parts.length === 0) {
          messages.value.pop()
        }
      } else {
        error.value = err.message || 'Something went wrong'
        const last = messages.value[messages.value.length - 1]
        if (last?.role === 'assistant' && !last.content && last.parts.length === 0) {
          messages.value.pop()
        }
      }
    } finally {
      isLoading.value = false
      isStreaming.value = false
      abortController = null
    }
  }

  async function stopGeneration() {
    if (!isStreaming.value) return
    try {
      await fetch(apiUrl('/api/chat/stop'), { method: 'POST', headers: NGROK_HEADERS })
    } catch {
      //
    }
    abortController?.abort()
  }

  async function clearHistory() {
    try {
      await fetch(apiUrl('/api/chat'), { method: 'DELETE', headers: NGROK_HEADERS })
      messages.value = []
      error.value = ''
    } catch {
      //
    }
  }

  return {
    messages,
    isLoading,
    isStreaming,
    models,
    selectedModel,
    error,
    systemPrompt,
    encryptionEnabled,
    setKey,
    clearKey,
    setSystemPrompt,
    loadModels,
    loadHistory,
    sendMessage,
    stopGeneration,
    clearHistory,
  }
})
