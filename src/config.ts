import type { AIModel } from "./types";
import { parseDuration } from "./duration";

export type AppMode = "combined" | "backend-only" | "frontend-only";

interface CLIConfig {
  defaultName: string;
  defaultBaseURL: string;
  modelId: string;
  defaultApiKey: string;
  timeoutTotal: number;
  timeoutChunk: number;
  idleTimeout: number;
  mode: AppMode;
  key: string;
  backendUrl: string;
  port: number;
}

function parseArgs(): CLIConfig {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();

  const BOOLEAN_FLAGS = new Set(["backend-only", "frontend-only"]);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        map.set(arg.slice(2, eqIdx), arg.slice(eqIdx + 1));
      } else {
        const key = arg.slice(2);
        if (BOOLEAN_FLAGS.has(key)) {
          map.set(key, "true");
        } else {
          map.set(key, args[++i] ?? "");
        }
      }
    }
  }

  const backendOnly = map.has("backend-only");
  const frontendOnly = map.has("frontend-only");
  const key = map.get("key") ?? process.env.CHAT_KEY ?? "";

  let mode: AppMode = "combined";
  if (backendOnly) mode = "backend-only";
  else if (frontendOnly) mode = "frontend-only";

  if ((mode === "backend-only" || mode === "frontend-only") && !key) {
    console.error(`Error: --key is required when using --${mode}`);
    process.exit(1);
  }

  const backendUrl = map.get("backend") ?? process.env.CHAT_BACKEND_URL ?? "";
  if (mode === "frontend-only" && !backendUrl) {
    console.error("Error: --backend=<url> is required when using --frontend-only");
    process.exit(1);
  }

  return {
    defaultName: map.get("default-name") ?? process.env.AI_MODEL_NAME ?? "default",
    defaultBaseURL: map.get("default-base-url") ?? process.env.AI_BASE_URL ?? "https://api.example.com/v1",
    modelId: map.get("model-id") ?? process.env.AI_MODEL_ID ?? "/default-model/somemodelid",
    defaultApiKey: map.get("default-api-key") ?? process.env.AI_API_KEY ?? "default-api-key",
    timeoutTotal: parseDuration(map.get("timeout-total") ?? process.env.AI_TIMEOUT_TOTAL ?? "0"),
    timeoutChunk: parseDuration(map.get("timeout-chunk") ?? process.env.AI_TIMEOUT_CHUNK ?? "0"),
    idleTimeout: Math.min(Math.round(parseDuration(map.get("idle-timeout") ?? process.env.IDLE_TIMEOUT ?? "4m") / 1000), 255),
    mode,
    key,
    backendUrl,
    port: Number(map.get("port")) || Number(process.env.PORT) || 3000,
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
