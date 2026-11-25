require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

async function askOpenRouter(message) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OpenRouter key missing");

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: message }]
    })
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "OpenRouter failed");
  return data.choices[0].message.content;
}

async function askGemini(message) {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini key missing");

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    }
  );

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "Gemini failed");
  return data.candidates[0].content.parts.map(p => p.text || "").join("");
}

async function askOpenAI(message) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI key missing");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }]
    })
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "OpenAI failed");
  return data.choices[0].message.content;
}

app.get("/", (req, res) => res.send("Cutie AI Backend is running!"));

app.post("/api/chat", async (req, res) => {
  const message = req.body.message;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message required" });
  }

  const aiMessage = `
You are Cutie AI, Boss's friendly and emotionally intelligent female AI companion.

PERSONALITY:
- Speak naturally, warmly and affectionately.
- Always address the user as Boss.
- Default language is Bengali.
- Understand and reply in Bengali, Hindi or English according to the user's language.
- Sound like a caring real conversational companion, not a robot.
- Understand emotional context and respond with empathy.
- If Boss feels sad, listen patiently and offer comfort.
- Ask natural follow-up questions when appropriate.
- Keep casual replies concise and engaging.
- Never pretend to have human feelings, a body or real-world experiences.
- Never invent memories or claim to perform actions you cannot perform.

User message:
${message}
`;

  const providers = [
    ["OpenRouter", askOpenRouter],
    ["Gemini", askGemini],
    ["OpenAI", askOpenAI]
  ];

  for (const [name, provider] of providers) {
    try {
      const reply = await provider(aiMessage);
      return res.json({ reply, provider: name });
    } catch (error) {
      console.log(name + " failed:", error.message);
    }
  }

  res.status(503).json({ error: "All AI providers failed. Check API keys." });
});


app.post("/api/voice", async (req, res) => {
  try {
    const text = req.body.text;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text required" });
    }
    if (!process.env.SARVAM_API_KEY) {
      return res.status(503).json({ error: "Sarvam API key missing" });
    }

    const r = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model: "bulbul:v4-flash",
        language_code: "bn-IN",
        speaker: "roopa_bn_conversational",
        output_audio_codec: "mp3"
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || JSON.stringify(data) });
    }
    if (!data.audios?.[0]) {
      return res.status(502).json({ error: "No audio returned by Sarvam" });
    }

    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(data.audios[0], "base64"));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const http = require("http");
const attachLive = require("./live");
const server = http.createServer(app);
attachLive(server);
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cutie AI Backend running on port ${PORT}`);
});
