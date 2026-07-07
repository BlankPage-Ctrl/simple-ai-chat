import { Hono } from "hono";
import type { AIModel } from "../types";
import { models } from "../store";

const modelRoutes = new Hono();

modelRoutes.get("/", (c) => {
  const list = [...models.values()].map((m) => ({
    name: m.name,
    modelId: m.modelId,
    baseURL: m.baseURL,
    hasApiKey: !!m.apiKey,
  }));
  return c.json({ models: list });
});

modelRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json<AIModel>();
    if (!body.name || !body.baseURL || !body.modelId) {
      return c.json({ error: "name, baseURL, and modelId are required" }, 400);
    }
    models.set(body.name, {
      name: body.name,
      baseURL: body.baseURL,
      apiKey: body.apiKey || "",
      modelId: body.modelId,
    });
    return c.json({ ok: true, message: `Model "${body.name}" added` });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

modelRoutes.delete("/:name", (c) => {
  const name = c.req.param("name");
  if (!models.has(name)) {
    return c.json({ error: `Model "${name}" not found` }, 404);
  }
  models.delete(name);
  return c.json({ ok: true, message: `Model "${name}" removed` });
});

export default modelRoutes;
