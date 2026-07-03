const fs = require('fs');

let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

const eqBands = `
const EQ_BANDS_DEFAULT = [
  { name: "Deep Sub", f: 25, q: 1.4, g: 0.0, type: "peaking", fRange: [20, 30] },
  { name: "Sub", f: 40, q: 1.4, g: 0.0, type: "peaking", fRange: [30, 50] },
  { name: "Low Bass", f: 63, q: 1.4, g: 0.0, type: "peaking", fRange: [50, 80] },
  { name: "Bass", f: 100, q: 1.4, g: 0.0, type: "peaking", fRange: [80, 125] },
  { name: "Upper Bass", f: 160, q: 1.4, g: 0.0, type: "peaking", fRange: [125, 200] },
  { name: "Low Mid", f: 250, q: 1.4, g: 0.0, type: "peaking", fRange: [200, 315] },
  { name: "Mid", f: 400, q: 1.4, g: 0.0, type: "peaking", fRange: [315, 500] },
  { name: "Upper Mid", f: 630, q: 1.4, g: 0.0, type: "peaking", fRange: [500, 800] },
  { name: "High Mid", f: 1000, q: 1.4, g: 0.0, type: "peaking", fRange: [800, 1250] },
  { name: "Presence", f: 1600, q: 1.4, g: 0.0, type: "peaking", fRange: [1250, 2000] },
  { name: "Up Pres.", f: 2500, q: 1.4, g: 0.0, type: "peaking", fRange: [2000, 3150] },
  { name: "Clarity", f: 4000, q: 1.4, g: 0.0, type: "peaking", fRange: [3150, 5000] },
  { name: "Highs", f: 6300, q: 1.4, g: 0.0, type: "peaking", fRange: [5000, 8000] },
  { name: "Air", f: 10000, q: 1.4, g: 0.0, type: "peaking", fRange: [8000, 12500] },
  { name: "Sparkle", f: 16000, q: 1.4, g: 0.0, type: "peaking", fRange: [12500, 20000] },
];
`;

code = code.replace(/const defaultEq = { low: 0, mid: 0, high: 0 };/g, eqBands);

code = code.replace(/const \[eqs, setEqs\] = useState[^;]+;/g, 'const [masterEq, setMasterEq] = useState(EQ_BANDS_DEFAULT);');
code = code.replace(/const eqNodesRef = useRef[^;]+;/g, 'const masterEqNodesRef = useRef<BiquadFilterNode[]>([]);');

// Replace initAudio eq setup
const initAudioSetup = `      const master = ctx.createGain();
      masterGainRef.current = master;
      let prevNode: AudioNode = master;
      masterEqNodesRef.current = EQ_BANDS_DEFAULT.map(band => {
         const bq = ctx.createBiquadFilter();
         bq.type = band.type as any;
         bq.frequency.value = band.f;
         bq.Q.value = band.q;
         bq.gain.value = band.g;
         prevNode.connect(bq);
         prevNode = bq;
         return bq;
      });
      prevNode.connect(ctx.destination);`;

code = code.replace(/      const master = ctx\.createGain\(\);\s+master\.connect\(ctx\.destination\);\s+masterGainRef\.current = master;/, initAudioSetup);

// Replace per stem eq setup
const oldStemEqSetup = `        const lowEq = ctx.createBiquadFilter();
        lowEq.type = "lowshelf";
        lowEq.frequency.value = 250;
        
        const midEq = ctx.createBiquadFilter();
        midEq.type = "peaking";
        midEq.frequency.value = 1000;
        midEq.Q.value = 1;
        
        const highEq = ctx.createBiquadFilter();
        highEq.type = "highshelf";
        highEq.frequency.value = 4000;
        
        eqNodesRef.current\\[stem\\] = { low: lowEq, mid: midEq, high: highEq };

        const gain = ctx.createGain();
        gainNodesRef.current\\[stem\\] = gain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.85;
        analysersRef.current\\[stem\\] = analyser;

        source.connect\\(lowEq\\);
        lowEq.connect\\(midEq\\);
        midEq.connect\\(highEq\\);
        highEq.connect\\(analyser\\);
        analyser.connect\\(gain\\);
        gain.connect\\(master\\);`;

const newStemEqSetup = `        const gain = ctx.createGain();
        gainNodesRef.current[stem] = gain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.85;
        analysersRef.current[stem] = analyser;

        source.connect(analyser);
        analyser.connect(gain);
        gain.connect(master);`;

// Let's do string replacement for oldStemEqSetup by finding 'const lowEq = ctx.createBiquadFilter();'
