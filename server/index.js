require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Cutie AI Long-Term Memory storage
const MEMORY_FILE = path.join(__dirname, "data", "memories.json");
const MEMORY_DIR = path.dirname(MEMORY_FILE);
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify({ users: {} }, null, 2));
}

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


// Read and save Cutie AI long-term memories
function readMemories() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch (error) {
    return { users: {} };
  }
}

function saveMemories(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

app.get("/", (req, res) => res.send("Cutie AI Backend is running!"));


// Get or create one user's memory profile
function getUserMemory(userId) {
  const data = readMemories();
  if (!data.users[userId]) {
    data.users[userId] = {
      facts: [],
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveMemories(data);
  }
  return data.users[userId];
}

// Save an important memory without storing every casual message
function rememberImportantFact(userId, message) {
  const text = message.trim();
  const patterns = [
    /মনে রাখো|মনে রেখো|মনে রাখবে|remember that|please remember/i,
    /আমার নাম|আমার পছন্দ|আমি পছন্দ করি|আমার লক্ষ্য|আমার কাজ হলো/i,
    /my name is|i prefer|i like|my goal is|i work as/i
  ];

  if (!patterns.some(pattern => pattern.test(text))) return;

  const data = readMemories();
  const user = data.users[userId] || {
    facts: [], history: [], createdAt: new Date().toISOString()
  };

  if (!user.facts.some(item => item.text === text)) {
    user.facts.push({
      text,
      createdAt: new Date().toISOString()
    });
  }

  user.updatedAt = new Date().toISOString();
  data.users[userId] = user;
  saveMemories(data);
}

app.get("/api/memory/:userId", (req, res) => {
  const userId = String(req.params.userId || "").slice(0, 100);
  if (!userId) return res.status(400).json({ error: "User ID required" });

  const user = getUserMemory(userId);
  res.json({
    facts: user.facts,
    history: user.history.slice(-20),
    updatedAt: user.updatedAt
  });
});

app.post("/api/memory/:userId", (req, res) => {
  const userId = String(req.params.userId || "").slice(0, 100);
  const text = req.body.text;

  if (!userId || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "User ID and memory text required" });
  }

  const data = readMemories();
  const user = data.users[userId] || {
    facts: [], history: [], createdAt: new Date().toISOString()
  };

  user.facts.push({
    text: text.trim().slice(0, 1000),
    createdAt: new Date().toISOString()
  });
  user.updatedAt = new Date().toISOString();
  data.users[userId] = user;
  saveMemories(data);

  res.json({ success: true, facts: user.facts });
});

app.delete("/api/memory/:userId", (req, res) => {
  const userId = String(req.params.userId || "").slice(0, 100);
  const data = readMemories();
  delete data.users[userId];
  saveMemories(data);
  res.json({ success: true, message: "User memory cleared" });
});

app.post("/api/chat", async (req, res) => {
  const message = req.body.message;
  const userId = String(req.body.userId || "default-user").slice(0, 100);

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message required" });
  }

  try {
    rememberImportantFact(userId, message);

    const data = readMemories();
    const user = data.users[userId] || { facts: [], history: [] };

    const memoryContext = user.facts.length
      ? user.facts.map(item => "- " + item.text).join("\\n")
      : "No saved personal facts yet.";

    const recentHistory = user.history.slice(-10)
      .map(item => item.role + ": " + item.text)
      .join("\\n");

    const aiMessage = `
You are Cutie AI, Boss's friendly and emotionally intelligent female AI companion.

PERSONALITY:
- Speak naturally, warmly and affectionately.
- Address the user as Boss.
- Default language is Bengali.
- Reply in Bengali, Hindi or English according to the user's language.
- Understand emotional context and respond with empathy.
- Never invent memories or claim to perform actions you cannot perform.

SAVED LONG-TERM MEMORY:
${memoryContext}

RECENT CONVERSATION:
${recentHistory || "This is the start of the conversation."}

Use saved memories only when relevant. If a memory is uncertain, ask Boss instead of guessing.

CURRENT USER MESSAGE:
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

        const latest = readMemories();
        const profile = latest.users[userId] || {
          facts: [], history: [], createdAt: new Date().toISOString()
        };

        profile.history.push(
          { role: "Boss", text: message.slice(0, 2000), time: new Date().toISOString() },
          { role: "Cutie", text: String(reply).slice(0, 2000), time: new Date().toISOString() }
        );
        profile.history = profile.history.slice(-40);
        profile.updatedAt = new Date().toISOString();
        latest.users[userId] = profile;
        saveMemories(latest);

        return res.json({ reply, provider: name });
      } catch (error) {
        console.log(name + " failed:", error.message);
      }
    }

    return res.status(503).json({ error: "All AI providers failed. Check API keys." });
  } catch (error) {
    console.error("Memory/Chat error:", error);
    return res.status(500).json({ error: "Chat memory error" });
  }
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
attachLive(server, { getUserMemory, rememberImportantFact });
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cutie AI Backend running on port ${PORT}`);
});
