const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

const getSafeTitleCode = `
  const getSafeTitle = () => {
    let title = songTitle || "track";
    title = title.replace(/[^a-zA-Z0-9_\\-\\s]/g, "").trim();
    if (title.length > 30) {
      title = title.substring(0, 30).trim();
    }
    return title || "track";
  };

  const handleExportZip = async () => {`;

content = content.replace('  const handleExportZip = async () => {', getSafeTitleCode);
content = content.replace(/a\.download = "separated_stems\.zip";/g, 'a.download = `${getSafeTitle()}_stems.zip`;');
content = content.replace(/a\.download = `\$\{songTitle\} - \$\{stem\}\.mp3`;/g, 'a.download = `${getSafeTitle()}_${stem}.mp3`;');
content = content.replace(/a\.download = `\$\{songTitle \|\| 'transcript'\}\.srt`;/g, 'a.download = `${getSafeTitle()}.srt`;');
content = content.replace(/filename = `\$\{songTitle \|\| 'custom_mixdown'\}\.mp3`;/g, 'filename = `${getSafeTitle()}_mixdown.mp3`;');
content = content.replace(/filename = `\$\{songTitle \|\| 'custom_mixdown'\}\.wav`;/g, 'filename = `${getSafeTitle()}_mixdown.wav`;');

fs.writeFileSync('src/components/StemStudio.tsx', content);
