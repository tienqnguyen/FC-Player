const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const functionsCode = `  const handleSkipFailedSong = (forceFailsCount = null) => {
    setConsecutiveFailures(prev => {
      const newFails = forceFailsCount !== null ? forceFailsCount : prev + 1;
      if (newFails >= 3) {
        setTiktokError(\`Playback failed \${newFails} times in a row. Auto-play stopped. Please click again to continue.\`);
        setIsPlaying(false);
        // Do not clear the audioUrl here, just pause the auto-play loop
        return newFails;
      }
      
      setTiktokError(\`Failed to play audio source. Skipping...\`);
      setIsPlaying(false);
      setDuration(0);
      setAudioUrl("");
      
      if (currentSong) {
        setRecentSongs(curr => curr.filter(s => s.id !== currentSong.id));
        setTimeout(() => handleNextSong(true), 500);
      }
      
      return newFails;
    });
  };

  const refetchCurrentSong = async (prevFails) => {
    if (!currentSong || !currentSong.originalUrl || currentSong.hasRetried) {
      handleSkipFailedSong(prevFails + 1);
      return;
    }
    
    console.log("Audio failed to play, attempting to refetch original link...");
    
    // Mark as retried in the list to prevent infinite loops
    setRecentSongs(curr => curr.map(s => s.id === currentSong.id ? { ...s, hasRetried: true } : s));
    const updatedSong = { ...currentSong, hasRetried: true };
    setCurrentSong(updatedSong);
    
    setTiktokError("Link expired, refetching fresh audio...");
    
    try {
      const res = await fetch(\`/api/metadata?url=\${encodeURIComponent(currentSong.originalUrl)}\`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to refetch");
      }
      
      const streamUrl = \`/api/stream?url=\${encodeURIComponent(currentSong.originalUrl)}\`;
      updatedSong.audioUrl = streamUrl;
      updatedSong.videoUrl = streamUrl;
      
      setRecentSongs(curr => curr.map(s => s.id === currentSong.id ? updatedSong : s));
      setCurrentSong(updatedSong);
      setAudioUrl(streamUrl);
      shouldAutoPlayRef.current = true;
      setTiktokError("");
    } catch (err) {
      console.warn("Refetch failed:", err);
      handleSkipFailedSong(prevFails + 1);
    }
  };

  const togglePlay`;

code = code.replace("  const togglePlay", functionsCode);


const oldOnError = `          onError={(e) => {
            const err = (e.target as HTMLAudioElement).error;
            if (err) {
              console.warn("Audio element error event:", err.code, err.message);
              // Ignore MEDIA_ERR_ABORTED (code 1) or when audio is intentionally cleared
              if (err.code === 1 || !audioUrl) {
                return;
              }
              
              setConsecutiveFailures(prev => {
                const newFails = prev + 1;
                if (newFails >= 3) {
                  setTiktokError(\`Playback failed \${newFails} times in a row. Auto-play stopped. Please click again to continue.\`);
                  setIsPlaying(false);
                  // Do not clear the audioUrl here, just pause the auto-play loop
                  return newFails;
                }
                
                setTiktokError(\`Failed to play audio source. Skipping...\`);
                setIsPlaying(false);
                setDuration(0);
                setAudioUrl("");
                
                if (currentSong) {
                  setRecentSongs(curr => curr.filter(s => s.id !== currentSong.id));
                  setTimeout(() => handleNextSong(true), 500);
                }
                
                return newFails;
              });
            }
          }}`;

const newOnError = `          onError={(e) => {
            const err = (e.target as HTMLAudioElement).error;
            if (err) {
              console.warn("Audio element error event:", err.code, err.message);
              // Ignore MEDIA_ERR_ABORTED (code 1) or when audio is intentionally cleared
              if (err.code === 1 || !audioUrl) {
                return;
              }
              
              // Instead of skipping immediately, try to refetch once!
              setConsecutiveFailures(prev => {
                if (currentSong && currentSong.originalUrl && (currentSong.originalUrl.includes("tiktok.com") || currentSong.originalUrl.includes("nhaccuatui") || currentSong.originalUrl.includes("youtube")) && !currentSong.hasRetried) {
                  // Wait! Don't increment failure yet, trigger refetch!
                  setTimeout(() => refetchCurrentSong(prev), 0);
                  return prev; // keep the same fail count while retrying
                } else {
                  // We already retried or it's not refetchable
                  const newFails = prev + 1;
                  if (newFails >= 3) {
                    setTiktokError(\`Playback failed \${newFails} times in a row. Auto-play stopped. Please click a track to continue.\`);
                    setIsPlaying(false);
                    return newFails;
                  }
                  
                  setTiktokError(\`Failed to play audio source. Skipping...\`);
                  setIsPlaying(false);
                  setDuration(0);
                  setAudioUrl("");
                  
                  if (currentSong) {
                    setRecentSongs(curr => curr.filter(s => s.id !== currentSong.id));
                    setTimeout(() => handleNextSong(true), 500);
                  }
                  
                  return newFails;
                }
              });
            }
          }}`;

if (code.includes(oldOnError)) {
    code = code.replace(oldOnError, newOnError);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched App.tsx successfully.");
} else {
    console.log("Could not find the old onError block!");
}
