const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const stateVariables = `
  const [newRuleReplace, setNewRuleReplace] = useState<string>("");

  // Advanced Suno Bypass States
  const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "none">("none");
  const [hyphenStyle, setHyphenStyle] = useState<"consonant" | "auto">("consonant");
  const [bypassIntensity, setBypassIntensity] = useState<"low" | "medium" | "high">("medium");
  const [protectTags, setProtectTags] = useState<boolean>(true);
  const [preserveSensitive, setPreserveSensitive] = useState<boolean>(true);
  const [showSensitiveWords, setShowSensitiveWords] = useState<boolean>(false);
  const [sensitiveWords, setSensitiveWords] = useState<string[]>(["lên", "nên", "nói", "lòng", "nỗi", "lo", "nắng", "lạnh", "non", "nơi", "lại", "nào", "trời", "chờ", "trăng", "chân", "tròn", "chưa", "trước", "chỉ", "trách", "chạy", "sao", "xanh", "sương", "xa", "sông", "xuống", "sầu", "xưa", "sáng", "xin", "rừng", "dòng", "gió", "ra", "dù", "gần", "rơi", "đường", "duyên", "giấc", "về", "vẫn", "vào", "với", "vui", "vàng", "mắt", "mắc", "biết", "tiếc", "yêu", "thương", "anh", "em", "đâu", "đây"]);
`;
code = code.replace(/const \[newRuleReplace, setNewRuleReplace\] = useState<string>\(""\);/, stateVariables);


// Define the bypass function near handleApplySelectedQuickPicks
const bypassFunction = `
  const handleApplyAdvancedBypass = () => {
    let textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;

    let intensityProb = 0.65;
    if (bypassIntensity === 'low') intensityProb = 0.35;
    if (bypassIntensity === 'high') intensityProb = 0.95;

    const zeroWidthChar = '\\u200B';
    const homoglyphMap: Record<string, string[]> = {
      'a': ['a', 'а', 'a'], 'e': ['e', 'е', 'e'], 'o': ['o', 'о', 'o'],
      'p': ['p', 'р', 'p'], 'c': ['c', 'с', 'c'], 'y': ['y', 'у', 'y'],
      'x': ['x', 'х', 'x'], 'H': ['H', 'Н', 'H'], 'P': ['P', 'Р', 'P'],
      'C': ['C', 'С', 'C'], 'M': ['M', 'М', 'M'], 'O': ['O', 'О', 'O'],
      'T': ['T', 'Т', 'T'], 'A': ['A', 'А', 'A']
    };

    const isSensitive = (word: string) => {
      if (!preserveSensitive) return false;
      const lowerWord = word.toLowerCase().replace(/[.,!?;:]/g, "");
      return sensitiveWords.includes(lowerWord);
    };

    const applyBypassToWord = (word: string) => {
      if (Math.random() > intensityProb) return word;
      if (protectTags && /^(\\[.*?\\]|\\(.*?\\)|\\<.*?\\>)$/.test(word)) return word;
      if (isSensitive(word)) return word;

      if (bypassMethod === 'hyphen') {
        if (word.length <= 1) return word;
        if (hyphenStyle === 'consonant') {
           // Vietnamese consonant split
           const match = word.match(/^(tr|th|ch|ph|nh|kh|gi|qu|ngh|ng|gh|[b-df-hj-np-tv-z])(.*)$/i);
           if (match && match[2].length > 0) {
              return match[1] + '-' + match[2];
           }
        }
        // Auto split (middle)
        const mid = Math.floor(word.length / 2);
        return word.slice(0, mid) + '-' + word.slice(mid);
      }
      
      if (bypassMethod === 'zerowidth') {
        const chars = word.split('');
        for (let i = 1; i < chars.length; i++) {
          if (Math.random() < 0.5) {
             chars[i] = zeroWidthChar + chars[i];
          }
        }
        return chars.join('');
      }

      if (bypassMethod === 'alternating') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
          if (Math.random() < 0.5) {
             chars[i] = chars[i].toUpperCase() === chars[i] ? chars[i].toLowerCase() : chars[i].toUpperCase();
          }
        }
        return chars.join('');
      }

      if (bypassMethod === 'homoglyph') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           const char = chars[i];
           if (homoglyphMap[char] && Math.random() < 0.5) {
              chars[i] = homoglyphMap[char][Math.floor(Math.random() * homoglyphMap[char].length)];
           }
        }
        return chars.join('');
      }

      return word;
    };

    // Process lines and words
    const lines = textToProcess.split('\\n');
    const processedLines = lines.map(line => {
      // Don't modify pure tag lines if protect is on
      if (protectTags && /^\\[.*?\\]$/.test(line.trim())) return line;
      
      const words = line.split(/(\\s+)/); // Preserve whitespace
      return words.map(w => {
         if (w.trim() === '') return w;
         return applyBypassToWord(w);
      }).join('');
    });

    recordLyricState(processedLines.join('\\n'));
  };

  const handleApplySelectedQuickPicks = () => {
`;

code = code.replace(/const handleApplySelectedQuickPicks = \(\) => \{/, bypassFunction);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched advanced bypass logic");
