const fs = require('fs');

const rawCode = `(async function () {
  'use strict';

  const fileType = 'lrc'; // 'lrc' or 'srt'
  const BTN_WRAP_ID = 'suno-lyrics-tools';

  function getLastCookie(name) {
    const value = \`; \${document.cookie}\`;
    const parts = value.split(\`; \${name}=\`);
    if (parts.length > 1) {
      return parts[parts.length - 1].split(';')[0];
    }
    return null;
  }

  function formatTime(seconds) {
    const d = new Date(0);
    d.setMilliseconds(seconds * 1000);
    return \`\${String(d.getUTCHours()).padStart(2, '0')}:\${String(d.getUTCMinutes()).padStart(2, '0')}:\${String(d.getUTCSeconds()).padStart(2, '0')},\${String(d.getUTCMilliseconds()).padStart(3, '0')}\`;
  }

  function formatLrcTime(seconds) {
    const d = new Date(0);
    d.setMilliseconds(seconds * 1000);
    return \`[\${String(d.getUTCMinutes()).padStart(2, '0')}:\${String(d.getUTCSeconds()).padStart(2, '0')}.\${String(Math.floor(d.getUTCMilliseconds() / 10)).padStart(2, '0')}]\`;
  }

  function convertToSRT(alignedWords) {
    return alignedWords.map((w, i) =>
      \`\${i + 1}\\n\${formatTime(w.start_s)} --> \${formatTime(w.end_s)}\\n\${String(w.word || '').trim()}\\n\`
    ).join('\\n');
  }

  function convertToLRC(alignedWords) {
    return alignedWords
      .map(w => \`\${formatLrcTime(w.start_s)}\${String(w.word || '').trim()}\`)
      .join('\\n');
  }

  function convertToMergedLRC(alignedWords, gapMs = 700, maxWords = 10) {
    let result = [];
    let lineText = '';
    let lineTime = null;
    let lastStart = null;
    let wordCount = 0;

    alignedWords.forEach(word => {
      const startMs = Number(word.start_s || 0) * 1000;
      const cleanWord = String(word.word || '')
        .replace(/\\[.*?\\]/g, '')
        .trim();

      if (!cleanWord) {
        lastStart = startMs;
        return;
      }

      const isNewLineByGap = lastStart !== null && (startMs - lastStart > gapMs);
      const isTooLong = wordCount >= maxWords;

      if (lineText && (isNewLineByGap || isTooLong)) {
        result.push(\`\${lineTime} \${lineText.trim()}\`);
        lineText = '';
        wordCount = 0;
      }

      if (!lineText) {
        lineTime = formatLrcTime(word.start_s);
        lineText = cleanWord;
        wordCount = 1;
      } else {
        lineText += ' ' + cleanWord;
        wordCount++;
      }

      lastStart = startMs;
    });

    if (lineText) result.push(\`\${lineTime} \${lineText.trim()}\`);
    return result.join('\\n');
  }

  function downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  }

  async function fetchAlignedWords(songId, token) {
    const apiUrl = \`https://studio-api.prod.suno.com/api/gen/\${songId}/aligned_lyrics/v2/\`;
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: token ? {
        Authorization: \`Bearer \${token}\`,
        'Content-Type': 'application/json'
      } : {},
      credentials: 'include'
    });

    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const data = await res.json();
    return data?.aligned_words || null;
  }

  function addButton(label, bg, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = \`
      padding: 10px 12px;
      border: none;
      border-radius: 8px;
      background: \${bg};
      color: white;
      font-weight: 600;
      cursor: pointer;
    \`;
    btn.onclick = onClick;
    return btn;
  }

  function mountUI(songId, words) {
    const old = document.getElementById(BTN_WRAP_ID);
    if (old) old.remove();

    const wrap = document.createElement('div');
    wrap.id = BTN_WRAP_ID;
    wrap.style.cssText = \`
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    \`;

    wrap.appendChild(addButton(\`Download \${fileType.toUpperCase()}\`, '#4b5563', () => {
      const content = fileType === 'srt' ? convertToSRT(words) : convertToLRC(words);
      downloadText(content, \`\${songId}.\${fileType}\`);
    }));

    wrap.appendChild(addButton('Download Formatted LRC', '#2563eb', () => {
      const content = convertToMergedLRC(words);
      downloadText(content, \`\${songId}.formatted.lrc\`);
    }));

    document.body.appendChild(wrap);
  }

  try {
    const songId = location.pathname.split('/').filter(Boolean).pop();
    const token = getLastCookie('__session');
    const words = await fetchAlignedWords(songId, token);

    if (!words?.length) {
      console.warn('No aligned words found');
      return;
    }

    mountUI(songId, words);
    console.log('Suno lyrics tools injected');
  } catch (err) {
    console.error('Snippet failed:', err);
  }
})();`;

// rudimentary minification for bookmarklet
const minified = rawCode
  .replace(/\n/g, '')
  .replace(/\s+/g, ' ')
  .replace(/ {/g, '{')
  .replace(/} /g, '}')
  .replace(/ \(/g, '(')
  .replace(/\) /g, ')')
  .replace(/ = /g, '=')
  .replace(/ == /g, '==')
  .replace(/ === /g, '===')
  .replace(/ => /g, '=>')
  .replace(/ \+ /g, '+')
  .replace(/ - /g, '-')
  .replace(/ \* /g, '*')
  .replace(/ \/ /g, '/')
  .replace(/ < /g, '<')
  .replace(/ > /g, '>')
  .replace(/ <= /g, '<=')
  .replace(/ >= /g, '>=')
  .replace(/, /g, ',')
  .replace(/; /g, ';')
  .replace(/: /g, ':')
  .replace(/ \?/g, '?')
  .replace(/\? /g, '?')
  .replace(/ \}/g, '}')
  .replace(/\{ /g, '{')
  .trim();

const bookmarkletStr = "javascript:" + encodeURI(minified);

const content = `import React from 'react';
import { Download, Check, Copy } from 'lucide-react';

const BOOKMARKLET = ${JSON.stringify(bookmarkletStr)};

const SNIPPET = ${JSON.stringify(rawCode)};

export default function SunoLyricDownloader() {
    return (
        <div className="flex flex-col gap-3 mt-4 border border-indigo-500/30 bg-indigo-500/10 rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 rounded-md">
                   <Download className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-white">Tải LRC trực tiếp từ Suno</h4>
            </div>
            
            <div className="text-[11px] text-white/70 leading-relaxed space-y-2">
                <p>1. Kéo thả nút <strong>"Suno LRC Download"</strong> này lên Bookmark bar của trình duyệt.</p>
                <p>2. Play một bài hát bất kỳ của bạn trên trang web <strong>Suno.com</strong>.</p>
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
               <p className="text-[10px] text-white/50 mb-2 italic">Hoặc có thể sao chép đoạn mã sau vào Developer Console (F12) trên trang bài hát của Suno:</p>
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
    );
}
`;

fs.writeFileSync('src/components/SunoLyricDownloader.tsx', content);
