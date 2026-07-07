const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const exportFunc = `
  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      for (const stem of stemsList) {
        const url = (stemUrls as any)[stem];
        if (url) {
           const res = await fetch(url);
           const blob = await res.blob();
           zip.file(\`\${stem}.wav\`, blob);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const dlUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = "separated_stems.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      console.error("ZIP Export failed", e);
      alert("ZIP Export failed. Check console.");
    }
  };
`;
code = code.replace(/const togglePlay = \(\) => \{/, exportFunc + "\n  const togglePlay = () => {");

fs.writeFileSync('src/components/StemStudio.tsx', code);
