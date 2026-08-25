const fs = require('fs');
const content = fs.readFileSync('server/lyricProcessor.ts', 'utf8');

const updatedContent = content.replace(
    'export async function arrangeLyric(rawLyric: string, options: { sunoFormat?: boolean; addChords?: boolean; charLimit?: boolean; customPrompt?: string } = {}) {',
    `export async function arrangeLyric(rawLyric: string, options: { sunoFormat?: boolean; addChords?: boolean; charLimit?: boolean; customPrompt?: string; proFormat?: boolean } = {}) {`
).replace(
    'if (options.sunoFormat) {',
    `if (options.proFormat) {
        prompt = \`You are an expert AI Music Arranger and Suno AI Prompt Engineer.
Your task is to transform the user's raw lyrics and style requests into a highly detailed, cinematic arrangement prompt.

CRITICAL RULES:
1. ONLY USE SQUARE BRACKETS [\\] for all musical, atmospheric, vocal, and mix directions. DO NOT use parentheses (). DO NOT use normal descriptive text outside of lyrics and brackets.
2. Structure the song perfectly, placing blocks of descriptive tags before each lyric section.
3. Keep the original lyrics completely intact (do not rewrite them, keep the exact original language).
4. Be highly descriptive about the atmosphere, the vocal delivery (e.g. [low baritone, slightly raspy], [deep male choir]), the specific instruments playing (e.g. [dark piano + Rhodes + deep 808]), and spatial/mix effects (e.g. [long tape echo drifting across stereo]).
5. DO NOT output ANY conversational filler. DO NOT output a preamble. ONLY output the raw structured text.
\${options.customPrompt ? \`\\nUSER CUSTOM INSTRUCTIONS:\\n"\${options.customPrompt}"\\nEnsure the arrangement strictly follows this specific direction.\` : ""}

OUTPUT FORMAT EXAMPLE:

[Intro]
[Hong Kong cinematic night atmosphere]
[deep dark piano, distant city ambience, soft vinyl texture]
[low male wordless vocal: “Ooooooh…”]
[breathy “Aaaaaah…” background choir]
[wide 8D stereo movement]

[Verse 1]
[deep Hong Kong gangster-style male vocal]
[low baritone, slightly raspy and smoky]
[cool restrained delivery, mature and worldly]
[dark piano + Rhodes + deep 808]
[distant electric guitar echoes]

Đến một mình, đi một mình, như mây bay ngang trời xanh.
Thế gian rộng, đời người ngắn, có chi đâu để mong manh.

[Chorus]
[Hong Kong cinematic anthem]
[wide atmospheric synths]
[electric violin soaring]
[cinematic strings]
[vocal becomes stronger, still low and masculine]

Tự mình chọn lấy một con đường, tự mình chống đỡ những cơn mưa!
Một mình đối diện với giông bão, chẳng cần ai đón hay đưa.

[Electric Guitar Solo]
[Hong Kong movie soundtrack inspired electric guitar]
[clean electric guitar with warm overdrive]
[slow emotional bends]

INPUT LYRICS/REQUIREMENTS:
\${rawLyric}\`;
    } else if (options.sunoFormat) {`
);

fs.writeFileSync('server/lyricProcessor.ts', updatedContent);
console.log('Patched server/lyricProcessor.ts');
