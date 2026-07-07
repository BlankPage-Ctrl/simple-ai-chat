<script setup lang="ts">
import type { AIModel } from '@/stores/chat'

defineProps<{
  models: AIModel[]
  selected: string
}>()

const emit = defineEmits<{
  select: [name: string]
}>()
</script>

<template>
  <select
    class="model-select"
    :value="selected"
    @change="emit('select', ($event.target as HTMLSelectElement).value)"
  >
    <option value="" disabled>Pilih model</option>
    <option
      v-for="m in models"
      :key="m.name"
      :value="m.name"
    >
      {{ m.name }} ({{ m.modelId }})
    </option>
  </select>
</template>

<style scoped>
.model-select {
  appearance: none;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  padding: 6px 32px 6px 12px;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-surface)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A6B5B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 10px center;
  cursor: pointer;
  outline: none;
  transition: border-color 200ms;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-select:focus {
  border-color: var(--color-primary);
}

.model-select:hover {
  border-color: var(--color-primary);
}
</style>
