const fs = require('fs');
let content = fs.readFileSync('src/components/SunoLyricDownloader.tsx', 'utf-8');

const target = `
    wrap.appendChild(addButton('Download Formatted LRC', '#2563eb', () => {
      const content = convertToMergedLRC(words);
      downloadText(content, \`\${fileName}.formatted.lrc\`);
    }));

    document.body.appendChild(wrap);
  }
`;

const replacement = `
    wrap.appendChild(addButton('Download Formatted LRC', '#2563eb', () => {
      const content = convertToMergedLRC(words);
      downloadText(content, \`\${fileName}.formatted.lrc\`);
    }));

    wrap.appendChild(addButton('Download MP4', '#db2777', () => {
      const url = \`https://cdn1.suno.ai/\${songId}.mp4\`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = \`\${fileName}.mp4\`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }));

    document.body.appendChild(wrap);
  }
`;

if (content.includes(target.trim())) {
  content = content.replace(target.trim(), replacement.trim());
  
  // We need to regenerate the URL-encoded BOOKMARKLET
  // Let's find how BOOKMARKLET is defined.
  // Wait, I see BOOKMARKLET is defined before or after SNIPPET?
  // Let's check.
  fs.writeFileSync('src/components/SunoLyricDownloader.tsx', content);
  console.log("Patched SNIPPET");
} else {
  console.log("Target not found");
}
