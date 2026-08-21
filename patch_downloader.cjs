const fs = require('fs');
let code = fs.readFileSync('src/components/SunoLyricDownloader.tsx', 'utf8');

if (!code.includes('useState')) {
    code = code.replace("import { Download, Copy } from 'lucide-react';", "import { useState } from 'react';\nimport { Download, Copy, ChevronDown, ChevronRight } from 'lucide-react';");
}

const componentRegex = /export default function SunoLyricDownloader\(\) \{([\s\S]*?)\}/;

const newComponent = `export default function SunoLyricDownloader() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="flex flex-col mt-4 border border-indigo-500/30 bg-indigo-500/10 rounded-xl p-3 sm:p-4 relative overflow-hidden transition-all">
            <div 
                className="flex items-center justify-between cursor-pointer select-none group" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/20 rounded-md group-hover:bg-indigo-500/30 transition-colors">
                       <Download className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h4 className="font-bold text-[10px] sm:text-[11px] uppercase tracking-wider text-white">Tải LRC trực tiếp từ Suno</h4>
                </div>
                <button className="text-white/50 hover:text-white transition-colors bg-white/5 p-1 rounded-md group-hover:bg-white/10">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
            
            {isExpanded && (
                <div className="flex flex-col gap-3 mt-4 pt-3 border-t border-indigo-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[11px] text-white/70 leading-relaxed space-y-2">
                        <p>1. Kéo thả nút <strong>"Suno LRC Download"</strong> này lên Bookmark bar của trình duyệt.</p>
                        <p>2. Click Play một bài hát bất kỳ của chính BẠN trên trang web <strong>Suno.com/song/...</strong>.</p>
                        <p>3. Bấm vào dấu  "Suno LRC Download" ở Bookmark bar vừa lưu để hiển thị nút tải file Lyrics (.lrc) tự động.</p>
                    </div>

                    <div
                        className="flex items-center justify-center mt-2"
                        dangerouslySetInnerHTML={{
                          __html: \`<a 
                              href="\${BOOKMARKLET.replace(/"/g, '&quot;')}"
                             class="inline-flex items-center gap-2 bg-indigo-500 text-white font-black text-[12px] tracking-wider px-6 py-2.5 rounded-full hover:bg-indigo-400 hover:scale-105 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.4)] cursor-grab active:cursor-grabbing"
                             title="Kéo nút này thả vào thanh đánh dấu (Bookmark bar)"
                             onclick="event.preventDefault()"
                          >
                             <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                             Suno LRC Download
                          </a>\`
                       }}
                    />

                    <div className="mt-2 border-t border-white/10 pt-3">
                       <p className="text-[10px] text-white/50 mb-2 italic">Hoặc có thể sao chép đoạn mã sau vào Developer Console (F12) - Source tab - New Snippet - Paste code phía dưới xong thì Right click - RUN trên trang bài hát của Suno của bạn</p>
                       <div className="relative group">
                          <textarea
                            readOnly
                            value={SNIPPET}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white/60 text-[9px] font-mono h-24 custom-scrollbar focus:outline-none"
                          />
                          <button
                              onClick={(e) => {
                                 navigator.clipboard.writeText(SNIPPET);
                                 const btn = e.currentTarget;
                                 const span = btn.querySelector('span');
                                 if(span) span.innerText = "COPIED!";
                                 setTimeout(() => {
                                     if(span) span.innerText = "COPY SNIPPET";
                                 }, 2000);
                             }}
                             className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                          >
                             <Copy className="w-3 h-3" />
                             <span>COPY SNIPPET</span>
                          </button>
                       </div>
                    </div>
                </div>
            )}
        </div>
    );
}`;

code = code.replace(componentRegex, newComponent);
fs.writeFileSync('src/components/SunoLyricDownloader.tsx', code);
console.log("Patched");
