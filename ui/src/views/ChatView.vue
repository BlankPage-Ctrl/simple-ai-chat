<script setup lang="ts">
import { onMounted, watch, nextTick, ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'
import ModelSelector from '@/components/ModelSelector.vue'
import { Coffee, Trash2, X } from 'lucide-vue-next'

const store = useChatStore()
const messagesContainer = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  const el = messagesContainer.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

watch(
  () => store.messages.length,
  () => scrollToBottom(),
)

watch(
  () => store.messages.map((m) => m.content + m.reasoningText).join(''),
  () => scrollToBottom(),
)

onMounted(() => {
  store.loadModels()
  store.loadHistory()
})
</script>

<template>
  <div class="chat-layout">
    <header class="chat-header">
      <div class="header-left">
        <Coffee class="header-icon" :size="22" />
        <h1 class="header-title">Simple AI Chat</h1>
      </div>
      <div class="header-right">
        <ModelSelector
          :models="store.models"
          :selected="store.selectedModel"
          @select="store.selectedModel = $event"
        />
        <button
          v-if="store.messages.length > 0"
          class="btn-clear"
          title="Clear chat"
          @click="store.clearHistory()"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </header>

    <main ref="messagesContainer" class="messages-area">
      <div v-if="store.messages.length === 0" class="empty-state">
        <Coffee class="empty-icon" :size="56" />
        <h2 class="empty-title">Start Chat</h2>
        <p class="empty-desc">
          Send your first message to start a conversation with AI.
        </p>
      </div>

      <div v-else class="messages-list">
        <ChatMessage
          v-for="(msg, i) in store.messages"
          :key="i"
          :message="msg"
        />
      </div>

      <div v-if="store.error" class="error-bar">
        <span>{{ store.error }}</span>
        <button class="error-dismiss" @click="store.error = ''"><X :size="16" /></button>
      </div>
    </main>

    <ChatInput
      :is-loading="store.isLoading"
      :is-streaming="store.isStreaming"
      @send="(text) => store.sendMessage(text)"
      @stop="store.stopGeneration()"
    />
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--color-bg);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  color: var(--color-primary);
}

.header-title {
  font-family: 'Varela Round', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-clear {
  background: none;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
  transition: background 200ms, border-color 200ms;
  line-height: 1;
}

.btn-clear:hover {
  background: var(--cream-200);
  border-color: var(--color-text-muted);
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  opacity: 0.6;
}

.empty-title {
  font-family: 'Varela Round', sans-serif;
  font-size: 22px;
  color: var(--color-text);
}

.empty-desc {
  font-size: 15px;
  color: var(--color-text-soft);
  max-width: 300px;
}

.error-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  margin: 8px 20px 0;
  max-width: 800px;
  width: calc(100% - 40px);
  align-self: center;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 12px;
  color: #991B1B;
  font-size: 14px;
}

.error-dismiss {
  background: none;
  border: none;
  cursor: pointer;
  color: #991B1B;
  font-size: 16px;
  padding: 2px;
  flex-shrink: 0;
}
</style>
