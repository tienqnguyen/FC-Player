const fs = require('fs');
let code = fs.readFileSync('server/lyricProcessor.ts', 'utf8');

const targetFunctionStart = `export async function arrangeLyric(rawLyric: string) {`;

if (code.includes(targetFunctionStart)) {
    const beforeFunction = code.substring(0, code.indexOf(targetFunctionStart));
    
    const newFunction = `export async function arrangeLyric(rawLyric: string, options: { sunoFormat?: boolean; addChords?: boolean } = {}) {
    let prompt = "";
    
    if (options.sunoFormat) {
        prompt = \`You are an expert AI Music Arranger and Suno AI Prompt Engineer.
Your task is to transform the user's lyrics and requirements into a highly detailed, professional Suno AI prompt.

RULES:
1. Keep the original lyrics completely intact (do not rewrite them, keep the exact original language, meaning, and rhythm).
2. Insert structural tags (e.g., [INTRO], [VERSE 1], [PRE-CHORUS], [CHORUS], [BRIDGE], [OUTRO]).
3. Insert rich, descriptive instrumental and arrangement metatags inside brackets on their own lines before sections or between lyric lines to guide the AI.
4. Arrange by CONTRAST. Silence is an instrument. Build energy dynamically from Intro to Outro.
5. Use spatial/stereo directions if appropriate (e.g., [pad slowly MONO → WIDE]).
\${options.addChords ? "6. ADD CHORDS: You MUST add musical chords inline within square brackets right before the word they belong to (e.g., 'Bóng [Am] em xa dần')." : ""}

OUTPUT FORMAT EXAMPLE:
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
\${rawLyric}\`;
    } else {
        // Detailed arranger (previous format)
        prompt = \`You are an expert AI Music Arranger, Producer, Composer, Orchestrator and Sound Designer.
Your job is to transform user-provided lyrics, melody, genre, mood and references into a complete professional music arrangement.
Do NOT rewrite the lyrics unless explicitly requested.

\${options.addChords ? "CRITICAL: You MUST add musical chords inline within square brackets right before the word they belong to in the lyrics sections (e.g., 'Bóng [Am] em xa dần')." : ""}

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
\${rawLyric}\`;
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
        console.log(\`Trying Lyric Arrange with model: \${model}...\`);
        try {
            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": \`Bearer \${process.env.OPENROUTER_API_KEY}\`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }]
                })
            });
            
            if (!orRes.ok) {
                throw new Error(\`OpenRouter API error: \${orRes.status}\`);
            }
            
            const data = await orRes.json();
            let text = data.choices?.[0]?.message?.content;
            if (!text) {
                 throw new Error("No text generated by AI");
            }
            
            text = text.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
            return { lyric: text };
        } catch (fallbackError: any) {
            console.error(\`Arrange fallback with \${model} failed:\`, fallbackError.message || fallbackError);
            lastError = fallbackError;
        }
    }
    
    const errMsg = lastError?.message || "";
    throw new Error(
        errMsg.includes("API_KEY_INVALID")
           ? "Invalid API Key. Please check your OPENROUTER_API_KEY in the Secrets panel."
          : \`AI generation failed after multiple attempts: \${errMsg}\`
    );
}
`;
    
    fs.writeFileSync('server/lyricProcessor.ts', beforeFunction + newFunction);
    console.log("Patched server/lyricProcessor.ts successfully.");
} else {
    console.log("Function arrangeLyric not found!");
}
