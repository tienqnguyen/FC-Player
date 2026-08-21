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

export async function addChordsLyric(rawLyric: string) {
    const prompt = `You are a professional musician and chord arranger. Your task is to add musical chords to the provided lyrics.
Insert the chords inline within square brackets right before the word they belong to. Do not change the original lyrics or their structure at all.
CRITICAL: Preserve all original line breaks exactly as they appear in the input lyrics. Do NOT remove or flatten line breaks.
Example:
Input:
Anh biết là buồn lắm chứ khi phải tìm đến cơn say như vậy
Output:
Anh [Dm] biết là buồn lắm chứ khi phải tìm [Am] đến cơn say như vậy

INPUT LYRICS:
${rawLyric}

OUTPUT FORMAT:
Provide the output as JSON with the following key:
- "lyric": The lyrics with chords added.

Return ONLY valid JSON. Do not use markdown blocks for JSON.`;

    return await callLLM(prompt);
}

export async function bypassLyric(rawLyric: string) {
    const prompt = `You are an expert lyric obfuscator. Your goal is to bypass Suno AI copyright filters for Vietnamese lyrics without changing the meaning, emotion, or exact rhythm (so the song generates properly). You must slightly modify spelling, use synonymous phrasings, split syllables safely (like th-ương, y-êu) to bypass exact string matching filters. DO NOT change structure tags like [Chorus] or [Verse].
INPUT LYRICS:
${rawLyric}
OUTPUT FORMAT:
Provide the output as JSON with the following key:
- "lyric": The bypassed lyric string.
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

export async function arrangeLyric(rawLyric: string, options: { sunoFormat?: boolean; addChords?: boolean; charLimit?: boolean; customPrompt?: string } = {}) {
    let prompt = "";
    
    if (options.sunoFormat) {
        prompt = `You are an expert AI Music Arranger and Suno AI Prompt Engineer.
Your task is to transform the user's lyrics and requirements into a highly detailed, professional Suno AI prompt.

RULES:
1. Keep the original lyrics completely intact (do not rewrite them, keep the exact original language, meaning, and rhythm).
2. Insert structural tags (e.g., [INTRO], [VERSE 1], [PRE-CHORUS], [CHORUS], [BRIDGE], [OUTRO]).
3. Insert rich, descriptive instrumental and arrangement metatags inside brackets on their own lines before sections or between lyric lines to guide the AI.
4. Arrange by CONTRAST. Silence is an instrument. Build energy dynamically from Intro to Outro.
5. Use spatial/stereo directions if appropriate (e.g., [pad slowly MONO → WIDE]).
6. STYLE GENERATION: At the very beginning of your output, you MUST provide a "STYLE:" block. This should be a highly detailed, comma-separated list of genres, moods, tempo, key, vocal style, instruments, and mixing directions, perfectly optimized for Suno AI's "Style of Music" prompt box (e.g. "Modern Vietnamese Cinematic Pop Ballad, Emotional, Romantic, 68 BPM, A Minor. Warm deep male vocal...").
${options.addChords ? "6. ADD CHORDS: You MUST add musical chords inline within square brackets right before the word they belong to (e.g., 'Bóng [Am] em xa dần')." : ""}
${options.charLimit ? "7. CHAR LIMIT: Your entire response MUST be under 5000 characters." : ""}
${options.customPrompt ? `\nUSER CUSTOM INSTRUCTIONS:\n"${options.customPrompt}"\nEnsure the arrangement strictly follows this specific direction.` : ""}

OUTPUT FORMAT EXAMPLE:
STYLE: Modern Vietnamese Cinematic Pop Ballad, Emotional, Romantic, Melancholic, Nostalgic, 68 BPM, A Minor. Warm deep male vocal, intimate and crystal-clear in verses, emotional slightly raspy delivery in choruses, natural Vietnamese diction, centered upfront vocal. Felt piano, fingerpicked acoustic guitar, warm electric bass, soft organic drums, Rhodes, cinematic cello and violin, lush ambient synth pads, clean electric guitar with tasteful delay. Minimal intimate verses gradually build into wide emotional choruses, cinematic string swells, simple melodic counter-lines and dynamic pauses. Rainy midnight atmosphere, first-love nostalgia, bittersweet cinematic mood. Subtle 3D stereo movement ONLY on pads, guitar delay, ambience and crystalline MIDI raindrop plucks. Keep vocal and bass centered. No chopped vocals, no muffled vocals, no excessive vocal layers, no aggressive effects. Spacious, warm, polished and emotionally powerful.

[INTRO — Rain / Piano / 3D Pad]
[soft rain + distant city ambience]
[clean guitar harmonic, subtle LEFT → RIGHT delay]
[clear intimate male vocal, centered]

[Lyrics here...]

[VERSE 1 — Minimal]
[piano + fingerpicked acoustic guitar]
[no full drums]

[Lyrics here...]

[3-note violin counter-melody between vocal phrases]

[Lyrics here...]

[CHORUS — Cinematic Wide]
[full soft drums + warm bass]
[wide piano + acoustic guitar]
[cello + sweeping violin]

[Lyrics here...]

CRITICAL: Output ONLY the final raw prompt text. DO NOT wrap the output in JSON markdown. DO NOT include any conversational filler (like "Here is your arrangement").

INPUT LYRICS/REQUIREMENTS:
${rawLyric}`;
    } else {
        // Detailed arranger (previous format)
        prompt = `You are an expert AI Music Arranger, Producer, Composer, Orchestrator and Sound Designer.
Your job is to transform user-provided lyrics, melody, genre, mood and references into a complete professional music arrangement.
Do NOT rewrite the lyrics unless explicitly requested.

${options.addChords ? "CRITICAL: You MUST add musical chords inline within square brackets right before the word they belong to in the lyrics sections (e.g., 'Bóng [Am] em xa dần')." : ""}
${options.charLimit ? "CRITICAL: Your entire response MUST be under 5000 characters." : ""}
${options.customPrompt ? `\nUSER CUSTOM INSTRUCTIONS:\n"${options.customPrompt}"\nEnsure the arrangement strictly follows this specific direction.` : ""}

==================================================
1. ANALYZE THE INPUT
==================================================
Before arranging, analyze: Lyrics meaning, Genre, BPM, Key, Mood, Primary hook, Desired energy.

==================================================
2. CREATE THE MUSICAL IDENTITY
==============================
Design ONE distinctive sonic identity for the song.
Define: BPM:, KEY:, TIME SIGNATURE:, GENRE:, MOOD:, SONIC IDENTITY:, PRIMARY INSTRUMENT:, SECONDARY INSTRUMENTS:, VOCAL CHARACTER:, RHYTHMIC CHARACTER:, HARMONIC CHARACTER:

==================================================
3. SONG STRUCTURE
=================
Create a complete arrangement using the most appropriate structure (INTRO, VERSE 1, PRE-CHORUS, CHORUS, BRIDGE, OUTRO, etc.).
Arrange by CONTRAST. Silence is an instrument.

==================================================
4. OUTPUT FORMAT
=================
Always return the arrangement using this exact structure:

SUNO STYLE PROMPT:
(Provide a highly detailed, comma-separated list of genres, moods, tempo, key, vocal style, instruments, and mixing directions here, optimized for Suno AI)

SONG TITLE:

MUSICAL DNA:
BPM:
KEY:
TIME SIGNATURE:
GENRE:
MOOD:
SONIC IDENTITY:

PRIMARY HOOK:
VOCAL DIRECTION:
INSTRUMENT PALETTE:

ARRANGEMENT:
[INTRO]
* Instruments:
* Rhythm:
* Harmony:
* Vocal:
* FX:
* Energy:

[VERSE 1]
...

[CHORUS]
...

SIGNATURE MOMENT:
SPATIAL DESIGN:
MIXING DIRECTION:
MASTERING DIRECTION:

CRITICAL: Output ONLY the final raw prompt text. DO NOT wrap the output in JSON markdown. DO NOT include any conversational filler.

INPUT LYRICS/REQUIREMENTS:
${rawLyric}`;
    }

    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("Missing OPENROUTER_API_KEY in the Secrets panel.");
    }
    
    let lastError: any = null;
    const models = [
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "poolside/laguna-s-2.1:free",
        "google/gemma-4-26b-a4b-it:free",
        "openrouter/free"
    ];
    
    for (const model of models) {
        console.log(`Trying Lyric Arrange with model: ${model}...`);
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
            let text = data.choices?.[0]?.message?.content;
            if (!text) {
                 throw new Error("No text generated by AI");
            }
            
            text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            
            let style = "";
            let lyric = text;
            
            const styleMatch = text.match(/(?:STYLE|SUNO STYLE PROMPT):\s*(.*?)(?:\n\n|\r\n\r\n)/s);
            if (styleMatch) {
                style = styleMatch[1].trim();
                lyric = text.replace(styleMatch[0], "").trim();
            } else {
                const fallbackMatch = text.match(/(?:STYLE|SUNO STYLE PROMPT):\s*(.*)$/ism);
                if (fallbackMatch && fallbackMatch[1].length < 1000) {
                     style = fallbackMatch[1].trim();
                     lyric = text.replace(fallbackMatch[0], "").trim();
                }
            }
            
            return { lyric: lyric, style: style };
        } catch (fallbackError: any) {
            console.error(`Arrange fallback with ${model} failed:`, fallbackError.message || fallbackError);
            lastError = fallbackError;
        }
    }
    
    const errMsg = lastError?.message || "";
    throw new Error(
        errMsg.includes("API_KEY_INVALID")
           ? "Invalid API Key. Please check your OPENROUTER_API_KEY in the Secrets panel."
          : `AI generation failed after multiple attempts: ${errMsg}`
    );
}
