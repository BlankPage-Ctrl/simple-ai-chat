import { Hono } from "hono";
import { streamText, type ModelMessage } from "ai";
import { chatHistory, activeAbortControllers, CHAT_ID, getModel } from "../store";
import { config } from "../config";

const chat = new Hono();

chat.post("/", async (c) => {
  try {
    const body = await c.req.json<{ message: string; model?: string }>();
    if (!body.message?.trim()) {
      return c.json({ error: "Message is required" }, 400);
    }

    const history = chatHistory.get(CHAT_ID) || [];

    history.push({ role: "user", content: body.message });

    const assistantIndex = history.length;
    history.push({ role: "assistant", content: "" });

    chatHistory.set(CHAT_ID, history);

    const abortController = new AbortController();
    activeAbortControllers.set(CHAT_ID, abortController);

    const model = getModel(body.model);

    const timeout: { totalMs?: number; chunkMs?: number } = {};
    if (config.timeoutTotal) timeout.totalMs = config.timeoutTotal;
    if (config.timeoutChunk) timeout.chunkMs = config.timeoutChunk;

    let accumulatedText = "";
    let chunkCount = 0;
    const SAVE_EVERY_N_CHUNKS = 7;

    const result = streamText({
      model,
      messages: history.slice(0, -1),
      abortSignal: abortController.signal,
      ...(config.timeoutTotal || config.timeoutChunk ? { timeout } : {}),
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          accumulatedText += chunk.text;
          chunkCount++;

          if (chunkCount % SAVE_EVERY_N_CHUNKS === 0) {
            history[assistantIndex]!.content = accumulatedText;
            chatHistory.set(CHAT_ID, history);
          }
        }
      },
      onFinish: ({ text }) => {
        history[assistantIndex]!.content = text || accumulatedText;
        chatHistory.set(CHAT_ID, history);
        activeAbortControllers.delete(CHAT_ID);
      },
      onError: (error) => {
        console.error("Stream error:", error);
        if (accumulatedText) {
          history[assistantIndex]!.content = accumulatedText;
          chatHistory.set(CHAT_ID, history);
        }
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
