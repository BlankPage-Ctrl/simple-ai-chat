import type { AIModel, OllamaOptions } from "./types";
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
  ollamaOptions?: OllamaOptions;
  think?: boolean;
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

  // --options / OLLAMA_OPTIONS : JSON string for Ollama Modelfile options
  // e.g. --options='{"repeat_penalty":1.1,"num_ctx":8192,"seed":123}'
  // Also accepts JS-like shorthand: --options="{repeat_penalty: 1.1, num_ctx: 8192}"
  // and env OLLAMA_OPTIONS / AI_OPTIONS
  const rawOptions =
    map.get("options") ??
    process.env.OLLAMA_OPTIONS ??
    process.env.AI_OPTIONS ??
    "";
  let ollamaOptions: OllamaOptions | undefined;
  if (rawOptions) {
    try {
      const normalized = rawOptions
        // quote unquoted keys: {repeat_penalty: 1.1} -> {"repeat_penalty": 1.1}
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        // single quotes -> double quotes
        .replace(/'/g, '"');
      const parsed = JSON.parse(normalized);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("options must be a JSON object");
      }
      const allowedKeys = new Set([
        "num_ctx",
        "repeat_last_n",
        "repeat_penalty",
        "temperature",
        "seed",
        "stop",
        "num_predict",
        "top_k",
        "top_p",
        "min_p",
      ]);
      ollamaOptions = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (!allowedKeys.has(k)) {
          console.warn(`[config] --options: ignoring unknown key "${k}" (allowed: ${[...allowedKeys].join(", ")})`);
          continue;
        }
        (ollamaOptions as Record<string, unknown>)[k] = v;
      }
      if (Object.keys(ollamaOptions).length === 0) ollamaOptions = undefined;
    } catch (e: unknown) {
      console.error(`Error: --options invalid JSON: ${rawOptions}`);
      console.error(`  Expected like: --options='{"repeat_penalty":1.1,"num_ctx":8192,"seed":123}'`);
      console.error(`  Detail: ${(e as Error).message}`);
      process.exit(1);
    }
  }

  // --think / --no-think / OLLAMA_THINK / AI_THINK : enable/disable reasoning
  //   --think            -> true
  //   --think=true/false -> boolean
  //   --no-think         -> false
  //   --think=0/1        -> boolean
  // If unset, think is undefined (provider default = model decides)
  const rawThink =
    map.has("no-think") ? "false" :
    map.get("think") ??
    process.env.OLLAMA_THINK ??
    process.env.AI_THINK ??
    undefined;
  let think: boolean | undefined;
  if (rawThink !== undefined) {
    const v = rawThink.trim().toLowerCase();
    if (["true", "1", "yes", "on", ""].includes(v)) think = true;
    else if (["false", "0", "no", "off"].includes(v)) think = false;
    else {
      console.error(`Error: --think value must be boolean (true/false), got "${rawThink}"`);
      process.exit(1);
    }
  }

  return {
    defaultName: map.get("default-name") ?? process.env.AI_MODEL_NAME ?? "default",
    defaultBaseURL:
      map.get("default-base-url") ??
      map.get("ollama-base-url") ??
      process.env.OLLAMA_BASE_URL ??
      process.env.AI_BASE_URL ??
      "http://localhost:11434/api",
    modelId: map.get("model-id") ?? process.env.AI_MODEL_ID ?? "llama3.2",
    defaultApiKey: map.get("default-api-key") ?? process.env.AI_API_KEY ?? "",
    timeoutTotal: parseDuration(map.get("timeout-total") ?? process.env.AI_TIMEOUT_TOTAL ?? "0"),
    timeoutChunk: parseDuration(map.get("timeout-chunk") ?? process.env.AI_TIMEOUT_CHUNK ?? "0"),
    idleTimeout: Math.min(Math.round(parseDuration(map.get("idle-timeout") ?? process.env.IDLE_TIMEOUT ?? "4m") / 1000), 255),
    mode,
    key,
    backendUrl,
    port: Number(map.get("port")) || Number(process.env.PORT) || 3000,
    ollamaOptions,
    think,
  };
}

export const config = parseArgs();

export function createDefaultModel(): AIModel {
  return {
    name: config.defaultName,
    baseURL: config.defaultBaseURL,
    apiKey: config.defaultApiKey,
    modelId: config.modelId,
    options: config.ollamaOptions,
    think: config.think,
  };
}
