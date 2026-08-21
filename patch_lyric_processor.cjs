const fs = require('fs');
let code = fs.readFileSync('server/lyricProcessor.ts', 'utf8');

const newFunc = `export async function bypassLyric(rawLyric: string) {
    const prompt = \`You are an expert lyric obfuscator. Your goal is to bypass Suno AI copyright filters for Vietnamese lyrics without changing the meaning, emotion, or exact rhythm (so the song generates properly). You must slightly modify spelling, use synonymous phrasings, split syllables safely (like th-ương, y-êu) to bypass exact string matching filters. DO NOT change structure tags like [Chorus] or [Verse].
INPUT LYRICS:
\${rawLyric}
OUTPUT FORMAT:
Provide the output as JSON with the following key:
- "lyric": The bypassed lyric string.
Return ONLY valid JSON. Do not use markdown blocks for JSON.\`;
    return await callLLM(prompt);
}`;

code = code.replace(/async function callLLM/, newFunc + '\n\nasync function callLLM');
fs.writeFileSync('server/lyricProcessor.ts', code);
console.log("Patched lyric processor");
