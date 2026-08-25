const fs = require('fs');
let content = fs.readFileSync('server/lyricProcessor.ts', 'utf8');

// 1. Update the prompt to handle empty style/mood smarter
content = content.replace(
    'IF THE USER\'S STYLE/MOOD IS EMPTY, you MUST deeply analyze the meaning, emotion, and rhythm of the lyrics to infer the most fitting genre and mood. Do NOT guess randomly. Match the arrangement to the soul of the lyrics.',
    'IF THE USER\'S STYLE/MOOD IS EMPTY, you MUST deeply analyze the meaning, emotion, and rhythm of the lyrics to infer the most fitting genre and mood. Do NOT guess randomly. Match the arrangement to the soul of the lyrics. (e.g. if the lyric is sad, use sad cinematic instruments. if it is upbeat, use energetic elements).'
);

// If it hasn't been added yet, add the infer instruction directly since the previous replace might not have had that exact text
if (!content.includes('IF THE USER\'S STYLE/MOOD IS EMPTY')) {
    content = content.replace(
        '3. Keep the original lyrics completely intact (do not rewrite them, keep the exact original language).',
        `3. Keep the original lyrics completely intact (do not rewrite them, keep the exact original language).
4. IF THE USER\'S STYLE/MOOD IS EMPTY (no custom instruction), you MUST deeply analyze the meaning, emotion, and rhythm of the lyrics to infer the most fitting genre and mood. Do NOT guess randomly. Match the arrangement to the soul of the lyrics.`
    );
}

// 2. Add suggestLyricTags function
const newFunc = `
export async function suggestLyricTags(selectedText: string, instruction: string) {
    const prompt = \`You are an expert Suno AI Prompt Engineer and Music Producer.
The user has selected the following music tag/text from their arrangement prompt: "\${selectedText}"
The user wants to modify it with this instruction: "\${instruction}"

Your task is to generate 3 to 4 professional Suno AI tag options (in English, wrapped in square brackets) that fulfill the user's request.
For each option, provide a clear explanation in Vietnamese of what musical effect or vibe it creates.

OUTPUT FORMAT (JSON strictly):
{
   "options": [
      {
         "tag": "[heavy distorted electric guitar]",
         "explanation": "Tiếng guitar điện gầm gừ, méo tiếng nặng, tạo cảm giác mạnh mẽ và bùng nổ."
      },
      {
         "tag": "[distant echoing acoustic guitar]",
         "explanation": "Tiếng guitar thùng vang vọng từ xa, tạo không gian cô đơn, tĩnh lặng."
      }
   ]
}

Return ONLY valid JSON. Do not include markdown blocks or preamble.\`;
    return await callLLM(prompt);
}
`;

if (!content.includes('export async function suggestLyricTags')) {
    content += newFunc;
}

fs.writeFileSync('server/lyricProcessor.ts', content);
console.log('Patched server/lyricProcessor.ts');
