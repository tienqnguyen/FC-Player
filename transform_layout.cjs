const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Change the Main Layout Container classes
const mainLayoutContainerOld = 'className={`w-full mx-auto flex relative z-20 ${          isCompact             ? "h-full max-h-[100dvh] overflow-hidden flex-col px-1 lg:px-4 pt-1 pb-1 flex-1"             : "max-w-[1200px] flex-1 overflow-hidden h-full pb-10 flex-row px-4 pt-2 gap-6"        }`';
const mainLayoutContainerNew = 'className={`w-full mx-auto flex relative z-20 ${          isCompact             ? "h-full max-h-[100dvh] overflow-hidden flex-col px-1 lg:px-4 pt-1 pb-1 flex-1"             : "max-w-[1400px] flex-1 overflow-hidden h-full pb-10 flex-row px-4 pt-2 gap-6 justify-center"        }`';
code = code.replace(mainLayoutContainerOld, mainLayoutContainerNew);

// 2. Change the Main Column (Column 1) classes
const mainColOld = 'className={`w-full max-w-screen-md mx-auto flex flex-col flex-1 ${!isCompact ? "overflow-y-auto custom-scrollbar pr-2" : "min-h-0"}`}';
const mainColNew = 'className={`w-full flex flex-col ${!isCompact ? "max-w-[480px] shrink-0 overflow-y-auto custom-scrollbar pr-2 h-full" : "max-w-screen-md mx-auto flex-1 min-h-0"}`}';
code = code.replace(mainColOld, mainColNew);

// 3. Move the Stem Studio code
const stemMobileStart = code.indexOf('{/* Stemmix Mobile Panel Ready */}');
const stemMobileEnd = code.indexOf('          </div>\n          </div>', stemMobileStart);

if (stemMobileStart !== -1 && stemMobileEnd !== -1) {
    const stemCode = code.substring(stemMobileStart, stemMobileEnd);
    // Remove the stem code from Column 1
    code = code.slice(0, stemMobileStart) + code.slice(stemMobileEnd);

    // Modify the stem code to use isCompact for rendering conditions, and change the desktop wrapper
    let newStemCode = `            {/* Stemmix Mobile Panel Ready */}
            {isCompact && showStemmix && stemmixStatus === "ready" && stemUrls && (
               <div className="w-full mt-2 flex flex-col h-[50dvh] bg-[#0A0A0C]/95 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative transition-all duration-500 animate-in slide-in-from-top-2 fade-in z-50 overflow-hidden">
                  <StemStudio 
                     stemUrls={stemUrls} 
                     songTitle={currentSong?.title || "Untitled Track"}
                    originalDuration={duration || 0}
                    onClose={() => setShowStemmix(false)}
                    isEmbedded={true}
                    isCompactUI={true}
                  />
               </div>
            )}
`;

    // Add back the mobile stem code where it was
    code = code.slice(0, stemMobileStart) + newStemCode + code.slice(stemMobileStart);

    // Now, at the end of the Main Column, before the closing tag, we'll insert Column 2 for Desktop
    const rightSidebarStart = code.indexOf('{/* Right Sidebar (Desktop) */}');
    const rightSidebarEnd = code.lastIndexOf('</div>\n  );\n}');

    if (rightSidebarStart !== -1 && rightSidebarEnd !== -1) {
       // Replace the right sidebar with Column 2
       const col2Code = `
        {/* Right Sidebar / Column 2 (Desktop) */}
        {!isCompact && showStemmix && stemmixStatus === "ready" && stemUrls && (
          <div className="flex-[2] flex flex-col min-w-[600px] max-w-[900px] bg-[#0E1015]/90 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] my-2 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
             <StemStudio 
               stemUrls={stemUrls} 
               songTitle={currentSong?.title || "Untitled Track"}
               originalDuration={duration || 0}
               onClose={() => setShowStemmix(false)}
               isEmbedded={true}
               isCompactUI={false}
             />
          </div>
        )}
       `;
       code = code.slice(0, rightSidebarStart) + col2Code + code.slice(rightSidebarEnd);
    }
}

// 4. Update the playlist rendering condition
// It currently checks `!isCompact || !showStemmix || stemmixStatus !== "ready"`
// We should change it to `!isCompact || (!isCompact || !showStemmix || stemmixStatus !== "ready")`
// Actually, if it's not compact, we ALWAYS want to show the playlist in Column 1.
// If it IS compact, we only want to show the playlist if stemmix is NOT ready.
// So the condition is `(!isCompact || !showStemmix || stemmixStatus !== "ready")` - wait, if !isCompact is true, this is ALWAYS true! Which is correct, on desktop the playlist always shows in Column 1.
// Wait, the playlist container has `isCompact ? "flex-1 overflow-hidden mt-3 pb-3" : "flex-1 shrink-0 mt-6 pb-6"`
// On desktop, the playlist is part of Column 1, which needs to be scrollable.
// Wait, Column 1 has `overflow-y-auto`, so the playlist inside it will just flow normally.

fs.writeFileSync('src/App.tsx', code);
console.log("Transformed App.tsx layout");
