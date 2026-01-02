import OpenAI from "openai";

// Initialize OpenAI using Vercel environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { concern } = req.body;

    if (!concern || typeof concern !== "string") {
      return res.status(400).json({ error: "Patient concern is required." });
    }

    const prompt = `
You are a healthcare education assistant.

A user describes a health concern. Respond with EDUCATIONAL guidance only.
Do NOT diagnose or prescribe.

Return a VALID JSON object using this structure:

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
  "disclaimer": "This information is educational and not medical advice."
}

Include these perspectives:
- Conventional (Western) Medicine
- Integrative Medicine
- Lifestyle Medicine
- Behavioral / Mind-Body Approaches

Rules:
- Respond with JSON ONLY.
- No markdown.
- No explanations outside JSON.
- Evidence scores must be between 0–100.
- Use cautious educational language.

Patient concern:
"${concern}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a healthcare education assistant that ALWAYS returns valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const content = response.choices[0].message.content;

    let parsedGuidance;

    try {
      parsedGuidance = JSON.parse(content);
    } catch (err) {
      console.error("JSON parse failed. Raw response:", content);

      // Guaranteed fallback so app is NEVER empty
      parsedGuidance = {
        "General Guidance": {
          overview:
            "Your concern was received, but the response could not be structured perfectly. Below is general educational guidance that may still be helpful.",
          specific_options: {
            practices: [
              {
                name: "Consult a qualified healthcare professional",
                notes:
                  "A licensed professional can help evaluate symptoms and provide personalized guidance.",
                evidence_score: 90,
                safety_notes:
                  "Seek urgent care if symptoms are severe, worsening, or involve safety concerns.",
              },
            ],
          },
        },
        disclaimer: "This information is educational and not medical advice.",
      };
    }

    return res.status(200).json({
      concern,
      guidance: parsedGuidance,
    });
  } catch (error) {
    console.error("Guidance API error:", error);
    return res.status(500).json({
      error: "Failed to generate guidance.",
    });
  }
}

