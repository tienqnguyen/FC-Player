const fs = require('fs');

let content = fs.readFileSync('src/components/GoogleDriveAlbum.tsx', 'utf-8');

// 1. Add songCount to GDriveFolder
content = content.replace(
  `export interface GDriveFolder {\n  id: string;\n  name: string;\n}`,
  `export interface GDriveFolder {\n  id: string;\n  name: string;\n  songCount?: number;\n}`
);

// 2. Add useEffect to fetch counts
// We need to insert this after `const [isLoadingSongs, setIsLoadingSongs] = useState(false);`
const useEffectToInsert = `
  useEffect(() => {
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
  }, [folders.length]); // only run when folders length changes, or initial
`;

content = content.replace(
  `const [isLoadingSongs, setIsLoadingSongs] = useState(false);`,
  `const [isLoadingSongs, setIsLoadingSongs] = useState(false);\n${useEffectToInsert}`
);

// 3. Hide empty folders and sort by count
// We replace `folders.map((folder) => (` with:
const displayFoldersReplacement = `
              {folders
                .filter(f => f.songCount === undefined || f.songCount > 0)
                .sort((a, b) => (b.songCount || 0) - (a.songCount || 0))
                .map((folder) => (
`;

content = content.replace(
  `              {folders.map((folder) => (`,
  displayFoldersReplacement
);

// 4. Show count
content = content.replace(
  `<span className="text-[11px] font-medium truncate flex-1" title={folder.name}>\n                    {folder.name}\n                  </span>`,
  `<div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                    <span className="text-[11px] font-medium truncate" title={folder.name}>
                      {folder.name}
                    </span>
                    {folder.songCount !== undefined && (
                      <span className="text-[9px] text-white/40">{folder.songCount} {folder.songCount === 1 ? 'song' : 'songs'}</span>
                    )}
                  </div>`
);

fs.writeFileSync('src/components/GoogleDriveAlbum.tsx', content);
