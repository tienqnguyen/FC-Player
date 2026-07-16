import { GoogleGenAI } from "@google/genai";

export async function formatLyric(rawLyric: string, styleRequest?: string) {
    const prompt = `You are a world-class prompt engineer for SUNO AI. Your goal is to transform lyrics and style requests into the most effective musical prompt possible.

PRIORITY:
- Maintain the lyrics' emotional soul.
- Use the provided style parameters as a production guide.
- If a parameter is "AI Auto-detect", analyze the lyrics to determine the most fitting musical choice.

INPUT:
Style parameters: ${styleRequest || "AI Auto-detect"}
Lyrics:
${rawLyric}

OUTPUT FORMAT:
Provide the output as JSON with the following keys:
- "style": This is for Suno's "Style of Music" box (max ~120 chars). It should be a concise list of genres, vocal descriptions, mood, tempo, and instruments. Format: [Genre], [Vocal], [Atmosphere], [Tempo], [Instruments].
- "tags": 5-8 short metadata keywords as an array of strings.
- "prompt": The lyrics with structural tags like [Intro], [Verse], [Chorus], [Bridge], [Outro]. Add descriptive musical cues INSIDE the tags, e.g., [Verse 1: Soft piano, breathy vocals]. Ensure a logical flow from Intro to Outro.

Return ONLY valid JSON. Do not use markdown blocks for JSON, just output raw JSON text or parseable JSON.`;

    return await callLLM(prompt);
}

export async function improveLyric(rawLyric: string, percentage: number = 3) {
    const prompt = `You are an expert songwriter. Your task is to slightly improve the provided lyrics.
Change roughly ${percentage}% of the original lyrics. Fix awkward phrasing, improve rhythm or rhyme slightly, but keep the original meaning and structure largely identical.
CRITICAL: Preserve all original line breaks exactly as they appear in the input lyrics. Do NOT remove or flatten line breaks.

INPUT LYRICS:
${rawLyric}

OUTPUT FORMAT:
Provide the output as JSON with the following key:
- "lyric": The improved lyric string.

Return ONLY valid JSON. Do not use markdown blocks for JSON.`;

    return await callLLM(prompt);
}

async function callLLM(prompt: string) {
    if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
        throw new Error("Missing API Key. Please add GEMINI_API_KEY or OPENROUTER_API_KEY in the Secrets panel.");
    }
    
    let lastError: any = null;

    try {
        if (process.env.GEMINI_API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });
            const text = response.text;
            return JSON.parse(text);
        }
    } catch (e: any) {
        console.error("Gemini direct call failed:", e.message || e);
        lastError = e;
    }

    if (process.env.OPENROUTER_API_KEY) {
        const models = [
            "google/gemini-2.5-flash",
            "tencent/hy3:free",
            "deepseek/deepseek-v4-flash",
            "nvidia/nemotron-3-ultra-550b-a55b:free",
            "openrouter/free"
        ];
        
        for (const model of models) {
            console.log(`Trying OpenRouter fallback with model: ${model}...`);
            try {
                const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: prompt }]
                    })
                });
                
                if (!orRes.ok) {
                    throw new Error(`OpenRouter API error: ${orRes.status}`);
                }
                
                const data = await orRes.json();
                const text = data.choices?.[0]?.message?.content || "{}";
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '');
                return JSON.parse(cleanText);
            } catch (fallbackError: any) {
                console.error(`OpenRouter fallback with ${model} failed:`, fallbackError.message || fallbackError);
                lastError = fallbackError;
            }
        }
    }
    
    const errMsg = lastError?.message || "";
    throw new Error(
        errMsg.includes("API_KEY_INVALID") 
          ? "Invalid API Key. Please check your API keys in the Secrets panel."
          : `AI generation failed after multiple attempts: ${errMsg}`
    );
}
