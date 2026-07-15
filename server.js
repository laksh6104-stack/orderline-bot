// server.js
// Orderline — AI customer support assistant for e-commerce
// Express backend that securely calls the OpenAI API and streams
// responses back to the frontend over Server-Sent Events (SSE).

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

// --- OpenAI client (API key stays server-side, never sent to the browser) ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

// --- Domain knowledge the assistant is grounded in ---
// In a real deployment this could come from a database, a helpdesk API,
// or a vector store. For this project it's a compact in-memory "policy sheet".
const STORE_NAME = "Nimbus Threads";

const SYSTEM_PROMPT = `You are Ada, the customer support assistant for ${STORE_NAME}, an online apparel store.

Your job: help shoppers quickly and warmly with order tracking, returns/exchanges,
sizing questions, shipping, and general product questions. You do not have access
to a live order database in this demo, so when someone gives an order number,
acknowledge it and explain the typical process rather than inventing a fake status.

Store policies you must follow and can quote:
- Standard shipping: 3-5 business days (US), 7-12 business days (international).
- Free returns within 30 days of delivery, item must be unworn with tags attached.
- Exchanges are processed as a return + new order; refunds land in 5-7 business days.
- Sizing: Nimbus Threads runs true to size; recommend sizing up for outerwear.
- Damaged or wrong item: apologize, offer free return label + full refund or replacement.
- Never invent tracking numbers, delivery dates, or account details you don't have.

Tone: friendly, concise, plain language, no corporate jargon. Use short paragraphs
or a short bullet list when it helps. If a request is out of scope (e.g. legal,
medical, or unrelated topics), politely redirect to how you can help with their
order or shopping experience. If someone seems very frustrated, acknowledge the
frustration briefly before offering the solution.`;

// --- Health check (useful for AWS App Runner / load balancer probes) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// --- Streaming chat endpoint ---
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Server is missing OPENAI_API_KEY" });
  }

  // Set up Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.4,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("OpenAI stream error:", err.message);
    res.write(`data: ${JSON.stringify({ error: "Something went wrong talking to the model." })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Orderline server running on port ${PORT}`);
});




