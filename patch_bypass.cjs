const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const targetStr = `const [bypassIntensity, setBypassIntensity] = useState<"minimal" | "low" | "medium" | "high">("medium");`;
const newStr = `const [bypassIntensity, setBypassIntensity] = useState<"minimal" | "low" | "medium" | "high">("minimal");`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, newStr);
    fs.writeFileSync('src/components/StemStudio.tsx', code);
    console.log("Patched bypassIntensity to minimal.");
} else {
    console.log("Could not find bypassIntensity definition.");
}
