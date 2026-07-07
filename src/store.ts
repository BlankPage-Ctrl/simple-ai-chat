import type { ModelMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AIModel } from "./types";

export const chatHistory = new Map<string, ModelMessage[]>();
export const models = new Map<string, AIModel>();
export const activeAbortControllers = new Map<string, AbortController>();
export let defaultModelName = "";

export function setDefaultModelName(name: string) {
  defaultModelName = name;
}

export const CHAT_ID = "default";

export function getModel(modelName?: string) {
  const name = modelName || ([...models.keys()][0] ?? "default");
  const model = models.get(name);
  if (!model) {
    throw new Error(`Model "${name}" not found. Available: ${[...models.keys()].join(", ")}`);
  }
  const provider = createOpenAICompatible({
    name: model.name,
    baseURL: model.baseURL,
    apiKey: model.apiKey,
  });
  return provider.chatModel(model.modelId);
}
