import type { AIModel } from "./types";

interface CLIConfig {
  defaultName: string;
  defaultBaseURL: string;
  modelId: string;
  defaultApiKey: string;
}

function parseArgs(): CLIConfig {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        map.set(arg.slice(2, eqIdx), arg.slice(eqIdx + 1));
      } else {
        map.set(arg.slice(2), args[++i] ?? "");
      }
    }
  }

  return {
    defaultName: map.get("default-name") ?? process.env.AI_MODEL_NAME ?? "default",
    defaultBaseURL: map.get("default-base-url") ?? process.env.AI_BASE_URL ?? "https://api.example.com/v1",
    modelId: map.get("model-id") ?? process.env.AI_MODEL_ID ?? "/default-model/somemodelid",
    defaultApiKey: map.get("default-api-key") ?? process.env.AI_API_KEY ?? "default-api-key",
  };
}

export const config = parseArgs();

export function createDefaultModel(): AIModel {
  return {
    name: config.defaultName,
    baseURL: config.defaultBaseURL,
    apiKey: config.defaultApiKey,
    modelId: config.modelId,
  };
}
