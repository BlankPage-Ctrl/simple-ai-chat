import { Hono } from "hono";
import { cors } from "hono/cors";
import { config, createDefaultModel } from "./config";
import { models, setDefaultModelName } from "./store";
import healthRoutes from "./routes/health";
import chatRoutes from "./routes/chat";
import modelRoutes from "./routes/models";
import { serveAsset } from "./ui.assets";
import { deriveKey, encrypt, decrypt } from "./crypto";

const defaultModel = createDefaultModel();
models.set(defaultModel.name, defaultModel);
setDefaultModelName(defaultModel.name);

const port = config.port;

if (config.mode === "combined") {
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

  Bun.serve({ port, fetch: app.fetch, idleTimeout: config.idleTimeout });
  console.log(`[combined] AI Chat server running on http://localhost:${port}`);
  console.log(`Default model: ${defaultModel.name} (${defaultModel.modelId})`);

} else if (config.mode === "backend-only") {
  const app = new Hono();
  app.use("*", cors());
  app.route("/api/health", healthRoutes);
  app.route("/api/chat", chatRoutes);
  app.route("/api/models", modelRoutes);

  Bun.serve({ port, fetch: app.fetch, idleTimeout: config.idleTimeout });
  console.log(`[backend-only] API server running on http://localhost:${port}`);
  console.log(`Default model: ${defaultModel.name} (${defaultModel.modelId})`);
  console.log(`Encryption: AES-256-GCM (key set)`);

} else if (config.mode === "frontend-only") {
  const cryptoKey = await deriveKey(config.key);
  const backendBase = config.backendUrl.replace(/\/+$/, "");

  const app = new Hono();
  app.use("*", cors());

  app.all("/api/*", async (c) => {
    const url = new URL(c.req.url);
    const targetUrl = `${backendBase}${url.pathname}${url.search}`;
    const method = c.req.method;

    const headers = new Headers();
    headers.set("Content-Type", c.req.header("content-type") ?? "application/json");

    let body: BodyInit | undefined = undefined;
    if (method !== "GET" && method !== "HEAD") {
      const originalBody = await c.req.text();
      if (originalBody) {
        const encrypted = await encrypt(originalBody, cryptoKey);
        body = JSON.stringify({ encrypted });
        headers.set("Content-Type", "application/json");
      }
    }

    const upstream = await fetch(targetUrl, { method, headers, body });

    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
      const reader = upstream.body?.getReader();
      if (!reader) return upstream;

      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const raw = line.slice(6).trim();
                  if (!raw || raw === "[DONE]") {
                    controller.enqueue(encoder.encode(line + "\n"));
                  } else {
                    try {
                      const decrypted = await decrypt(raw, cryptoKey);
                      controller.enqueue(encoder.encode(`data: ${decrypted}\n`));
                    } catch {
                      controller.enqueue(encoder.encode(line + "\n"));
                    }
                  }
                } else {
                  controller.enqueue(encoder.encode(line + "\n"));
                }
              }
            }
            if (buffer) controller.enqueue(encoder.encode(buffer));
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: upstream.status,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    if (contentType.includes("application/json")) {
      const json = await upstream.json() as { encrypted?: string };
      if (json.encrypted) {
        const decrypted = await decrypt(json.encrypted, cryptoKey);
        return c.json(JSON.parse(decrypted));
      }
      return c.json(json);
    }

    return upstream;
  });

  app.get("*", (c) => {
    const url = new URL(c.req.url);
    let path = url.pathname;
    if (path === "/") path = "/index.html";
    const res = serveAsset(path);
    if (res) return res;
    return serveAsset("/index.html") ?? new Response("Not Found", { status: 404 });
  });

  Bun.serve({ port, fetch: app.fetch, idleTimeout: config.idleTimeout });
  console.log(`[frontend-only] Frontend server running on http://localhost:${port}`);
  console.log(`Proxying API to: ${backendBase}`);
  console.log(`Encryption: AES-256-GCM (key set)`);
}
