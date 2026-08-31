import type { ModelMessage } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { AIModel } from "./types";

export const chatHistory = new Map<string, ModelMessage[]>();
export const models = new Map<string, AIModel>();
export const activeAbortControllers = new Map<string, AbortController>();
export let defaultModelName = "";

export function setDefaultModelName(name: string) {
  defaultModelName = name;
}

export const CHAT_ID = "default";

const providerCache = new Map<string, ReturnType<typeof createOllama>>();

function getOrCreateProvider(baseURL: string) {
  // ollama-ai-provider-v2 expects baseURL like http://localhost:11434/api
  // Normalize: strip trailing slash
  const normalized = baseURL.replace(/\/+$/, "");
  let p = providerCache.get(normalized);
  if (!p) {
    p = createOllama({ baseURL: normalized });
    providerCache.set(normalized, p);
  }
  return p;
}

export function getModel(modelName?: string) {
  const name = modelName || ([...models.keys()][0] ?? "default");
  const model = models.get(name);
  if (!model) {
    throw new Error(`Model "${name}" not found. Available: ${[...models.keys()].join(", ")}`);
  }
  const provider = getOrCreateProvider(model.baseURL);
  return provider(model.modelId);
}

export function getModelWithSettings(modelName?: string, settings?: { think?: boolean; options?: AIModel["options"] }) {
  const name = modelName || ([...models.keys()][0] ?? "default");
  const model = models.get(name);
  if (!model) {
    throw new Error(`Model "${name}" not found. Available: ${[...models.keys()].join(", ")}`);
  }
  const provider = getOrCreateProvider(model.baseURL);
  const think = settings?.think ?? model.think;
  const options = settings?.options ?? model.options;
  if (think !== undefined || options !== undefined) {
    return provider.chat(model.modelId, {
      ...(think !== undefined ? { think } : {}),
      ...(options !== undefined ? { options } : {}),
    });
  }
  return provider(model.modelId);
}
