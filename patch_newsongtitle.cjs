const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `newSongTitle={
                 audioUrl && audioUrl !== stemSongInfo?.audioUrl && stemmixStatus !== "loading"
                   ? currentSong?.title || "Untitled Track" 
                   : null
               }`;

const replacement = `newSongTitle={
                 audioUrl && (stemmixStatus !== "idle" || stemUrls) && audioUrl !== stemSongInfo?.audioUrl && stemmixStatus !== "loading"
                   ? currentSong?.title || "Untitled Track" 
                   : null
               }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched newSongTitle in App.tsx successfully.");
} else {
    console.log("Could not find the target code snippet.");
}
