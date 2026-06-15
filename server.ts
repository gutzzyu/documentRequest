import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Initialize server-side Google Gen AI securely
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route: AI resolution templates draft generator
  app.post("/api/ai/draft-resolution", async (req, res) => {
    try {
      const { requestType, purpose, description, notes } = req.body;
      if (!requestType || !purpose || !description) {
        return res.status(400).json({ error: "Missing required request parameters" });
      }

      const apiKeyRaw = process.env.GEMINI_API_KEY;
      if (!apiKeyRaw) {
        // Safe fallback in workspace offline draft mode
        return res.json({
          draft: `[AI SECRETARY LOCAL TEMPLATE]\n\nMEETING RESOLUTION OUTLINE:\n\nSubject Matter: ${purpose}\nFiling Category: ${requestType}\n\nRECITALS:\nWHEREAS, the delegation filed an executive ${requestType} detailing "${description}";\n\nWHEREAS, special instructions indicate: "${notes || "None"}";\n\nNow, therefore, be it RESOLVED, that the Board of Directors hereby approves the specified terms of engagement and empowers certified staff to finalize local corporate filing filings.\n\n(Configure GEMINI_API_KEY inside Settings > Secrets to unlock auto-generated high-fidelity legal board templates)`
        });
      }

      const prompt = `You are an elite corporate legal counsel and secretariat officer.
Draft a highly professional, formal corporate resolution template or secretary certificate based on the following filing details:

Filing Request Category: ${requestType}
Filing Title/Purpose: ${purpose}
Filing Brief/Details: ${description}
Special Signatories or Directives: ${notes || "None"}

Requirements:
1. Provide a formal Title (e.g., "BOARD RESOLUTION OF CLIENT DELEGATION").
2. Create standard structured recitals ("WHEREAS...").
3. Create actionable resolution clauses ("RESOLVED, that...").
4. Add clear signature lines, corporate seal brackets, and certification notes.
5. Do not write friendly conversational greetings or chat preambles. Output ONLY the formal document itself in neat clean monospace friendly wrapping.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ draft: response.text });
    } catch (err: any) {
      console.error("Gemini server error: ", err);
      res.status(500).json({ error: "Failed to generate AI legal draft. Please inspect key configurations." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
