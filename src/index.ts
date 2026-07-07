import { Hono } from "hono";
import { cors } from "hono/cors";
import { config, createDefaultModel } from "./config";
import { models, setDefaultModelName } from "./store";
import healthRoutes from "./routes/health";
import chatRoutes from "./routes/chat";
import modelRoutes from "./routes/models";

// Initialize default model from CLI args / env
const defaultModel = createDefaultModel();
models.set(defaultModel.name, defaultModel);
setDefaultModelName(defaultModel.name);

const app = new Hono();

app.use("*", cors());

app.route("/api/health", healthRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/models", modelRoutes);

const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`AI Chat server running on http://localhost:${port}`);
console.log(`Default model: ${defaultModel.name} (${defaultModel.modelId})`);
console.log("\nEndpoints:");
console.log("  POST   /api/chat          - Send message (SSE stream)");
console.log("  DELETE /api/chat          - Clear chat history");
console.log("  GET    /api/chat/history   - Get chat history");
console.log("  POST   /api/chat/stop     - Stop current response");
console.log("  GET    /api/models        - List all models");
console.log("  POST   /api/models        - Add a new model");
console.log("  DELETE /api/models/:name  - Remove a model");
console.log("  GET    /api/health        - Health check");
