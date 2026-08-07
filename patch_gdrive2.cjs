const fs = require('fs');
let content = fs.readFileSync('src/components/GoogleDriveAlbum.tsx', 'utf-8');

const oldEffect = `  useEffect(() => {
    // Fetch counts for folders that don't have it, one by one to avoid rate limits
    const fetchCounts = async () => {
      let updated = false;
      let newFolders = [...folders];
      
      for (let i = 0; i < newFolders.length; i++) {
        if (newFolders[i].songCount === undefined) {
          try {
            if (newFolders[i].id === "DIRECT_FILES") {
              newFolders[i] = { ...newFolders[i], songCount: predefinedFiles.length };
              updated = true;
              continue;
            }
            const res = await fetch(\`/api/gdrive/files?folderId=\${newFolders[i].id}\`);
            if (res.ok) {
              const data = await res.json();
              const validSongs = (data.files || []).filter((f: any) => 
                f.mimeType.startsWith("audio/") || f.name.endsWith(".mp3") || f.name.endsWith(".wav") || f.name.endsWith(".flac") || f.name.endsWith(".m4a")
              );
              newFolders[i] = { ...newFolders[i], songCount: validSongs.length };
              updated = true;
            }
          } catch (e) {
            // Ignore errors, we'll try again next time
          }
          
          // Small delay to avoid hammering the API
          await new Promise(r => setTimeout(r, 200));
        }
      }
      
      if (updated) {
        setFolders(newFolders);
      }
    };
    
    fetchCounts();
  }, [folders.length]); // only run when folders length changes, or initial`;

const newEffect = `  useEffect(() => {
    let isCancelled = false;
    const fetchCounts = async () => {
      // Find folders that need counts
      // We don't want to loop over all of them if they already have counts.
      const toFetch = folders.filter(f => f.songCount === undefined);
      if (toFetch.length === 0) return;
      
      for (const folder of toFetch) {
        if (isCancelled) break;
        
        let count = 0;
        try {
          if (folder.id === "DIRECT_FILES") {
            count = predefinedFiles.length;
          } else {
            const res = await fetch(\`/api/gdrive/files?folderId=\${folder.id}\`);
            if (res.ok) {
              const data = await res.json();
              const validSongs = (data.files || []).filter((f: any) => 
                f.mimeType.startsWith("audio/") || f.name.endsWith(".mp3") || f.name.endsWith(".wav") || f.name.endsWith(".flac") || f.name.endsWith(".m4a")
              );
              count = validSongs.length;
            } else {
              continue; // Skip updating on error
            }
          }
          
          if (!isCancelled) {
            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, songCount: count } : f));
          }
        } catch (e) {
          // Ignore
        }
        await new Promise(r => setTimeout(r, 200));
      }
    };
    
    fetchCounts();
    return () => {
      isCancelled = true;
    };
  }, [folders.length]);`;

if (content.includes(oldEffect)) {
  content = content.replace(oldEffect, newEffect);
  fs.writeFileSync('src/components/GoogleDriveAlbum.tsx', content);
  console.log("Patched correctly");
} else {
  console.log("Could not find old effect to replace");
}
