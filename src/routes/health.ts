import { Hono } from "hono";
import { models, defaultModelName } from "../store";
import { config } from "../config";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    ok: true,
    defaultModel: defaultModelName || null,
    modelCount: models.size,
    ollama: {
      baseURL: config.defaultBaseURL,
      think: config.think ?? null,
      options: config.ollamaOptions ?? null,
    },
  });
});

export default health;
