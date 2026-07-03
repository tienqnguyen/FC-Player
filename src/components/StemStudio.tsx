import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Settings2, Download, Maximize2, Minimize2, Radio, Activity, Sliders, ArrowLeft, Plus, Loader2 } from 'lucide-react';

interface StemStudioProps {
  stemUrls?: { vocals?: string | null; drums?: string | null; bass?: string | null; guitar?: string | null; piano?: string | null; other?: string | null } | null;
  songTitle: string;
  originalDuration?: number;
  onClose: () => void;
  isEmbedded?: boolean;
  isCompactUI?: boolean;
  stemmixStatus?: "idle" | "loading" | "ready" | "error";
  stemmixError?: string | null;
  onRetrySeparate?: () => void;
  separationMode?: "webgpu" | "ai";
  onSetSeparationMode?: (mode: "webgpu" | "ai") => void;
}

const STEM_COLORS: Record<string, string> = {
  vocals: "#EC4899", // pink
  drums: "#F97316", // orange
  bass: "#8B5CF6", // purple
  guitar: "#06B6D4", // cyan
  piano: "#EAB308", // yellow
  other: "#10B981"  // green
};

// 3-band EQ defaults
const defaultEq = { low: 0, mid: 0, high: 0 };

export default function StemStudio({ 
  stemUrls, 
  songTitle, 
  originalDuration, 
  onClose, 
  isEmbedded, 
  isCompactUI,
  stemmixStatus = "ready",
  stemmixError = null,
  onRetrySeparate,
  separationMode = "webgpu",
  onSetSeparationMode
}: StemStudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHD, setIsHD] = useState(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_is_signature_sound");
      return saved === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("acoustic_presence_is_signature_sound", String(isHD));
    } catch {}
  }, [isHD]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [volumes, setVolumes] = useState<Record<string, number>>({
    vocals: 0.8, drums: 0.8, bass: 0.8, guitar: 0.8, piano: 0.8, other: 0.8
  });
  const [mutes, setMutes] = useState<Record<string, boolean>>({
    vocals: false, drums: false, bass: false, guitar: false, piano: false, other: false
  });
  const [solos, setSolos] = useState<Record<string, boolean>>({
    vocals: false, drums: false, bass: false, guitar: false, piano: false, other: false
  });
  
  // EQ states (-12 to 12 dB)
  const [eqs, setEqs] = useState<Record<string, {low: number, mid: number, high: number}>>({
    vocals: {...defaultEq}, drums: {...defaultEq}, bass: {...defaultEq}, 
    guitar: {...defaultEq}, piano: {...defaultEq}, other: {...defaultEq}
  });
  
  const [masterEq, setMasterEq] = useState([
    { name: "Deep Sub", f: 25, g: 0, type: "peaking" },
    { name: "Sub", f: 40, g: 0, type: "peaking" },
    { name: "Low Bass", f: 63, g: 0, type: "peaking" },
    { name: "Bass", f: 100, g: 0, type: "peaking" },
    { name: "Upper Bass", f: 160, g: 0, type: "peaking" },
    { name: "Low Mid", f: 250, g: 0, type: "peaking" },
    { name: "Mid", f: 400, g: 0, type: "peaking" },
    { name: "Upper Mid", f: 630, g: 0, type: "peaking" },
    { name: "High Mid", f: 1000, g: 0, type: "peaking" },
    { name: "Presence", f: 1600, g: 0, type: "peaking" },
    { name: "Up Pres.", f: 2500, g: 0, type: "peaking" },
    { name: "Clarity", f: 4000, g: 0, type: "peaking" },
    { name: "Highs", f: 6300, g: 0, type: "peaking" },
    { name: "Air", f: 10000, g: 0, type: "peaking" },
    { name: "Sparkle", f: 16000, g: 0, type: "highshelf" }
  ]);
  
  const [activeTab, setActiveTab] = useState<'mixer' | 'eq'>('mixer');

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(originalDuration || 0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const masterEqNodesRef = useRef<BiquadFilterNode[]>([]);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const eqNodesRef = useRef<Record<string, {low: BiquadFilterNode, mid: BiquadFilterNode, high: BiquadFilterNode}>>({});
  const analysersRef = useRef<Record<string, AnalyserNode>>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stemCanvasRefs = useRef<Record<string, HTMLCanvasElement>>({});
  const requestRef = useRef<number>(0);
  const initAttemptedRef = useRef(false);

  const stemsList = stemUrls ? Object.keys(stemUrls).filter(k => k !== 'isDspFallback' && (stemUrls as any)[k]) : [];
  const isDspFallback = !!(stemUrls && (stemUrls as any).isDspFallback);

  useEffect(() => {
    if (loadedCount >= stemsList.length && stemsList.length > 0) {
      setIsLoadingAudio(false);
    }
  }, [loadedCount, stemsList.length]);

  useEffect(() => {
    stemsList.forEach(stem => {
      const url = (stemUrls as any)[stem];
      if (url && !audioElementsRef.current[stem]) {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        audio.loop = false;
        
        // Fetch as blob to prevent range request issues with large WAV files
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                audio.src = objectUrl;
                audio.load();
            })
            .catch(err => {
                console.error(`Failed to fetch stem ${stem}:`, err);
            });
        
        audio.addEventListener('error', (e) => {
            console.error(`Audio error for stem ${stem}:`, audio.error);
        });
        
        const handleCanPlay = () => {
            console.log(`Audio canplay for stem ${stem}`);
            setLoadedCount(prev => prev + 1);
        };
        if (audio.readyState >= 3) {
            handleCanPlay();
        } else {
            audio.addEventListener('canplay', handleCanPlay, { once: true });
        }

        audio.addEventListener('timeupdate', () => {
           const primaryStem = stemsList.includes('vocals') ? 'vocals' : stemsList[0];
           if (stem === primaryStem) {
               setCurrentTime(audio.currentTime);
           }
        });
        audio.addEventListener('loadedmetadata', () => {
           if (isFinite(audio.duration)) {
               setDuration(prev => Math.max(prev, audio.duration));
           }
        });
        audio.addEventListener('ended', () => {
           const primaryStem = stemsList.includes('vocals') ? 'vocals' : stemsList[0];
           if (stem === primaryStem) {
               setIsPlaying(false);
           }
        });
        
        audioElementsRef.current[stem] = audio;
        audio.load();
      }
    });

    return () => {
      cancelAnimationFrame(requestRef.current);
      Object.values(audioElementsRef.current).forEach((a: any) => {
        a.pause();
        a.removeAttribute("src");
      });
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [stemUrls]);

  const initAudio = () => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const master = ctx.createGain();
      masterGainRef.current = master;

      // Create master EQ filter nodes
      const bands = [
        { name: "Deep Sub", f: 25, type: "peaking" },
        { name: "Sub", f: 40, type: "peaking" },
        { name: "Low Bass", f: 63, type: "peaking" },
        { name: "Bass", f: 100, type: "peaking" },
        { name: "Upper Bass", f: 160, type: "peaking" },
        { name: "Low Mid", f: 250, type: "peaking" },
        { name: "Mid", f: 400, type: "peaking" },
        { name: "Upper Mid", f: 630, type: "peaking" },
        { name: "High Mid", f: 1000, type: "peaking" },
        { name: "Presence", f: 1600, type: "peaking" },
        { name: "Up Pres.", f: 2500, type: "peaking" },
        { name: "Clarity", f: 4000, type: "peaking" },
        { name: "Highs", f: 6300, type: "peaking" },
        { name: "Air", f: 10000, type: "peaking" },
        { name: "Sparkle", f: 16000, type: "highshelf" }
      ];

      const eqNodes = bands.map((b, idx) => {
        const filter = ctx.createBiquadFilter();
        filter.type = b.type as BiquadFilterType;
        filter.frequency.value = b.f;
        filter.Q.value = 1.0;
        filter.gain.value = masterEq[idx]?.g || 0;
        return filter;
      });

      masterEqNodesRef.current = eqNodes;

      // Connect master -> eqFilters -> destination
      let lastNode: AudioNode = master;
      eqNodes.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
      });
      lastNode.connect(ctx.destination);

      stemsList.forEach(stem => {
        const audio = audioElementsRef.current[stem];
        if (!audio) return;
        
        const source = ctx.createMediaElementSource(audio);
        
        // EQ Nodes
                const gain = ctx.createGain();
        gainNodesRef.current[stem] = gain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.85;
        analysersRef.current[stem] = analyser;

        let audioNode: AudioNode = source;
        if (isDspFallback) {
          if (stem === "bass") {
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 140;
            lp.Q.value = 1.2;
            audioNode.connect(lp);
            audioNode = lp;
          } else if (stem === "vocals") {
            const hp = ctx.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = 280;
            
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 3500;
            
            audioNode.connect(hp);
            hp.connect(lp);
            audioNode = lp;
          } else if (stem === "drums") {
            const hp = ctx.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = 4500;
            audioNode.connect(hp);
            audioNode = hp;
          } else if (stem === "guitar") {
            const bp = ctx.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = 1500;
            bp.Q.value = 0.8;
            audioNode.connect(bp);
            audioNode = bp;
          } else if (stem === "piano") {
            const bp = ctx.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = 650;
            bp.Q.value = 0.8;
            audioNode.connect(bp);
            audioNode = bp;
          } else if (stem === "other") {
            const hp = ctx.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = 80;
            audioNode.connect(hp);
            audioNode = hp;
          }
        }

        audioNode.connect(analyser);
        analyser.connect(gain);
        gain.connect(master);
      });

      renderLoop();
    } catch (e) {
      console.error("Audio API error:", e);
    }
  };

  const renderLoop = () => {
    // Render master visualizer
    if (canvasRef.current && audioContextRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.45;

        // Dark fade for trails
        ctx.fillStyle = "rgba(10, 10, 12, 0.4)";
        ctx.fillRect(0, 0, width, height);

        stemsList.forEach((stem, index) => {
          const analyser = analysersRef.current[stem];
          if (!analyser) return;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          const color = STEM_COLORS[stem] || "#ffffff";
          const isMuted = mutes[stem] || (Object.values(solos).some(v=>v) && !solos[stem]) || volumes[stem] === 0;

          // Base radius for this stem
          const radiusStep = maxRadius / stemsList.length;
          const baseRadius = radiusStep * (index + 1);
          
          ctx.beginPath();
          for (let i = 0; i < bufferLength; i++) {
            const v = isMuted ? 0 : dataArray[i] / 255.0; // 0 to 1
            // Smooth the response
            const boost = Math.pow(v, 1.5) * radiusStep * 1.5; 
            
            const r = baseRadius + boost;
            const angle = (i / bufferLength) * Math.PI * 2 - Math.PI / 2;
            
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
          }
          
          ctx.closePath();
          
          if (isMuted) {
              ctx.strokeStyle = `${color}40`; // 25% opacity
              ctx.lineWidth = 1;
          } else {
              ctx.strokeStyle = color;
              ctx.lineWidth = 2.5;
              ctx.shadowBlur = 15;
              ctx.shadowColor = color;
          }
          
          ctx.stroke();
          
          // Reset shadow for next draw
          ctx.shadowBlur = 0;
        });
      }
    }

    // Render individual waveforms
    stemsList.forEach((stem) => {
      const sCanvas = stemCanvasRefs.current[stem];
      if (!sCanvas) return;
      const sCtx = sCanvas.getContext('2d');
      if (!sCtx) return;

      const w = sCanvas.width;
      const h = sCanvas.height;

      // Clear the canvas
      sCtx.fillStyle = '#0f0f12';
      sCtx.fillRect(0, 0, w, h);

      const analyser = analysersRef.current[stem];
      if (!analyser) {
        // Just draw a static flat line if audio not initialized
        sCtx.beginPath();
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        sCtx.lineWidth = 2;
        sCtx.moveTo(0, h / 2);
        sCtx.lineTo(w, h / 2);
        sCtx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      const color = STEM_COLORS[stem] || "#ffffff";
      const isMuted = mutes[stem] || (Object.values(solos).some(v=>v) && !solos[stem]) || volumes[stem] === 0;

      // Draw symmetrical professional waveform bars
      sCtx.lineWidth = 2.5;
      sCtx.lineCap = 'round';

      const barCount = 64;
      const barWidth = w / barCount;
      const spacing = 3;

      for (let i = 0; i < barCount; i++) {
        // Map bar index to time domain indices
        const dataIdx = Math.floor((i / barCount) * bufferLength);
        let val = (dataArray[dataIdx] - 128) / 128; // -1.0 to 1.0

        if (isMuted || !isPlaying) {
          // Subtle idle oscillation
          val = isPlaying && !isMuted ? 0.05 : (Math.sin(i * 0.2 + Date.now() * 0.003) * 0.04);
        }

        const barHeight = Math.max(3, Math.abs(val) * h * 0.9);
        const x = i * barWidth + spacing / 2;
        const yTop = (h - barHeight) / 2;

        sCtx.beginPath();
        sCtx.strokeStyle = isMuted ? 'rgba(255, 255, 255, 0.06)' : color;
        
        if (!isMuted && isPlaying) {
          sCtx.shadowBlur = 6;
          sCtx.shadowColor = color;
        } else {
          sCtx.shadowBlur = 0;
        }

        sCtx.moveTo(x, yTop);
        sCtx.lineTo(x, yTop + barHeight);
        sCtx.stroke();
      }
      sCtx.shadowBlur = 0;
    });

    requestRef.current = requestAnimationFrame(renderLoop);
  };

  useEffect(() => {
    // Volume & Mute/Solo logic
    const anySolo = Object.values(solos).some(v => v);

    stemsList.forEach(stem => {
      const gainNode = gainNodesRef.current[stem];
      if (!gainNode) return;

      let finalGain = volumes[stem];
      if (mutes[stem]) finalGain = 0;
      if (anySolo && !solos[stem]) finalGain = 0;

      gainNode.gain.setTargetAtTime(finalGain, audioContextRef.current?.currentTime || 0, 0.05);
      
      
    });
  }, [volumes, mutes, solos]);
  useEffect(() => {
    masterEqNodesRef.current.forEach((node, i) => {
       const band = masterEq[i];
       if (!node || !band) return;
       // Premium HD frequency boosts:
       // - Low bass / Punchy sub (<= 100Hz) +2.5 dB
       // - Treble sparkle / Air (>= 6300Hz) +3.5 dB
       // - Vocal presence / Clarity (1600Hz, 2500Hz, 4000Hz) +2.0 dB
       let boost = 0;
       if (isHD) {
         if (band.f <= 100) boost = 2.5;
         else if (band.f >= 6300) boost = 3.5;
         else if (band.f === 1600 || band.f === 2500 || band.f === 4000) boost = 2.0;
       }
       node.gain.setTargetAtTime(band.g + boost, audioContextRef.current?.currentTime || 0, 0.05);
    });
  }, [masterEq, isHD]);


  const togglePlay = () => {
    if (!initAttemptedRef.current) initAudio();
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      Object.values(audioElementsRef.current).forEach((a: any) => a.pause());
    } else {
      Object.values(audioElementsRef.current).forEach((a: any) => {
        try {
            a.currentTime = currentTime;
        } catch (err) {}
        a.play().catch((e: any) => {
          if (e.name !== 'AbortError') console.error("Playback failed:", e);
        });
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      Object.values(audioElementsRef.current).forEach((a: any) => {
          a.currentTime = time;
      });
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth * window.devicePixelRatio;
        canvasRef.current.height = canvasRef.current.clientHeight * window.devicePixelRatio;
      }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderEqBand = (band: { name: string; f: number; g: number }, idx: number) => {
    const isChanged = band.g !== 0;
    const displayVal = band.g > 0 ? `+${band.g.toFixed(1)}` : band.g.toFixed(1);
    return (
      <div key={band.name + idx} className="flex flex-col items-center justify-center gap-1.5 shrink-0 group w-full">
        {/* dB Value Label */}
        <div className={`text-[9px] font-mono font-bold tracking-wider h-3 flex items-center justify-center text-center transition-colors ${isChanged ? 'text-amber-400 font-extrabold' : 'text-white/30'}`}>
          {displayVal}
        </div>
        
        {/* Slider Track Wrapper */}
        <div className="relative w-6 h-[72px] flex items-center justify-center my-1">
            {/* Background Line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-black/60 rounded-full border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,1)]" />
            
            {/* Active Positive Fill Indicator */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-[4px] rounded-full bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.5)] pointer-events-none transition-all duration-200"
               style={{
                 height: `${band.g > 0 ? (band.g / 12) * 50 : 0}%`,
                 bottom: '50%'
              }}
             />
            {/* Active Negative Fill Indicator */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-[4px] rounded-full bg-white/10 pointer-events-none transition-all duration-200"
               style={{
                 height: `${band.g < 0 ? Math.abs(band.g / 12) * 50 : 0}%`,
                 top: '50%'
              }}
             />
            
            <input
               type="range"
               min="-12"
               max="12"
               step="0.1"
               value={band.g || 0}
               onChange={(e) => {
                 const val = parseFloat(e.target.value);
                 const newEq = [...masterEq];
                 newEq[idx].g = val;
                 setMasterEq(newEq);
               }}
               className="w-full h-full bg-transparent appearance-none cursor-grab active:cursor-grabbing absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !origin-center -rotate-90 slider-vertical-glass-sm"
               style={{ width: '72px', height: '24px' }}
            />
        </div>
        
        {/* Band Name Label */}
        <div className={`text-[9px] font-bold tracking-tight text-center leading-none transition-colors truncate w-full px-0.5 ${isChanged ? 'text-amber-400 font-extrabold' : 'text-white/30'}`}>
          {band.name}
        </div>
      </div>
    );
  };

  return (
    <div className={isEmbedded ? "w-full h-full bg-gradient-to-b from-[#0F111A] to-[#08090F] flex flex-col text-white overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative" : "fixed inset-0 z-[100] bg-gradient-to-b from-[#0F111A] to-[#08090F] flex flex-col text-white overflow-hidden animate-in fade-in duration-500 relative"}>
       {/* Ambient Studio Lighting Glows */}
       <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-400/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />
       <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-[150px] pointer-events-none z-0" />
       
       {/* HEADER BAR */}
       <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/5 bg-[#07080D]/90 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
             {!isEmbedded ? (
                <button onClick={onClose} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors text-[10px] font-black tracking-widest uppercase">
                   <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
             ) : (
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                   <ArrowLeft className="w-4 h-4" />
                </button>
             )}
             <span className="text-[9px] font-black tracking-[0.15em] text-amber-400 uppercase bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10 hidden xs:inline-block">
                Stem Studio
             </span>
             <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-[280px] leading-none" title={songTitle}>
                   {songTitle}
                </h2>
             </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
             {/* Engine Toggle Selection */}
             <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-full border border-white/5 mr-1">
                <button
                   onClick={() => onSetSeparationMode?.("webgpu")}
                   className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 ${
                     separationMode === "webgpu"
                       ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                       : "text-white/40 hover:text-white/70"
                   }`}
                   title="Use high-performance client-side WebGPU DSP isolation"
                >
                   ⚡ WebGPU
                </button>
                <button
                   onClick={() => onSetSeparationMode?.("ai")}
                   className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 ${
                     separationMode === "ai"
                       ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                       : "text-white/40 hover:text-white/70"
                   }`}
                   title="Use server-side deep learning AI models"
                >
                   🤖 AI Cloud
                </button>
             </div>

             {isDspFallback && (
                <div className="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-400/5 px-2.5 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1 animate-pulse">
                   <Radio className="w-2.5 h-2.5 text-amber-400" /> Acoustic DSP Local
                </div>
             )}
             <div className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded-full border border-emerald-400/10 flex items-center gap-1 hidden md:flex">
                <Activity className="w-2.5 h-2.5 animate-pulse" /> WebGPU Active
             </div>
             <button 
                onClick={() => setIsHD(!isHD)}
                className={`flex items-center justify-center px-3 py-1.5 rounded-full border text-[9px] font-black tracking-widest uppercase transition-all duration-300 active:scale-95 ${
                  isHD 
                    ? 'border-amber-400/40 bg-amber-400/10 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]' 
                    : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
                }`}
                title="Toggle Lossless HD Audio"
             >
                HD
             </button>
             <button 
                disabled={stemmixStatus !== "ready"}
                className={`flex items-center gap-1 text-[9px] font-black tracking-widest uppercase px-3.5 py-1.5 rounded-full transition-colors shadow-lg ${
                   stemmixStatus === "ready"
                     ? "bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/10"
                     : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed shadow-none"
                }`}
             >
                <Download className="w-3 h-3" /> Export Mix
             </button>
          </div>
       </div>

       {/* SCROLLABLE CONTENT BODY */}
       <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-4 md:p-5 flex flex-col gap-5 custom-scrollbar bg-transparent z-10">
          
          {stemmixStatus !== "ready" ? (
             <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto animate-in fade-in duration-500">
                {stemmixStatus === "loading" || stemmixStatus === "idle" ? (
                   <div className="flex flex-col items-center justify-center py-12 px-4 text-white/50">
                      <div className="w-12 h-12 border-4 border-amber-400 rounded-full border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(251,191,36,0.2)]" />
                      <h3 className="text-sm sm:text-base tracking-[0.2em] uppercase font-black text-amber-400 mb-2 animate-pulse">{separationMode === "webgpu" ? "WebGPU DSP Processing..." : "AI Processing Stems..."}</h3>
                      <p className="text-[11px] sm:text-xs text-white/40 text-center max-w-sm leading-relaxed">
                         {separationMode === "webgpu" ? "Compiling custom WGSL audio shaders & running 31-tap parallel FIR filters on your local GPU. Pure local acceleration." : "Extracting vocals, drums, bass, guitar, and instrumentals using advanced AI separation models. This may take up to 2 minutes..."}
                      </p>
                      <div className="w-48 h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden border border-white/5">
                         <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full animate-pulse" style={{ width: separationMode === "webgpu" ? '85%' : '60%' }} />
                      </div>
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
                         <X className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm sm:text-base tracking-[0.2em] uppercase font-black text-red-400 mb-2">Separation Failed</h3>
                      <p className="text-[11px] sm:text-xs text-white/40 text-center max-w-sm leading-relaxed mb-6 font-sans">
                         {stemmixError || "An unexpected error occurred during processing."}
                      </p>
                      {onRetrySeparate && (
                         <button 
                            type="button"
                            onClick={onRetrySeparate} 
                            className="text-[10px] tracking-widest uppercase font-black border-2 border-amber-400 text-amber-400 bg-amber-400/5 px-6 py-2 rounded-full hover:bg-amber-400 hover:text-black transition-all active:scale-95 shadow-lg shadow-amber-400/5"
                         >
                            Retry Separation
                         </button>
                      )}
                   </div>
                )}
             </div>
          ) : (
             <>
                {/* COMPACT INTEGRATED PLAYER ABOVE VOLUMES */}
          <div className="bg-[#0A0A0C]/90 border border-white/5 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start shrink-0 relative overflow-hidden shadow-xl shadow-black/30">
             {/* Subtle Glow */}
             <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
             
             {/* Mini Visualizer Canvas */}
             <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden relative border border-white/10 bg-[#1A1C23] shrink-0 shadow-md">
                <canvas 
                   ref={canvasRef} 
                   className="w-full h-full absolute inset-0 z-10"
                   style={{ mixBlendMode: 'screen' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-20 flex items-end p-1.5 pointer-events-none">
                   <span className="text-[7px] font-mono font-bold text-white/50 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping" />
                      Live Feed
                   </span>
                </div>
             </div>

             {/* Player Controls & Info */}
             <div className="flex-1 w-full flex flex-col justify-between h-full gap-2.5">
                <div className="text-center sm:text-left min-w-0">
                   <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      <span className="text-[7px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 py-0.2 rounded uppercase">StemMix v2</span>
                      <span className="text-[8px] text-white/40 font-mono">Uncompressed Audio Link</span>
                   </div>
                   <h3 className="text-xs sm:text-sm font-extrabold text-white truncate mt-1 leading-tight" title={songTitle}>
                      {songTitle}
                   </h3>
                </div>

                {/* Transport / Seeker Bar Row */}
                <div className="flex flex-col xs:flex-row items-center justify-between gap-3 bg-black/40 p-2 sm:p-2.5 rounded-xl border border-white/[0.03]">
                   <div className="flex items-center gap-2 shrink-0">
                      <button 
                         onClick={togglePlay}
                         className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
                         title={isPlaying ? "Pause" : "Play"}
                      >
                         {isLoadingAudio ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                         ) : isPlaying ? (
                            <Pause className="w-3.5 h-3.5 text-black fill-black" />
                         ) : (
                            <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                         )}
                      </button>

                      {isLoadingAudio ? (
                         <div className="flex flex-col min-w-0 leading-tight">
                            <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider animate-pulse">Buffering...</span>
                            <span className="text-[7px] text-white/30 truncate font-mono">Stems: {loadedCount}/{stemsList.length}</span>
                         </div>
                      ) : (
                         <div className="flex flex-col min-w-0 leading-tight">
                            <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">{isPlaying ? "PLAYING" : "PAUSED"}</span>
                            <span className="text-[7px] text-white/30 truncate font-mono">Biquad Filter EQ Ready</span>
                         </div>
                      )}
                   </div>

                   {/* Seeker */}
                   <div className="w-full xs:flex-1 max-w-full xs:max-w-[180px] sm:max-w-[220px] flex items-center gap-1.5 text-[8px] font-mono text-white/40 shrink-0">
                      <span>{formatTime(currentTime)}</span>
                      <input 
                         type="range" 
                         min={0} max={duration || 100} 
                         value={currentTime} 
                         onChange={handleSeek}
                         className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400"
                      />
                      <span>{formatTime(duration)}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* STEM VOLUMES MIXER */}
          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase">Stem Volumes</h3>
                <span className="text-[9px] font-mono font-medium text-white/30">{stemsList.length} Tracks Loaded</span>
             </div>
             
             <div className="flex flex-col gap-2.5">
                {stemsList.map(stem => (
                   <div key={stem} className="w-full bg-[#0E0E12]/80 border border-white/5 hover:border-white/10 hover:bg-[#111116] rounded-2xl p-3 flex flex-col md:flex-row md:items-center gap-4 transition-all duration-300 group">
                      
                      {/* Left: Icon, Name & M/S controls */}
                      <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto shrink-0">
                         <div className="flex items-center gap-3 w-36">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/50 border border-white/5 transition-colors group-hover:bg-black/70 shadow-inner" style={{ color: STEM_COLORS[stem] || '#fff' }}>
                                 {stem === 'vocals' && <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>}
                                 {stem === 'drums' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}
                                 {stem === 'bass' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><path d="M6 15H3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2Z"/><path d="M18 13h-3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2Z"/></svg>}
                                 {stem === 'guitar' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 8v8"/><path d="M12 8v8"/><path d="M16 8v8"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>}
                                 {stem === 'piano' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M6 5v14"/><path d="M10 5v14"/><path d="M14 5v14"/><path d="M18 5v14"/></svg>}
                                 {stem === 'other' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className="text-xs font-black uppercase tracking-wider text-white truncate" style={{ textShadow: `0 0 8px ${(STEM_COLORS[stem] || '#fff')}33` }}>{stem}</span>
                               <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Track {stemsList.indexOf(stem) + 1}</span>
                            </div>
                         </div>

                         {/* Mute / Solo buttons */}
                         <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                             <button
                                onClick={() => setMutes(p => ({...p, [stem]: !p[stem]}))}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${mutes[stem] ? 'bg-red-500 text-black shadow-md shadow-red-500/20 border-red-500 font-extrabold' : 'bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                                title="Mute Track"
                             >
                                M
                             </button>
                             <button
                                onClick={() => setSolos(p => ({...p, [stem]: !p[stem]}))}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${solos[stem] ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/20 border-yellow-500 font-extrabold' : 'bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                                title="Solo Track"
                             >
                                S
                             </button>
                         </div>
                      </div>

                      {/* Middle: Beautiful Flowing Waveform Canvas */}
                      <div className="flex-1 h-12 bg-black/40 border border-white/5 rounded-xl overflow-hidden relative group-hover:border-white/10 transition-colors">
                         <canvas
                            ref={(el) => {
                              if (el) {
                                stemCanvasRefs.current[stem] = el;
                              } else {
                                delete stemCanvasRefs.current[stem];
                              }
                            }}
                            width={350}
                            height={48}
                            className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                         />
                         {/* Decorative Grid Lines */}
                         <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px]" />
                      </div>

                      {/* Right: Vol Slider with Percent Display */}
                      <div className="flex items-center gap-3.5 w-full md:w-56 shrink-0 bg-black/20 p-2 rounded-xl border border-white/5">
                         <svg className="w-4 h-4 text-white/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                         <div className="flex-1 relative flex items-center">
                            <input
                               type="range"
                               min="0" max="1" step="0.01"
                               value={volumes[stem]}
                               onChange={(e) => setVolumes(p => ({...p, [stem]: parseFloat(e.target.value)}))}
                               className="w-full h-1.5 rounded-lg appearance-none bg-white/10 cursor-pointer accent-amber-400 focus:outline-none"
                               style={{
                                 background: `linear-gradient(to right, ${STEM_COLORS[stem] || '#fbbf24'} 0%, ${STEM_COLORS[stem] || '#fbbf24'} ${volumes[stem] * 100}%, rgba(255,255,255,0.1) ${volumes[stem] * 100}%, rgba(255,255,255,0.1) 100%)`
                               }}
                            />
                         </div>
                         <div className="w-10 text-right text-[11px] font-black font-mono tracking-tight shrink-0" style={{ color: STEM_COLORS[stem] || '#fff' }}>
                            {Math.round(volumes[stem] * 100)}%
                         </div>
                      </div>

                   </div>
                ))}
             </div>
          </div>

          {/* EQUALIZER */}
          <div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
             <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase">Master Equalizer</h3>
                <button 
                   onClick={() => {
                      const newEq = masterEq.map((b) => ({ ...b, g: 0 }));
                      setMasterEq(newEq);
                   }}
                   className="text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                >
                   Reset
                </button>
             </div>
             
             {/* 3 Rows of 5 Bands Grid */}
             <div className="flex flex-col gap-4 py-1.5">
                {/* Row 1: Deep Sub, Sub, Low Bass, Bass, Upper Bass */}
                <div className="grid grid-cols-5 gap-2.5 place-items-center">
                   {masterEq.slice(0, 5).map((band, i) => renderEqBand(band, i))}
                </div>
                
                {/* Row 2: Low Mid, Mid, Upper Mid, High Mid, Presence */}
                <div className="grid grid-cols-5 gap-2.5 place-items-center">
                   {masterEq.slice(5, 10).map((band, i) => renderEqBand(band, i + 5))}
                </div>
                
                {/* Row 3: Up Pres., Clarity, Highs, Air, Sparkle */}
                <div className="grid grid-cols-5 gap-2.5 place-items-center">
                   {masterEq.slice(10, 15).map((band, i) => renderEqBand(band, i + 10))}
                </div>
             </div>
          </div>
          </>
         )}

       </div>

    </div>
  );
}
