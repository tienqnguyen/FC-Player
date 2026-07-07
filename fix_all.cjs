const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// Fix JSZip Import
if (!code.includes("import JSZip")) {
  code = code.replace("import React,", "import JSZip from 'jszip';\nimport React,");
}

// Fix State Variables
if (!code.includes("const [pans, setPans]")) {
  code = code.replace(
    /const \[mutes, setMutes\] = useState<Record<string, boolean>>\(\{/,
    `const [pans, setPans] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState<number>(1);
  const [reverb, setReverb] = useState<number>(0);
  const pannerNodesRef = useRef<Record<string, StereoPannerNode>>({});
  const convolverRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const [mutes, setMutes] = useState<Record<string, boolean>>({`
  );
}

fs.writeFileSync('src/components/StemStudio.tsx', code);
