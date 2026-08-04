<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { Settings2, X } from 'lucide-vue-next'

const store = useChatStore()
const isOpen = ref(false)
const draft = ref(store.systemPrompt)

function save() {
  store.setSystemPrompt(draft.value)
  isOpen.value = false
}

function reset() {
  draft.value = ''
  store.setSystemPrompt('')
  isOpen.value = false
}

function toggle() {
  if (isOpen.value) {
    isOpen.value = false
  } else {
    draft.value = store.systemPrompt
    isOpen.value = true
  }
}
</script>

<template>
  <div class="system-prompt-wrapper">
    <button
      class="btn-settings"
      :class="{ active: !!store.systemPrompt.trim() }"
      title="Custom System Prompt"
      @click="toggle"
    >
      <Settings2 :size="16" />
    </button>

    <div v-if="isOpen" class="popover-overlay" @click="isOpen = false" />
    <div v-if="isOpen" class="popover">
      <div class="popover-header">
        <span class="popover-title">System Prompt</span>
        <button class="btn-close" @click="isOpen = false"><X :size="14" /></button>
      </div>
      <textarea
        v-model="draft"
        placeholder="Masukkan custom system prompt..."
        rows="4"
        class="prompt-input"
      />
      <p class="hint">
        Kosongkan untuk menggunakan default. Prompt ini dikirim terenkripsi di setiap pesan.
      </p>
      <div class="popover-actions">
        <button class="btn-reset" @click="reset">Reset</button>
        <button class="btn-save" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-prompt-wrapper {
  position: relative;
}

.btn-settings {
  background: none;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background 200ms, border-color 200ms, color 200ms;
  line-height: 1;
  color: var(--color-text-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-settings:hover {
  background: var(--cream-200);
  border-color: var(--color-text-muted);
}

.btn-settings.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--cream-100);
}

.popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 340px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.popover-title {
  font-family: 'Varela Round', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 2px;
  display: flex;
  align-items: center;
  transition: color 150ms;
}

.btn-close:hover {
  color: var(--color-text);
}

.prompt-input {
  width: 100%;
  resize: vertical;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg-soft);
  outline: none;
  transition: border-color 200ms, box-shadow 200ms;
  min-height: 80px;
  max-height: 200px;
}

.prompt-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-ring);
}

.prompt-input::placeholder {
  color: var(--color-text-muted);
}

.hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 6px;
  line-height: 1.4;
}

.popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.btn-reset {
  background: none;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 5px 14px;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 12px;
  color: var(--color-text-soft);
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}

.btn-reset:hover {
  background: var(--cream-200);
  border-color: var(--color-text-muted);
}

.btn-save {
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  padding: 5px 14px;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 12px;
  color: white;
  cursor: pointer;
  transition: background 150ms;
}

.btn-save:hover {
  background: var(--color-primary-hover);
}
</style>
