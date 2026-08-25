const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// Ensure the popup state correctly renders the new layout if the regex failed.
// Check if the original popup div is still there.
if (content.includes("style={{ left: popupState.x, top: popupState.y, position: 'fixed', zIndex: 9999 }}")) {
    const originalPopup = `<div 
                    ref={popupRef}
                    style={{ left: popupState.x, top: popupState.y, position: 'fixed', zIndex: 9999 }}
                    className="w-80 bg-[#1a1d24] border border-purple-500/30 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-200"
                >`;
    const newPopup = `<div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div 
                    ref={popupRef}
                    className="w-full max-w-sm bg-[#1a1d24] border border-purple-500/30 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
                >`;
    content = content.replace(originalPopup, newPopup);
    
    // Add closing div just before {expandedSections.lyric && (
    content = content.replace(
        '            {expandedSections.lyric && (',
        '            </div>\n            {expandedSections.lyric && ('
    );
    // Actually the closing tag logic:
    const closeIndex = content.indexOf('                </div>\n            )}\n            {expandedSections.lyric && (');
    if (closeIndex !== -1) {
       content = content.substring(0, closeIndex) + '                </div>\n</div>\n            )}\n            {expandedSections.lyric && (' + content.substring(closeIndex + 73);
    }
}
fs.writeFileSync('src/components/StemStudio.tsx', content);
