const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Update State Variables
code = code.replace(
  'const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "none">("none");',
  'const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "extreme" | "none">("none");'
);

code = code.replace(
  'const [bypassIntensity, setBypassIntensity] = useState<"low" | "medium" | "high">("medium");',
  'const [bypassIntensity, setBypassIntensity] = useState<"minimal" | "low" | "medium" | "high">("medium");'
);

// Add AI states right below sensitiveWords
const newStates = `
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => localStorage.getItem("openrouter_key") || "");
  const [isAIBypassing, setIsAIBypassing] = useState<boolean>(false);
  const [aiBypassStatus, setAiBypassStatus] = useState<string>("");
`;
code = code.replace(
  /const \[sensitiveWords, setSensitiveWords\].*?\n/,
  match => match + newStates
);

// 2. Update logic
const oldLogicStr = `  const handleApplyAdvancedBypass = () => {`;
const newLogicStr = `  const handleAIBypass = async () => {
    let textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;
    if (!openRouterKey.trim()) {
       alert("Vui lòng nhập OpenRouter API Key ở phần cài đặt bên dưới!");
       return;
    }
    
    setIsAIBypassing(true);
    setAiBypassStatus("Đang gọi AI Model...");
    
    const models = [
      "google/gemini-2.0-flash-lite-preview-02-05:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "openrouter/auto"
    ];
    
    let success = false;
    for (let i = 0; i < models.length; i++) {
       const model = models[i];
       setAiBypassStatus(\`Đang thử \${model.split('/')[1]} (\${i+1}/\${models.length})...\`);
       try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
             method: "POST",
             headers: {
                "Authorization": \`Bearer \${openRouterKey}\`,
                "Content-Type": "application/json"
             },
             body: JSON.stringify({
                model,
                messages: [
                   { role: "system", content: "You are an expert lyric obfuscator. Your goal is to bypass Suno AI copyright filters for Vietnamese lyrics without changing the meaning, emotion, or exact rhythm (so the song generates properly). You must slightly modify spelling, use synonymous phrasings, split syllables safely (like th-ương, y-êu) to bypass exact string matching filters. DO NOT change structure tags like [Chorus] or [Verse]. Return ONLY the final lyrics, nothing else." },
                   { role: "user", content: textToProcess }
                ]
             })
          });
          if (res.ok) {
             const data = await res.json();
             if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
                recordLyricState(data.choices[0].message.content.trim());
                success = true;
                setAiBypassStatus("✅ AI Bypass thành công!");
                break;
             }
          }
       } catch (err) {
          console.warn("Model " + model + " failed", err);
       }
    }
    
    if (!success) {
       setAiBypassStatus("❌ Tất cả AI models đều thất bại. Hãy kiểm tra lại API Key.");
    }
    
    setTimeout(() => {
       setIsAIBypassing(false);
       setAiBypassStatus("");
    }, 3000);
  };

  const handleApplyAdvancedBypass = () => {`;
code = code.replace(oldLogicStr, newLogicStr);


const intensityProbCode = `    let intensityProb = 0.65;
    if (bypassIntensity === 'low') intensityProb = 0.35;
    if (bypassIntensity === 'high') intensityProb = 0.95;`;
const newIntensityProbCode = `    let intensityProb = 0.65;
    if (bypassIntensity === 'minimal') intensityProb = 0.15;
    if (bypassIntensity === 'low') intensityProb = 0.35;
    if (bypassIntensity === 'high') intensityProb = 0.95;`;
code = code.replace(intensityProbCode, newIntensityProbCode);


const applyBypassToWordCodeOld = `      if (bypassMethod === 'homoglyph') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           const char = chars[i];
           if (homoglyphMap[char] && Math.random() < 0.5) {
              chars[i] = homoglyphMap[char][Math.floor(Math.random() * homoglyphMap[char].length)];
           }
        }
        return chars.join('');
      }`;

const applyBypassToWordCodeNew = `      if (bypassMethod === 'homoglyph') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           const char = chars[i];
           if (homoglyphMap[char] && Math.random() < 0.5) {
              chars[i] = homoglyphMap[char][Math.floor(Math.random() * homoglyphMap[char].length)];
           }
        }
        return chars.join('');
      }
      
      if (bypassMethod === 'extreme') {
        const marks = ['\\u034F', '\\u200C', '\\u200D', '\\u2060', '\\u200B'];
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           if (Math.random() < 0.7) {
              const mark = marks[Math.floor(Math.random() * marks.length)];
              chars[i] = chars[i] + mark;
           }
           if (homoglyphMap[chars[i]] && Math.random() < 0.3) {
              chars[i] = homoglyphMap[chars[i]][Math.floor(Math.random() * homoglyphMap[chars[i]].length)];
           }
        }
        // randomly inject a fake space or newline zero width equivalent
        if (chars.length > 2 && Math.random() < 0.3) {
           const mid = Math.floor(chars.length / 2);
           chars.splice(mid, 0, '\\u200B\\u200B');
        }
        return chars.join('');
      }`;
code = code.replace(applyBypassToWordCodeOld, applyBypassToWordCodeNew);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched stem logic");
