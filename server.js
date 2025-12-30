require("dotenv").config();

const express = require("express");
const path = require("path");
const OpenAI = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone (not used yet)
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const app = express();
const PORT = 3000;

// Prevent caching during development
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Example health route
app.get("/api/health", (req, res) => {
  res.json({
    patientName: "John Doe",
    age: 43,
    status: "healthy",
    notes: "Example data only. No real patient data.",
  });
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server initialized correctly" });
});

// Guidance route with evidence scores, safety notes, and specificity
app.post("/api/guidance", async (req, res) => {
  try {
    const { concern } = req.body;

    if (!concern) {
      return res.status(400).json({ error: "Patient concern is required." });
    }

    const prompt = `
You are a healthcare education assistant.

A user describes a health concern. Respond with EDUCATIONAL guidance only. Do NOT diagnose or prescribe.

Return a VALID JSON object for EACH perspective with this structure:

{
  "Perspective Name": {
    "overview": "Text overview of this perspective.",
    "specific_options": {
      "supplements": [{"name":"", "notes":"", "evidence_score":0, "safety_notes":""}],
      "foods": [{"name":"", "notes":"", "evidence_score":0, "safety_notes":""}],
      "practices": [{"name":"", "notes":"", "evidence_score":0, "safety_notes":""}],
      "other_considerations": [{"name":"", "notes":"", "evidence_score":0, "safety_notes":""}]
    }
  },
  ...
}

Include these perspectives:
- Conventional (Western) Medicine
- Integrative Medicine
- Functional Medicine
- Traditional Chinese Medicine
- Ayurvedic Medicine
- Lifestyle Medicine
- Behavioral / Mind-Body Approaches
- Biohacking / Health Optimization
- Homeopathy
- Indigenous / Cultural Practices

Instructions:
- Include more specific guidance, including both common and rarer treatments with literature support.
- Give evidence_score from 0-100 reflecting how much positive scientific support exists.
- Include safety_notes for any potential cautions, contraindications, or commonly discussed warnings.
- For each supplement, food, or practice, provide brief notes, specific examples, and how it is applied if relevant (e.g., dosage, preparation, or method).
- Use cautious, educational language: "commonly discussed", "traditionally used", "some research suggests", "may be discussed with a healthcare professional".

Add a field at the end:
"disclaimer": "This information is educational and not medical advice."

Patient concern:
"${concern}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You provide structured, multi-perspective healthcare guidance with specificity, evidence scores, and safety notes.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    });

    const content = response.choices[0].message.content;

    let parsedGuidance;
    try {
      parsedGuidance = JSON.parse(content);
    } catch (err) {
      console.error("Error parsing JSON from OpenAI:", content);
      return res.status(500).json({ error: "Failed to parse guidance JSON." });
    }

    res.json({
      concern,
      guidance: parsedGuidance,
    });
  } catch (error) {
    console.error("Guidance error:", error);
    res.status(500).json({ error: "Failed to generate guidance." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});







