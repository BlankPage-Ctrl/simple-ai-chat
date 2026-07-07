import { Hono } from "hono";
import { models, defaultModelName } from "../store";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    ok: true,
    defaultModel: defaultModelName || null,
    modelCount: models.size,
  });
});

export default health;
