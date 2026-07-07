import { Hono } from "hono";
import { streamText, type ModelMessage } from "ai";
import { chatHistory, activeAbortControllers, CHAT_ID, getModel } from "../store";

const chat = new Hono();

chat.post("/", async (c) => {
  try {
    const body = await c.req.json<{ message: string; model?: string }>();
    if (!body.message?.trim()) {
      return c.json({ error: "Message is required" }, 400);
    }

    const history = chatHistory.get(CHAT_ID) || [];
    history.push({ role: "user", content: body.message });
    chatHistory.set(CHAT_ID, history);

    const abortController = new AbortController();
    activeAbortControllers.set(CHAT_ID, abortController);

    const model = getModel(body.model);

    const result = streamText({
      model,
      messages: history,
      abortSignal: abortController.signal,
      onFinish: ({ text }) => {
        history.push({ role: "assistant", content: text });
        chatHistory.set(CHAT_ID, history);
        activeAbortControllers.delete(CHAT_ID);
      },
      onError: (error) => {
        console.error("Stream error:", error);
        activeAbortControllers.delete(CHAT_ID);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chat.delete("/", (c) => {
  chatHistory.delete(CHAT_ID);
  return c.json({ ok: true, message: "Chat history cleared" });
});

chat.get("/history", (c) => {
  const history = chatHistory.get(CHAT_ID) || [];
  return c.json({ messages: history });
});

chat.post("/stop", (c) => {
  const controller = activeAbortControllers.get(CHAT_ID);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(CHAT_ID);
    return c.json({ ok: true, message: "Response stopped" });
  }
  return c.json({ ok: false, message: "No active response to stop" }, 404);
});

export default chat;
