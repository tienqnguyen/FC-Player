const fs = require('fs');
let code = fs.readFileSync('server/lyricProcessor.ts', 'utf8');

const targetFunctionStart = `export async function arrangeLyric(rawLyric: string, options: { sunoFormat?: boolean; addChords?: boolean } = {}) {`;
const newFunctionStart = `export async function arrangeLyric(rawLyric: string, options: { sunoFormat?: boolean; addChords?: boolean; charLimit?: boolean; customPrompt?: string } = {}) {`;

code = code.replace(targetFunctionStart, newFunctionStart);

const oldPromptSuno = `\${options.addChords ? "6. ADD CHORDS: You MUST add musical chords inline within square brackets right before the word they belong to (e.g., 'Bóng [Am] em xa dần')." : ""}`;
const newPromptSuno = `\${options.addChords ? "6. ADD CHORDS: You MUST add musical chords inline within square brackets right before the word they belong to (e.g., 'Bóng [Am] em xa dần')." : ""}
\${options.charLimit ? "7. CHAR LIMIT: Your entire response MUST be under 5000 characters." : ""}
\${options.customPrompt ? \`\\nUSER CUSTOM INSTRUCTIONS:\\n"\${options.customPrompt}"\\nEnsure the arrangement strictly follows this specific direction.\` : ""}`;

code = code.replace(oldPromptSuno, newPromptSuno);

const oldPromptOther = `\${options.addChords ? "CRITICAL: You MUST add musical chords inline within square brackets right before the word they belong to in the lyrics sections (e.g., 'Bóng [Am] em xa dần')." : ""}`;
const newPromptOther = `\${options.addChords ? "CRITICAL: You MUST add musical chords inline within square brackets right before the word they belong to in the lyrics sections (e.g., 'Bóng [Am] em xa dần')." : ""}
\${options.charLimit ? "CRITICAL: Your entire response MUST be under 5000 characters." : ""}
\${options.customPrompt ? \`\\nUSER CUSTOM INSTRUCTIONS:\\n"\${options.customPrompt}"\\nEnsure the arrangement strictly follows this specific direction.\` : ""}`;

code = code.replace(oldPromptOther, newPromptOther);

fs.writeFileSync('server/lyricProcessor.ts', code);
console.log("Patched server/lyricProcessor.ts successfully.");
