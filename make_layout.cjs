const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The goal:
// 1. Remove the entire "Right Sidebar" block.
// 2. Wrap Player Section and Stemmix Panel into a Column 1 div on desktop.
// 3. Wrap Playlist into a Column 2 div on desktop.
// On mobile, they should just stack inside the Main Single Page Layout Container.
// Wait, the easiest way:
// Since Main Container is `flex-col` on mobile and `flex-row` on desktop, we can just output:
// <Column 1> Player + Stemmix </Column 1>
// <Column 2> Playlist </Column 2>

// Let's modify the code by replacing everything from " {/* Main Column */}" to the end of the return statement.
// But we have too much logic inside. Let's just find the exact markers.

const startMainCol = code.indexOf('{/* Main Column */}');
const endPlayerSec = code.indexOf('{(!isCompact || !showStemmix || stemmixStatus !== "ready") && (');

if (startMainCol !== -1 && endPlayerSec !== -1) {
    let col1Part = code.substring(startMainCol, endPlayerSec);
    
    // We want to remove the extra closing `</div>          </div>` that currently ends Col 1 (or Player container).
    // Let's see what it ends with.
    // The end of col1Part is:
    // `               </div>\n            )}\n          </div>\n          </div>\n        `
    // The first `</div>` closes the StemStudio container.
    // The second `</div>` closes the `Player Section` container!
    // The third `</div>` closes the `Main Column`!
    
    // So right before `endPlayerSec`, we have `</div>\n          </div>`. We should only close the Player Section here, and not the Main Column, OR we can close the Main Column, and start Column 2!
    // Yes! Close Main Column, start Column 2!
    
    const col2Start = `        </div> {/* End Column 1 */}
        {/* Column 2 (Playlist) */}
        <div className={\`w-full flex flex-col \${!isCompact ? "flex-1 overflow-y-auto custom-scrollbar h-full min-w-[400px] max-w-[800px]" : "flex-1 min-h-0"}\`}>
        {/* Playlist wrapper logic is kept below */}
        {(!isCompact || !showStemmix || stemmixStatus !== "ready") && (
`;
    code = code.substring(0, endPlayerSec) + col2Start + code.substring(endPlayerSec + '{(!isCompact || !showStemmix || stemmixStatus !== "ready") && ('.length);
    
    // Now we need to remove the Right Sidebar desktop code.
    const rightSideStart = code.indexOf('{/* Right Sidebar / Column 2 (Desktop) */}');
    const rightSideEnd = code.lastIndexOf('</div>\n  );\n}');
    if (rightSideStart !== -1 && rightSideEnd !== -1) {
        // Remove right sidebar, and close Col 2
        code = code.substring(0, rightSideStart) + '        </div> {/* End Column 2 */}\n      </div>\n  );\n}';
    }
    
    // Let's make Column 1 width static on desktop.
    const oldCol1StartStr = '        <div className={`w-full flex flex-col ${!isCompact ? "max-w-[480px] shrink-0 overflow-y-auto custom-scrollbar pr-2 h-full" : "max-w-screen-md mx-auto flex-1 min-h-0"}`}>';
    const newCol1StartStr = '        <div className={`w-full flex flex-col ${!isCompact ? "w-[480px] shrink-0 overflow-y-auto custom-scrollbar pr-2 h-full" : "max-w-screen-md mx-auto flex-1 min-h-0"}`}>';
    code = code.replace(oldCol1StartStr, newCol1StartStr);
    
    // Modify the Mobile Stem panel to be unified (desktop + mobile)
    const oldMobileStem = `{isCompact && showStemmix && stemmixStatus === "ready" && stemUrls && (
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
            )}`;
    const newStem = `{showStemmix && stemmixStatus === "ready" && stemUrls && (
               <div className={\`w-full mt-4 flex flex-col \${isCompact ? "h-[50dvh]" : "h-[480px] mb-8 shrink-0"} bg-[#0A0A0C]/95 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative transition-all duration-500 animate-in slide-in-from-top-2 fade-in z-50 overflow-hidden\`}>
                  <StemStudio 
                     stemUrls={stemUrls} 
                     songTitle={currentSong?.title || "Untitled Track"}
                    originalDuration={duration || 0}
                    onClose={() => setShowStemmix(false)}
                    isEmbedded={true}
                    isCompactUI={isCompact}
                  />
               </div>
            )}`;
    code = code.replace(oldMobileStem, newStem);
    
    // Also, there's another old mobile stem block string in the file (if my previous replacement failed)
    const altOldMobileStem = `{isCompact && showStemmix && stemmixStatus === "ready" && stemUrls && (
               <div className={\`w-full mt-2 flex flex-col \${isCompact ? 'h-[50dvh]' : 'h-[600px] mb-4'} bg-[#0A0A0C]/95 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative transition-all duration-500 animate-in slide-in-from-top-2 fade-in z-50 overflow-hidden\`}>
                  <StemStudio 
                     stemUrls={stemUrls} 
                     songTitle={currentSong?.title || "Untitled Track"}
                    originalDuration={duration || 0}
                    onClose={() => setShowStemmix(false)}
                    isEmbedded={true}
                    isCompactUI={isCompact}
                  />
               </div>
            )}`;
    if (code.includes(altOldMobileStem)) code = code.replace(altOldMobileStem, newStem);
    
    fs.writeFileSync('src/App.tsx', code);
    console.log("Layout updated!");
} else {
    console.log("Could not find start markers");
}

