const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// Add BookOpen import if missing
if (!content.includes('BookOpen,')) {
    content = content.replace('import { Wand2, X, ', 'import { Wand2, X, BookOpen, ');
}

// Add SunoGuideModal import
if (!content.includes('import SunoGuideModal')) {
    content = content.replace(
        "import SunoLyricDownloader from './SunoLyricDownloader';",
        "import SunoLyricDownloader from './SunoLyricDownloader';\nimport SunoGuideModal from './SunoGuideModal';"
    );
}

// Add state for Guide Modal
if (!content.includes('const [showGuideModal, setShowGuideModal]')) {
    content = content.replace(
        'const [suggestError, setSuggestError] = useState("");',
        'const [suggestError, setSuggestError] = useState("");\n  const [showGuideModal, setShowGuideModal] = useState(false);'
    );
}

// Update the AI Suggestion Popup to be centered fixed instead of cursor-following
content = content.replace(
    /<div \n\s*ref=\{popupRef\}\n\s*style=\{\{ left: popupState\.x, top: popupState\.y, position: 'fixed', zIndex: 9999 \}\}\n\s*className="w-80 bg-\[#1a1d24\] border border-purple-500\/30 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-\[60vh\] animate-in zoom-in-95 duration-200"\n\s*>/g,
    `<div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div 
                    ref={popupRef}
                    className="w-full max-w-sm bg-[#1a1d24] border border-purple-500/30 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
                >`
);
// We also need to add a closing div for the backdrop of the popup.
content = content.replace(
    /<\/div>\n\s*\)\}\n\s*\{coverUrl && \(/g,
    `</div>\n            </div>\n            )}\n            {coverUrl && (`
);

// Add the Hướng Dẫn button next to PHỐI KHÍ LYRIC header
content = content.replace(
    '<h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Music className="w-3 h-3 inline-block mr-1 -mt-0.5" /> PHỐI KHÍ LYRIC</h3>',
    `<h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Music className="w-3 h-3 inline-block mr-1 -mt-0.5" /> PHỐI KHÍ LYRIC</h3>
                <button
                    onClick={(e) => { e.stopPropagation(); setShowGuideModal(true); }}
                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded uppercase text-[8px] font-black tracking-widest transition-all"
                    title="Hướng dẫn sử dụng Thẻ Suno"
                >
                    <BookOpen className="w-2.5 h-2.5" />
                    HƯỚNG DẪN
                </button>`
);

// Add the Guide Modal render at the very end of the component
if (!content.includes('<SunoGuideModal onClose={() => setShowGuideModal(false)} />')) {
    content = content.replace(
        '</>\n  );\n\n  return (',
        `  {showGuideModal && <SunoGuideModal onClose={() => setShowGuideModal(false)} />}\n    </>\n  );\n\n  return (`
    );
}


fs.writeFileSync('src/components/StemStudio.tsx', content);
console.log('Patched StemStudio.tsx');
