const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const targetStr = 'const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "extreme" | "none">("none");';
const newStr = 'const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "extreme" | "underscore" | "none">("none");';

code = code.replace(targetStr, newStr);
fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched bypassMethod state.");
