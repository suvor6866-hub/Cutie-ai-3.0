const { WebSocketServer, WebSocket } = require("ws");

function attachLive(server, memoryHelpers = {}) {
  const { getUserMemory } = memoryHelpers;
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const requestUrl = new URL(req.url, "http://localhost");
    if (requestUrl.pathname !== "/live") { socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (client, req) => {
    let session;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY missing on Render");
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });

      const liveUrl = new URL(req.url, "http://localhost");
      const userId = liveUrl.searchParams.get("userId") || "";
      let memoryContext = "";

      if (/^[a-zA-Z0-9_-]{1,100}$/.test(userId) && getUserMemory) {
        const userMemory = getUserMemory(userId);
        const facts = (userMemory.facts || [])
          .map(item => typeof item === "string" ? item : item.text)
          .filter(Boolean)
          .slice(-30);

        if (facts.length) {
          memoryContext = "\n\nBoss-এর সংরক্ষিত মেমোরি:\n" +
            facts.map((fact, i) => (i + 1) + ". " + fact).join("\n") +
            "\nপ্রাসঙ্গিক হলে এই তথ্য ব্যবহার করবে।";
        }
      }

      session = await ai.live.connect({
        model: process.env.GEMINI_LIVE_MODEL ||
          "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: ["AUDIO"],
          systemInstruction:
            "You are Cutie AI, Boss's friendly female Bengali companion. Speak warmly and naturally. Call the user Boss. Understand Bengali, Hindi and English. Keep replies conversational." + memoryContext
        },
        callbacks: {
          onopen: () => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "connected" }));
            }
          },

          onmessage: (message) => {
            const parts =
              message.serverContent?.modelTurn?.parts || [];

            for (const part of parts) {
              if (part.inlineData?.data &&
                  client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "audio",
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType ||
                    "audio/pcm;rate=24000"
                }));
              }

              if (part.text &&
                  client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "text",
                  text: part.text
                }));
              }
            }

            if (message.serverContent?.turnComplete &&
                client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "turnComplete" }));
            }
          },

          onerror: (error) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "error",
                message: error.message || "Gemini Live error"
              }));
            }
          }
        }
      });

      client.on("message", async (raw) => {
        try {
          const data = JSON.parse(raw.toString());

          if (data.type === "audio" && data.data) {
            session.sendRealtimeInput({
              audio: {
                data: data.data,
                mimeType: "audio/pcm;rate=16000"
              }
            });
          }

          if (data.type === "text" && data.text) {
            session.sendRealtimeInput({ text: data.text });
          }
        } catch (error) {
          console.error("Live input error:", error.message);
        }
      });

      client.on("close", () => {
        try {
          session?.close();
        } catch {}
      });

    } catch (error) {
      console.error("Live connection failed:", error.message);

      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "error",
          message: error.message
        }));
        client.close();
      }
    }
  });
}

module.exports = attachLive;
