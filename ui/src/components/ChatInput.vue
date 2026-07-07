<script setup lang="ts">
import { ref } from 'vue'
import { Square, Send } from 'lucide-vue-next'

const props = defineProps<{
  isLoading: boolean
  isStreaming: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function handleSend() {
  const text = input.value.trim()
  if (!text || props.isLoading) return
  emit('send', text)
  input.value = ''
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}
</script>

<template>
  <div class="input-area">
    <div class="input-container">
      <textarea
        ref="textareaRef"
        v-model="input"
        :placeholder="isLoading ? 'Waiting for response...' : 'Type a message...'"
        :disabled="isLoading"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        v-if="isStreaming"
        class="btn btn-stop"
        title="Stop"
        @click="emit('stop')"
      >
        <Square :size="18" />
      </button>
      <button
        v-else
        class="btn btn-send"
        :disabled="isLoading || !input.trim()"
        @click="handleSend"
      >
        <span v-if="isLoading" class="spinner" />
        <Send v-else :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.input-area {
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.input-container {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

textarea {
  flex: 1;
  resize: none;
  border: 1.5px solid var(--color-border);
  border-radius: 14px;
  padding: 12px 16px;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg-soft);
  outline: none;
  transition: border-color 200ms, box-shadow 200ms;
  max-height: 150px;
}

textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-ring);
}

textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

textarea::placeholder {
  color: var(--color-text-muted);
}

.btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 200ms, transform 150ms;
  flex-shrink: 0;
}

.btn:active {
  transform: scale(0.92);
}

.btn-send {
  background: var(--color-primary);
  color: white;
}

.btn-send:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-stop {
  background: var(--color-destructive);
  color: white;
}

.btn-stop:hover {
  background: #B91C1C;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
