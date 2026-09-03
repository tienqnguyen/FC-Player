const fs = require('fs');

const rawJS = `(async function () {
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
  
  function getSafeFileName(songId) {
    let title = songId;
    try {
      const metaTitle = document.querySelector('meta[property="og:title"]');
      if (metaTitle && metaTitle.content) {
        title = metaTitle.content;
      } else if (document.title) {
        title = document.title;
      }
    } catch (e) {}
    return title.replace(/[/\\\\?%*:|"<>]/g, '-').trim();
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
    
    const fileName = getSafeFileName(songId);

    wrap.appendChild(addButton(\`Download \${fileType.toUpperCase()}\`, '#4b5563', () => {
      const content = fileType === 'srt' ? convertToSRT(words) : convertToLRC(words);
      downloadText(content, \`\${fileName}.\${fileType}\`);
    }));

    wrap.appendChild(addButton('Download Formatted LRC', '#2563eb', () => {
      const content = convertToMergedLRC(words);
      downloadText(content, \`\${fileName}.formatted.lrc\`);
    }));

    wrap.appendChild(addButton('Download MP4 Video', '#db2777', () => {
      const url = \`https://cdn1.suno.ai/\${songId}.mp4\`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = \`\${fileName}.mp4\`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 500);
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

// Minify the bookmarklet slightly to ensure it works correctly as a URL
let minifiedJS = rawJS.replace(/\n\s+/g, ' '); 
let bookmarkletURL = "javascript:" + encodeURIComponent(rawJS);
let snippetString = rawJS.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

let fileContent = fs.readFileSync('src/components/SunoLyricDownloader.tsx', 'utf-8');
fileContent = fileContent.replace(/const SNIPPET = ".*?";/, 'const SNIPPET = "' + snippetString + '";');
fileContent = fileContent.replace(/const BOOKMARKLET = ".*?";/, 'const BOOKMARKLET = "' + bookmarkletURL + '";');

fs.writeFileSync('src/components/SunoLyricDownloader.tsx', fileContent);
console.log("Updated!");
