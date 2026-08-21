const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Remove openRouterKey from useState
code = code.replace(
  /const \[openRouterKey, setOpenRouterKey\] = useState<string>\(\(\) => localStorage\.getItem\("openrouter_key"\) \|\| ""\);\n/,
  ''
);

// 2. Change handleAIBypass logic to use our API endpoint instead of OpenRouter API
const oldHandleAIBypass = /const handleAIBypass = async \(\) => \{[\s\S]*?\}, 3000\);\n  \};/m;
const newHandleAIBypass = `const handleAIBypass = async () => {
    let textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;
    
    setIsAIBypassing(true);
    setAiBypassStatus("Đang gọi AI Model...");
    
    try {
        const res = await fetch("/api/lyric/bypass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lyric: textToProcess })
        });
        const data = await res.json();
        
        if (res.ok && data.lyric) {
            recordLyricState(data.lyric);
            setAiBypassStatus("✅ AI Bypass thành công!");
        } else if (data.error) {
            setAiBypassStatus("❌ " + data.error);
        } else {
            setAiBypassStatus("❌ Lỗi không xác định từ AI.");
        }
    } catch (err) {
        console.error("AI Bypass error", err);
        setAiBypassStatus("❌ Lỗi kết nối AI.");
    }
    
    setTimeout(() => {
       setIsAIBypassing(false);
       setAiBypassStatus("");
    }, 3000);
  };`;
code = code.replace(oldHandleAIBypass, newHandleAIBypass);

// 3. Update the UI layout for SUNO Lyric Tool
const oldHeader = /<div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-black\/40 border border-amber-500\/20 p-2 rounded-lg">[\s\S]*?<\/div>/;
const newHeader = `<div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-black/40 border border-amber-500/20 p-2 rounded-lg" style={{ display: 'none' }}>
                               {/* Removed OpenRouter key input since it uses server API */}
                           </div>`;
code = code.replace(oldHeader, newHeader);

// Reduce gap of the flex wrap container
code = code.replace(
  /<div className="flex flex-wrap items-center gap-1\.5 sm:gap-2">/,
  '<div className="flex flex-wrap items-center gap-1 sm:gap-1.5">'
);

// Reduce some paddings on format buttons
code = code.replace(
  /className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-\[8\.5px\] sm:text-\[10px\] font-bold tracking-wider sm:tracking-widest uppercase px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"/g,
  'className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"'
);

code = code.replace(
  /className="hover:bg-\[#008f5a\] disabled:opacity-50 text-white text-\[8\.5px\] sm:text-\[10px\] font-bold tracking-wider sm:tracking-widest uppercase px-2 py-1 sm:px-3 sm:py-2 rounded-l-lg transition-colors flex items-center gap-1 border-r border-white\/20"/g,
  'className="hover:bg-[#008f5a] disabled:opacity-50 text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-l-lg transition-colors flex items-center gap-1 border-r border-white/20"'
);

code = code.replace(
  /className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-\[8\.5px\] sm:text-\[10px\] font-bold tracking-wider sm:tracking-widest uppercase px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"/g,
  'className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"'
);

code = code.replace(
  /className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-\[8\.5px\] sm:text-\[10px\] font-bold tracking-wider sm:tracking-widest uppercase px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition-colors flex items-center gap-1 sm:ml-auto shrink-0"/g,
  'className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 sm:ml-auto shrink-0"'
);


fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched stem frontend");
