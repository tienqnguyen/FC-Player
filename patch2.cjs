const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// We need to replace the downloadAudio function and handleDownloadCurrentAudio function.
// Let's find their start and end points using regex, or just string replacement if careful.

content = content.replace(
/  const downloadAudio = async \(e: React\.MouseEvent, song: any\) => \{[\s\S]*?document\.body\.removeChild\(link\);\n  \};/,
`  const downloadAudio = async (e: React.MouseEvent | null, song: any) => {
    if (e) e.stopPropagation();
    let audioSrc = song.audioUrl || "";
    if (!audioSrc) return;

    const safeTitle = getSafeFilename(song.title);

    // Handle local files (blob URLs) directly
    if (audioSrc.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = audioSrc;
      link.download = \`\${safeTitle}.mp3\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    let targetUrl = song.originalUrl || audioSrc;
    if (!song.originalUrl && targetUrl && (targetUrl.startsWith("/api/proxy-stream") || targetUrl.includes("/api/proxy-stream") || targetUrl.startsWith("/api/stream") || targetUrl.includes("/api/stream"))) {
      try {
        const urlObj = new URL(targetUrl, window.location.origin);
        let extractedUrl = urlObj.searchParams.get("url");
        if (extractedUrl) targetUrl = extractedUrl;
      } catch (err) {}
    }
    
    const downloadUrl = \`/api/download?url=\${encodeURIComponent(targetUrl)}&title=\${encodeURIComponent(safeTitle)}\`;
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = safeTitle + ".mp3";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };`
);

content = content.replace(
/  const handleDownloadCurrentAudio = \(\) => \{[\s\S]*?document\.body\.removeChild\(a\);\n  \};/,
`  const handleDownloadCurrentAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentSong) return;
    downloadAudio(e as any, { 
       ...currentSong, 
       audioUrl: audioUrl || currentSong.audioUrl, 
       title: fileName || currentSong.title 
    });
  };`
);

fs.writeFileSync('src/App.tsx', content);
