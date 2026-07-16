import { Hono } from "hono";
import { streamText, type ModelMessage } from "ai";
import { chatHistory, activeAbortControllers, CHAT_ID, getModel } from "../store";
import { config } from "../config";
import { deriveKey, encrypt, decrypt } from "../crypto";

const chat = new Hono();

let cryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (!cryptoKey) cryptoKey = await deriveKey(config.key);
  return cryptoKey;
}

chat.post("/", async (c) => {
  try {
    let message: string | undefined;
    let modelName: string | undefined;

    if (config.key) {
      const raw = await c.req.json<{ encrypted?: string; message?: string; model?: string }>();
      if (raw.encrypted) {
        const key = await getCryptoKey();
        const decrypted = await decrypt(raw.encrypted, key);
        const parsed = JSON.parse(decrypted);
        message = parsed.message;
        modelName = parsed.model;
      } else {
        message = raw.message;
        modelName = raw.model;
      }
    } else {
      const body = await c.req.json<{ message: string; model?: string }>();
      message = body.message;
      modelName = body.model;
    }

    if (!message?.trim()) {
      return c.json({ error: "Message is required" }, 400);
    }

    const history = chatHistory.get(CHAT_ID) || [];

    history.push({ role: "user", content: message });

    const assistantIndex = history.length;
    history.push({ role: "assistant", content: "" });

    chatHistory.set(CHAT_ID, history);

    const abortController = new AbortController();
    activeAbortControllers.set(CHAT_ID, abortController);

    const model = getModel(modelName);

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

    const response = result.toUIMessageStreamResponse();

    if (!config.key) {
      return response;
    }

    const key = await getCryptoKey();
    const reader = response.body?.getReader();
    if (!reader) return response;

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const encStream = new ReadableStream({
      async start(ctrl) {
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const raw = line.slice(6).trim();
                if (!raw || raw === "[DONE]") {
                  const enc = await encrypt(raw || "[DONE]", key);
                  ctrl.enqueue(encoder.encode(`data: ${enc}\n`));
                } else {
                  const enc = await encrypt(raw, key);
                  ctrl.enqueue(encoder.encode(`data: ${enc}\n`));
                }
              } else if (line.trim()) {
                const enc = await encrypt(line, key);
                ctrl.enqueue(encoder.encode(`data: ${enc}\n`));
              }
            }
          }
          if (buf) {
            const enc = await encrypt(buf, key);
            ctrl.enqueue(encoder.encode(`data: ${enc}\n`));
          }
        } catch (err) {
          ctrl.error(err);
        } finally {
          ctrl.close();
        }
      },
    });

    return new Response(encStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chat.delete("/", (c) => {
  chatHistory.delete(CHAT_ID);
  return c.json({ ok: true, message: "Chat history cleared" });
});

chat.get("/history", async (c) => {
  const history = chatHistory.get(CHAT_ID) || [];
  const json = JSON.stringify({ messages: history });

  if (!config.key) {
    return c.json({ messages: history });
  }

  const key = await getCryptoKey();
  const encrypted = await encrypt(json, key);
  return c.json({ encrypted });
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
