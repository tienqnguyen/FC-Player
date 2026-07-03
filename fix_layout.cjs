const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Ensure Main Container is correct
code = code.replace(/max-w-\[1200px\] flex-1 overflow-hidden h-full pb-10 flex-row px-4 pt-2 gap-6/g, 'max-w-[1400px] flex-1 overflow-hidden h-full pb-10 flex-row px-4 pt-2 gap-6 justify-center');

// Ensure Column 1 is correct
code = code.replace(/w-full max-w-screen-md mx-auto flex flex-col flex-1 \$\{!isCompact \? "overflow-y-auto custom-scrollbar pr-2" : "min-h-0"\}/g, 'w-full flex flex-col ${!isCompact ? "max-w-[480px] shrink-0 overflow-y-auto custom-scrollbar pr-2 h-full" : "max-w-screen-md mx-auto flex-1 min-h-0"}');

// Insert Column 2 at the end
const endDivs = `        />
        
        </div>
      </div>
  );
}`;

const endDivsWithStem = `        />
        
        </div>

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
      </div>
  );
}`;

if (code.includes(endDivs)) {
    code = code.replace(endDivs, endDivsWithStem);
    console.log("Added Column 2 at the end");
} else {
    // try to find where to add it
    const lastClosing = `      </div>\n  );\n}`;
    if (code.includes(lastClosing)) {
        code = code.replace(lastClosing, `        {/* Right Sidebar / Column 2 (Desktop) */}
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
        )}\n      </div>\n  );\n}`);
        console.log("Added Column 2 at the very end");
    } else {
        console.log("Could not find where to add Column 2");
    }
}

fs.writeFileSync('src/App.tsx', code);
