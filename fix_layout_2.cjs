const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The layout the user wants now:
// Column 1: Player + Stem Studio
// Column 2: Playlist

// Let's first make the Stem Studio Mobile block also be the Desktop block, by removing the `isCompact &&` condition.
// Actually, let's just create a unified Stem Studio block below the Player.
const mobileStemStart = code.indexOf('{/* Stemmix Mobile Panel Ready */}');
const mobileStemEnd = code.indexOf('</div>\n            )}', mobileStemStart) + '</div>\n            )}'.length;

const desktopStemStart = code.indexOf('{/* Right Sidebar / Column 2 (Desktop) */}');
const desktopStemEnd = code.indexOf('          </div>\n        )}', desktopStemStart) + '          </div>\n        )}'.length;

// Remove desktop stem completely
if (desktopStemStart !== -1) {
    code = code.substring(0, desktopStemStart) + code.substring(desktopStemEnd);
}

// Modify mobile stem to just be the Stem Studio block, below Player
const newStemBlock = `
            {/* Stemmix Panel Ready */}
            {showStemmix && stemmixStatus === "ready" && stemUrls && (
               <div className={\`w-full mt-4 flex flex-col \${isCompact ? 'h-[50dvh]' : 'h-[500px] shrink-0'} bg-[#0A0A0C]/95 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative transition-all duration-500 animate-in slide-in-from-top-2 fade-in z-50 overflow-hidden\`}>
                  <StemStudio 
                     stemUrls={stemUrls} 
                     songTitle={currentSong?.title || "Untitled Track"}
                    originalDuration={duration || 0}
                    onClose={() => setShowStemmix(false)}
                    isEmbedded={true}
                    isCompactUI={isCompact}
                  />
               </div>
            )}
`;

if (mobileStemStart !== -1) {
    code = code.substring(0, mobileStemStart) + newStemBlock + code.substring(mobileStemEnd);
}

// Now we need to handle the Playlist block.
// Currently it's wrapped in `if (!isCompact || !showStemmix || stemmixStatus !== "ready")`
// Let's find this condition.
const playlistConditionStart = code.indexOf('{(!isCompact || !showStemmix || stemmixStatus !== "ready") && (');
if (playlistConditionStart !== -1) {
    // We want the playlist to ALWAYS show on desktop (in Column 2), and on mobile only when Stem is NOT ready.
    // So the condition stays exactly the same! `!isCompact` makes it true on desktop.
    
    // We need to move the Playlist block OUT of Column 1 on desktop, and into Column 2.
    // Wait, currently Column 1 wraps EVERYTHING up to the end of Playlist!
    // Let's find where Column 1 ends.
    // The playlist block has:
    // <div className={`w-full max-w-lg mx-auto flex flex-col min-h-0 px-2 ${isCompact ? ... : ...}`}>
    // ...
    // </div>
    // </div> // closing column 1!
    
    // Let's change Column 1 wrapper to end BEFORE the playlist block, ONLY IF desktop!
    // That's hard to do conditionally with divs.
    // Instead, let's wrap Player + Stem in Column 1, and Playlist in Column 2 on desktop.
    // Wait, on mobile, we need them in a single flex column.
    // The main container has flex-row on desktop, flex-col on mobile.
    // So if we just have two child divs (Col 1 and Col 2), flex-col on mobile will stack them!
    
    // Main Container:
    // flex-col on mobile, flex-row on desktop.
    // So Col 1 (Player+Stem) and Col 2 (Playlist) will stack naturally on mobile!
    // We can just remove the `(!isCompact || ...)` condition for the playlist, EXCEPT if we want to hide playlist on mobile when stem is open.
    // If we want to hide playlist on mobile when stem is open:
    // `className={\`... \${isCompact && showStemmix && stemmixStatus === "ready" ? "hidden" : "flex"}\`}`
    
    // Let's do this: find Column 1 start, close it after Stem, and start Column 2 for Playlist.
    
    const col1Start = code.indexOf('{/* Main Column */}');
    const col1Div = '        <div className={`w-full flex flex-col ${!isCompact ? "max-w-[600px] shrink-0 overflow-y-auto custom-scrollbar pr-2 h-full" : "max-w-screen-md mx-auto flex-1 min-h-0"}`}>';
    
    // Let's replace the old col1 start
    const oldCol1StartStr = '        <div className={`w-full flex flex-col ${!isCompact ? "max-w-[480px] shrink-0 overflow-y-auto custom-scrollbar pr-2 h-full" : "max-w-screen-md mx-auto flex-1 min-h-0"}`}>';
    if (code.includes(oldCol1StartStr)) {
        code = code.replace(oldCol1StartStr, col1Div);
    } else {
        const fallbackCol1StartStr = '        <div className={`w-full max-w-screen-md mx-auto flex flex-col flex-1 ${!isCompact ? "overflow-y-auto custom-scrollbar pr-2" : "min-h-0"}`}>';
        code = code.replace(fallbackCol1StartStr, col1Div);
    }
    
    // Now close Col 1 after the Stem block and start Col 2
    const afterStemBlock = newStemBlock + '          </div>'; // Wait, what's closing what?
    // Let's find exactly where to split.
    
    const stemMobileCodeIdx = code.indexOf('{/* Stemmix Panel Ready */}');
    let afterStemDivIdx = code.indexOf('</div>', code.indexOf('</StemStudio>', stemMobileCodeIdx));
    afterStemDivIdx = code.indexOf(')}', afterStemDivIdx) + 2; // after the `)}`
    
    // We need to inject `</div> {/* End Col 1 */} <div className="Col 2">` right here!
    // But wait, there's already a closing `</div>` somewhere?
    // In original code, Col 1 closed at the very end of the playlist.
    
    const splitPointStr = code.substring(afterStemDivIdx, afterStemDivIdx + 150);
    console.log("Split point context:", splitPointStr);
    
    // It says:
    // `          </div>\n        {(!isCompact || !showStemmix || stemmixStatus !== "ready") && (`
    // Wait, the `</div>` there is closing what?
    // Oh, Player section has a wrapper maybe?
    // Let's look at the original code structure around the Playlist condition.
}

fs.writeFileSync('src/App.tsx', code);
