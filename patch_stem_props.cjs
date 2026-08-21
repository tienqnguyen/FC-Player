const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<StemStudio 
               originalAudioUrl={stemSongInfo?.audioUrl || stemSongInfo?.url || currentSong?.audioUrl || currentSong?.url || audioUrl}
               stemUrls={stemUrls} 
               songTitle={stemSongInfo?.title || currentSong?.title || "Untitled Track"}
               coverUrl={stemSongInfo?.cover || currentSong?.cover}
               originalDuration={stemSongInfo?.duration || duration || 0}`;

const replacement = `<StemStudio 
               originalAudioUrl={((stemmixStatus !== "idle" || stemUrls) ? (stemSongInfo?.audioUrl || stemSongInfo?.url) : null) || currentSong?.audioUrl || currentSong?.url || audioUrl}
               stemUrls={stemUrls} 
               songTitle={((stemmixStatus !== "idle" || stemUrls) ? stemSongInfo?.title : null) || currentSong?.title || "Untitled Track"}
               coverUrl={((stemmixStatus !== "idle" || stemUrls) ? stemSongInfo?.cover : null) || currentSong?.cover}
               originalDuration={((stemmixStatus !== "idle" || stemUrls) ? stemSongInfo?.duration : null) || duration || 0}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched StemStudio props in App.tsx successfully.");
} else {
    console.log("Could not find the target code snippet.");
}
