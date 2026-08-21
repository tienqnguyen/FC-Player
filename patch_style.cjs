const fs = require('fs');
let code = fs.readFileSync('server/lyricProcessor.ts', 'utf8');

// Patch sunoFormat rules and example
const oldSunoRulesEnd = `5. Use spatial/stereo directions if appropriate (e.g., [pad slowly MONO → WIDE]).`;
const newSunoRulesEnd = `5. Use spatial/stereo directions if appropriate (e.g., [pad slowly MONO → WIDE]).
6. STYLE GENERATION: At the very beginning of your output, you MUST provide a "STYLE:" block. This should be a highly detailed, comma-separated list of genres, moods, tempo, key, vocal style, instruments, and mixing directions, perfectly optimized for Suno AI's "Style of Music" prompt box (e.g. "Modern Vietnamese Cinematic Pop Ballad, Emotional, Romantic, 68 BPM, A Minor. Warm deep male vocal...").`;
code = code.replace(oldSunoRulesEnd, newSunoRulesEnd);

// If the rule numberings get messed up it's fine, we append it
// Update OUTPUT FORMAT EXAMPLE:
const oldSunoOutputExample = `OUTPUT FORMAT EXAMPLE:
[INTRO — Rain / Piano / 3D Pad]`;
const newSunoOutputExample = `OUTPUT FORMAT EXAMPLE:
STYLE: Modern Vietnamese Cinematic Pop Ballad, Emotional, Romantic, Melancholic, Nostalgic, 68 BPM, A Minor. Warm deep male vocal, intimate and crystal-clear in verses, emotional slightly raspy delivery in choruses, natural Vietnamese diction, centered upfront vocal. Felt piano, fingerpicked acoustic guitar, warm electric bass, soft organic drums, Rhodes, cinematic cello and violin, lush ambient synth pads, clean electric guitar with tasteful delay. Minimal intimate verses gradually build into wide emotional choruses, cinematic string swells, simple melodic counter-lines and dynamic pauses. Rainy midnight atmosphere, first-love nostalgia, bittersweet cinematic mood. Subtle 3D stereo movement ONLY on pads, guitar delay, ambience and crystalline MIDI raindrop plucks. Keep vocal and bass centered. No chopped vocals, no muffled vocals, no excessive vocal layers, no aggressive effects. Spacious, warm, polished and emotionally powerful.

[INTRO — Rain / Piano / 3D Pad]`;
code = code.replace(oldSunoOutputExample, newSunoOutputExample);


// Patch other format (non-suno)
const oldOtherOutputExample = `Always return the arrangement using this exact structure:

SONG TITLE:`;

const newOtherOutputExample = `Always return the arrangement using this exact structure:

SUNO STYLE PROMPT:
(Provide a highly detailed, comma-separated list of genres, moods, tempo, key, vocal style, instruments, and mixing directions here, optimized for Suno AI)

SONG TITLE:`;
code = code.replace(oldOtherOutputExample, newOtherOutputExample);

fs.writeFileSync('server/lyricProcessor.ts', code);
console.log("Patched STYLE output.");
