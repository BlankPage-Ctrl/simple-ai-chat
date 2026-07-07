import { Hono } from "hono";
import { cors } from "hono/cors";
import { config, createDefaultModel } from "./config";
import { models, setDefaultModelName } from "./store";
import healthRoutes from "./routes/health";
import chatRoutes from "./routes/chat";
import modelRoutes from "./routes/models";
import { serveAsset } from "./ui.assets";

const defaultModel = createDefaultModel();
models.set(defaultModel.name, defaultModel);
setDefaultModelName(defaultModel.name);

const app = new Hono();

app.use("*", cors());

app.route("/api/health", healthRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/models", modelRoutes);

app.get("*", (c) => {
  const url = new URL(c.req.url);
  let path = url.pathname;
  if (path === "/") path = "/index.html";
  const res = serveAsset(path);
  if (res) return res;
  return serveAsset("/index.html") ?? new Response("Not Found", { status: 404 });
});

const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: config.idleTimeout,
});

console.log(`AI Chat server running on http://localhost:${port}`);
console.log(`Default model: ${defaultModel.name} (${defaultModel.modelId})`);