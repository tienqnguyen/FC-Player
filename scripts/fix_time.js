import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove progress state usage to avoid re-renders
content = content.replace('const [progress, setProgress] = useState(0);', '');

// Remove setProgress calls
content = content.replace(/setProgress\(0\);/g, '');
content = content.replace(/setProgress\(isNaN\(p\) \? 0 : p\);/g, '');


// 2. Add refs for DOM manipulation
const refsOld = `  const analyserRef = useRef<AnalyserNode | null>(null);`;
const refsNew = `  const analyserRef = useRef<AnalyserNode | null>(null);
  const progressBarRef1 = useRef<HTMLDivElement>(null);
  const progressBarRef2 = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLSpanElement>(null);`;
content = content.replace(refsOld, refsNew);

// 3. Update handleTimeUpdate to write to DOM
const timeUpdateOld = `  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p =
        (audioRef.current.currentTime / audioRef.current.duration) * 100;
    }
  };`;
const timeUpdateNew = `  const handleTimeUpdate = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      const p = (currentTime / duration) * 100;
      const progressPercent = isNaN(p) ? 0 : p;
      if (progressBarRef1.current) progressBarRef1.current.style.width = \`\${progressPercent}%\`;
      if (progressBarRef2.current) progressBarRef2.current.style.width = \`\${progressPercent}%\`;
      if (currentTimeRef.current) currentTimeRef.current.innerText = formatDurationDisplay(currentTime);
    }
  };`;
content = content.replace(timeUpdateOld, timeUpdateNew);

// 4. Update elements to use refs
const bar1Old = `<div className="h-full bg-white transition-all duration-150" style={{ width: \`\${progress}%\` }} />`;
const bar1New = `<div ref={progressBarRef1} className="h-full bg-white transition-none" style={{ width: '0%' }} />`;
content = content.replace(bar1Old, bar1New);

// note: width is now updated manually and transition-all might be removed to save repaint delay, but keep it if we want.

const bar2Old = `<div className="h-full bg-white rounded-full pointer-events-none relative" style={{ width: \`\${progress}%\` }}>`;
const bar2New = `<div ref={progressBarRef2} className="h-full bg-white rounded-full pointer-events-none relative transition-none" style={{ width: '0%' }}>`;
content = content.replace(bar2Old, bar2New);

const timeOld = `<span>{audioRef.current ? formatDurationDisplay(audioRef.current.currentTime) : "0:00"}</span>`;
const timeNew = `<span ref={currentTimeRef}>0:00</span>`;
content = content.replace(timeOld, timeNew);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx with ref-based timeupdate");
