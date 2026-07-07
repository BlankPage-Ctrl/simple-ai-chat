<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatMessage } from '@/stores/chat'
import { User, Bot, ChevronDown, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  message: ChatMessage
}>()

const showReasoning = ref(false)

const reasoningText = computed(() => {
  const part = props.message.parts.find((p) => p.type === 'reasoning')
  return part?.text || props.message.reasoningText
})

const responseText = computed(() => {
  const part = props.message.parts.find((p) => p.type === 'text')
  return part?.text || props.message.content
})

const hasReasoning = computed(() => !!reasoningText.value)

const isStreamingReasoning = computed(() => {
  const part = props.message.parts.find((p) => p.type === 'reasoning')
  return part?.state === 'streaming'
})

const isStreamingText = computed(() => {
  const part = props.message.parts.find((p) => p.type === 'text')
  return part?.state === 'streaming'
})
</script>

<template>
  <div class="message-row" :class="message.role">
    <div class="avatar">
      <User v-if="message.role === 'user'" :size="18" />
      <Bot v-else :size="18" />
    </div>
    <div class="bubble">
      <div v-if="hasReasoning" class="reasoning-section">
        <button
          class="reasoning-toggle"
          :class="{ active: showReasoning }"
          @click="showReasoning = !showReasoning"
        >
          <ChevronDown v-if="showReasoning" :size="12" />
          <ChevronRight v-else :size="12" />
          <span>Reasoning{{ isStreamingReasoning ? '...' : '' }}</span>
        </button>
        <div v-show="showReasoning" class="reasoning-content">
          {{ reasoningText }}
        </div>
      </div>
      <div class="content">
        <span v-if="!message.content && !hasReasoning && message.role === 'assistant'" class="typing-indicator">
          <span class="dot" />
          <span class="dot" />
          <span class="dot" />
        </span>
        <template v-else-if="responseText">
          {{ responseText }}
          <span v-if="isStreamingText" class="cursor" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-row {
  display: flex;
  gap: 10px;
  padding: 4px 20px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.message-row.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-row.user .avatar {
  background: var(--cream-300);
}

.message-row.assistant .avatar {
  background: var(--cream-200);
}

.bubble {
  max-width: 75%;
  padding: 12px 18px;
  border-radius: 18px;
  line-height: 1.55;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-row.user .bubble {
  background: var(--color-user-bubble);
  color: var(--color-user-bubble-text);
  border-bottom-right-radius: 4px;
}

.message-row.assistant .bubble {
  background: var(--color-ai-bubble);
  color: var(--color-text);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.content {
  font-size: 15px;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--color-text-muted);
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 1px;
}

@keyframes blink {
  50% { opacity: 0; }
}

.reasoning-section {
  margin-bottom: 8px;
  border-bottom: 1px solid var(--cream-200);
  padding-bottom: 8px;
}

.reasoning-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--cream-300);
  border-radius: 8px;
  padding: 3px 10px;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 12px;
  color: var(--color-text-soft);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.reasoning-toggle:hover {
  background: var(--cream-200);
  color: var(--color-text);
}



.reasoning-content {
  margin-top: 8px;
  padding: 8px 10px;
  background: var(--cream-50);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text-soft);
  font-style: italic;
  line-height: 1.5;
}

.typing-indicator {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--color-text-muted);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
