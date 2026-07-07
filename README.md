# Simple AI Chat

A minimal AI chat app with multiple model support with OpenAI Compatible API, streaming responses, and single-binary deployment.

## Quick Start (Download from Releases)

The easiest way: download the binary from [GitHub Releases](https://github.com/your-username/simple-ai-chat/releases).

```bash
# Linux
./simple-chat --default-api-key="sk-..." --default-base-url="https://api.openai.com/v1" --model-id="gpt-4"

# Windows
simple-chat.exe --default-api-key="sk-..." --default-base-url="https://api.openai.com/v1" --model-id="gpt-4"
```

Open `http://localhost:3000` in your browser.

### CLI Arguments

| Argument | Environment | Default | Description |
|----------|-------------|---------|-------------|
| `--port` | `PORT` | `3000` | Server port |
| `--default-name` | `AI_MODEL_NAME` | `"default"` | Default model display name |
| `--default-base-url` | `AI_BASE_URL` | `"https://api.example.com/v1"` | API base URL |
| `--model-id` | `AI_MODEL_ID` | `"/default-model/somemodelid"` | Model identifier |
| `--default-api-key` | `AI_API_KEY` | `"default-api-key"` | API key |

Full example:

```bash
./simple-chat --port=8080 --default-name="GPT-4o" --model-id="gpt-4o" --default-base-url="https://api.openai.com/v1" --default-api-key="sk-123456789"
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
