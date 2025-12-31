import OpenAI from "openai";

// Initialize OpenAI with your API key from Vercel environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
  }
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
- Give evidence_score from 0-100 reflecting positive scientific support.
- Include safety_notes for any cautions or contraindications.
- For each supplement, food, or practice, provide brief notes, examples, and how it is applied (e.g., dosage, preparation, method).
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

    res.status(200).json({ concern, guidance: parsedGuidance });
  } catch (error) {
    console.error("Guidance error:", error);
    res.status(500).json({ error: "Failed to generate guidance." });
  }
}
