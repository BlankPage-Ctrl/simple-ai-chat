# Simple AI Chat

A minimal AI chat app with multiple model support with **Native Ollama API** (`ollama-ai-provider-v2`), streaming responses, reasoning/thinking support, AES-256-GCM encrypted communication, and single-binary deployment.

> **Migration note:** `v2` switched from `@ai-sdk/openai-compatible` to native Ollama provider. Default `baseURL` is now `http://localhost:11434/api` (not `/v1`). See [Ollama Options & Thinking](#ollama-options--thinking) for the new flags.

## Quick Start (Download from Releases)

The easiest way: download the binary from [GitHub Releases](https://github.com/BlankPage-Ctrl/simple-ai-chat/releases).

```bash
# Linux — Ollama local (default)
./simple-chat --model-id="llama3.2"

# With custom base URL + thinking model
./simple-chat --default-base-url="http://localhost:11434/api" --model-id="qwen3:8b" --think

# Windows
simple-chat.exe --model-id="llama3.2"
```

Requires [Ollama](https://ollama.com) running locally (`ollama serve` + `ollama pull llama3.2`). Open `http://localhost:3000` in your browser.

### CLI Arguments

| Argument | Environment | Default | Description |
|----------|-------------|---------|-------------|
| `--port` | `PORT` | `3000` | Server port |
| `--default-name` | `AI_MODEL_NAME` | `"default"` | Default model display name |
| `--default-base-url` | `AI_BASE_URL` / `OLLAMA_BASE_URL` | `"http://localhost:11434/api"` | Ollama API base URL (`--ollama-base-url` alias also works) |
| `--model-id` | `AI_MODEL_ID` | `"llama3.2"` | Model identifier (e.g. `llama3.2`, `qwen3:8b`, `deepseek-r1:7b`) |
| `--default-api-key` | `AI_API_KEY` | `""` | API key (optional for Ollama local) |
| `--options` | `OLLAMA_OPTIONS` / `AI_OPTIONS` | `` | Ollama Modelfile options as JSON — see below |
| `--think` / `--no-think` | `OLLAMA_THINK` / `AI_THINK` | `` (model default) | Enable/disable reasoning for thinking models (`qwen3`, `deepseek-r1`, etc.) |
| `--timeout-total` | `AI_TIMEOUT_TOTAL` | ``0`` | Total timeout per response (`0` = disabled) |
| `--timeout-chunk` | `AI_TIMEOUT_CHUNK` | ``0`` | Timeout between stream chunks (`0` = disabled) |
| `--idle-timeout` | `IDLE_TIMEOUT` | ``4m`` (`240`) | Bun HTTP server idle timeout in seconds (max `255`, `0` = disabled) |
| `--key` | `CHAT_KEY` | `` | Encryption key (required for backend-only/frontend-only) |
| `--backend-only` | | | Run API server only (requires `--key`) |
| `--frontend-only` | | | Run frontend proxy only (requires `--key` + `--backend`) |
| `--backend` | `CHAT_BACKEND_URL` | `` | Remote backend URL for frontend-only mode |

> **Duration format:** Values support human-readable strings like `"30s"`, `"5m"`, `"2h"`, or raw ms numbers (`"120000"`). Set to `0`, `"none"`, `"off"`, or `"disabled"` to disable a timeout.

### Ollama Options & Thinking

`--options` forwards Modelfile parameters to Ollama's `/api/chat` `options` object. Valid keys (validated via `ollama-ai-provider-v2`):

`num_ctx`, `repeat_last_n`, `repeat_penalty`, `temperature`, `seed`, `stop`, `num_predict`, `top_k`, `top_p`, `min_p`

Unknown keys are warned and stripped.

```bash
# JSON (strict)
./simple-chat --options='{"repeat_penalty":1.1,"num_ctx":8192,"seed":123}'

# JS-like shorthand also works (unquoted keys, single quotes)
./simple-chat --options='{repeat_penalty: 1.1, num_ctx: 8192, seed: 123}'
./simple-chat --options="{'temperature': 0.7, 'top_p': 0.9}"

# Via env
OLLAMA_OPTIONS='{"temperature":0.7,"top_p":0.9}' ./simple-chat
```

`--think` controls reasoning separation for thinking models. The UI already streams `reasoning` parts when enabled.

```bash
--think            # enable (also --think=true, --think=1, --think=on)
--think=false      # disable (also --think=0, --think=no, --think=off)
--no-think         # shorthand disable
OLLAMA_THINK=true  ./simple-chat
# If unset, model decides (provider default)
```

Per-request overrides are also supported (no restart needed):

```bash
curl -X POST http://localhost:3000/api/chat -H "content-type: application/json" \
  -d '{"message":"hello","think":false,"options":{"temperature":0.5,"seed":42}}'

# Dynamic model with its own think/options
curl -X POST http://localhost:3000/api/models -H "content-type: application/json" \
  -d '{"name":"qwen-thinking","baseURL":"http://localhost:11434/api","modelId":"qwen3:8b","think":true,"options":{"num_ctx":4096}}'
```

`GET /api/health` now returns `{"ollama":{"baseURL","think","options"}}` and `GET /api/models` includes `options`/`think` per model.

Full examples:

```bash
# Combined mode with full tuning
./simple-chat --port=8080 --default-name="Qwen3" --model-id="qwen3:8b" --options='{"num_ctx":8192,"temperature":0.7,"seed":123}' --think --timeout-total="5m" --timeout-chunk="30s"

# Backend only (encrypted, Ollama native)
./simple-chat --backend-only --key="mysecret" --default-base-url="http://localhost:11434/api" --model-id="llama3.2" --options='{"num_ctx":8192}'

# Thinking disabled for non-reasoning run
./simple-chat --model-id="llama3.2" --no-think --options='{"repeat_penalty":1.1}'

# Frontend only (encrypted, proxy to remote backend)
./simple-chat --frontend-only --key="mysecret" --backend="https://your-backend.ngrok.io" --port=5173
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) v1.3.13+
- Node.js 22.18+

### Setup

```bash
# Install server dependencies
bun install

# Install UI dependencies
cd ui && bun install && cd ..
```

### Running (Development Mode)

Two terminals:

```bash
# Terminal 1: Backend with hot reload
bun run dev

# Terminal 2: Frontend dev server with HMR
cd ui && bun run dev
```

Vite dev server at `localhost:5173` (proxies `/api` to backend `localhost:3000`).

### Building a Binary

```bash
# Build everything (UI → embed → compile)
bun run build

# Output: ./simple-chat (Linux)
# Or: bun run build:windows → simple-chat.exe
```

### Testing

```bash
cd ui
bun run test:unit       # Unit tests (vitest)
bun run test:e2e        # E2E tests (playwright)
```

### Available Scripts

| Script | Command | Description |
|--------|----------|-------------|
| `start` | `bun src/index.ts` | Run in production |
| `dev` | `bun --hot src/index.ts` | Hot reload backend |
| `build:ui` | `cd ui && bun run build` | Build frontend |
| `build:embed` | `bun scripts/embed-ui.ts` | Embed UI into binary |
| `build` | `build:ui + build:embed + compile` | Build Linux binary |

## License

MIT
