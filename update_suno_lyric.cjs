const fs = require('fs');
let content = fs.readFileSync('src/components/SunoLyricDownloader.tsx', 'utf-8');

const snippetRegex = /const SNIPPET = "(.*?)";/;
const match = content.match(snippetRegex);

if (match) {
  let snippetRaw = match[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
  
  const targetLogic = "wrap.appendChild(addButton('Download Formatted LRC', '#2563eb', () => {\n      const content = convertToMergedLRC(words);\n      downloadText(content, `${fileName}.formatted.lrc`);\n    }));\n\n    document.body.appendChild(wrap);\n  }";
  
  const replacementLogic = "wrap.appendChild(addButton('Download Formatted LRC', '#2563eb', () => {\n      const content = convertToMergedLRC(words);\n      downloadText(content, `${fileName}.formatted.lrc`);\n    }));\n\n    wrap.appendChild(addButton('Download MP4 Video', '#db2777', () => {\n      const url = `https://cdn1.suno.ai/${songId}.mp4`;\n      const a = document.createElement('a');\n      a.href = url;\n      a.target = '_blank';\n      a.download = `${fileName}.mp4`;\n      document.body.appendChild(a);\n      a.click();\n      setTimeout(() => a.remove(), 500);\n    }));\n\n    document.body.appendChild(wrap);\n  }";

  // We need to use indexOf and substring because backticks in targetLogic might have been escaped?
  // Let's just string replace directly
  snippetRaw = snippetRaw.replace(targetLogic, replacementLogic);
  
  const escapedSnippet = snippetRaw
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
    
  const encodedBookmarklet = "javascript:" + encodeURIComponent(snippetRaw);
  
  content = content.replace(snippetRegex, 'const SNIPPET = "' + escapedSnippet + '";');
  
  const bookmarkletRegex = /const BOOKMARKLET = "javascript:.*?";/;
  content = content.replace(bookmarkletRegex, 'const BOOKMARKLET = "' + encodedBookmarklet + '";');
  
  fs.writeFileSync('src/components/SunoLyricDownloader.tsx', content);
  console.log("Updated SunoLyricDownloader.tsx successfully.");
} else {
  console.log("Could not find SNIPPET");
}
