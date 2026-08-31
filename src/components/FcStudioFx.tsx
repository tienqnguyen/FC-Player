import React, { useState, useEffect, useRef } from 'react';
import { X, Power, Zap, Mic, Waves, Maximize, Sliders } from 'lucide-react';

export interface FcStudioFxProps {
  onClose: () => void;
  isOpen?: boolean;
  audioCtx: AudioContext | null;
  inputNode: AudioNode | null;
  outputNode: AudioNode | null;
  isBypassed: boolean;
  onBypassChange: (b: boolean) => void;
}

export function FcStudioFx({ onClose, isOpen = true, audioCtx, inputNode, outputNode, isBypassed, onBypassChange }: FcStudioFxProps) {
  const bypass = isBypassed;
  const setBypass = onBypassChange;
  // Modules active state
  const [compActive, setCompActive] = useState(true);
  const [vocalActive, setVocalActive] = useState(true);
  const [modActive, setModActive] = useState(false);
  const [masterActive, setMasterActive] = useState(true);

  // VCA Compressor
  const [compThresh, setCompThresh] = useState(-24); // -60 to 0
  const [compRatio, setCompRatio] = useState(4); // 1 to 20
  const [compAttack, setCompAttack] = useState(15); // 1 to 100 ms
  const [compMakeup, setCompMakeup] = useState(2); // 0 to 24 dB

  // Vocal Polish
  const [deEsser, setDeEsser] = useState(40); // 0 to 100
  const [air, setAir] = useState(50); // 0 to 100
  const [exciter, setExciter] = useState(20); // 0 to 100

  // Modulation (Phaser)
  const [modRate, setModRate] = useState(2); // 0.1 to 10 Hz
  const [modDepth, setModDepth] = useState(60); // 0 to 100

  // Mastering
  const [stereoWidth, setStereoWidth] = useState(130); // 0 to 200%
  const [limitThresh, setLimitThresh] = useState(-2); // -20 to 0 dB

  const nodesRef = useRef<any>({});

  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode) return;

    const ctx = audioCtx;

    // Helper to create module routing
    const createModule = () => {
      const In = ctx.createGain();
      const Out = ctx.createGain();
      const Dry = ctx.createGain();
      const Wet = ctx.createGain();
      In.connect(Dry);
      Dry.connect(Out);
      Wet.connect(Out);
      return { In, Out, Dry, Wet };
    };

    const mod1 = createModule(); // Comp
    const mod2 = createModule(); // Vocal
    const mod3 = createModule(); // Mod
    const mod4 = createModule(); // Master

    // Disconnect any existing routing to prevent duplicates
    try { inputNode.disconnect(); } catch (e) {}
    try { mod1.Out.disconnect(); } catch (e) {}
    try { mod2.Out.disconnect(); } catch (e) {}
    try { mod3.Out.disconnect(); } catch (e) {}
    try { mod4.Out.disconnect(); } catch (e) {}

    // Serial Routing
    if (bypass) {
        inputNode.connect(outputNode);
    } else {
        inputNode.connect(mod1.In);
        mod1.Out.connect(mod2.In);
        mod2.Out.connect(mod3.In);
        mod3.Out.connect(mod4.In);
        mod4.Out.connect(outputNode);
    }

    // --- 1. VCA COMPRESSOR ---
    const compressor = ctx.createDynamicsCompressor();
    const makeupGain = ctx.createGain();
    mod1.In.connect(compressor);
    compressor.connect(makeupGain);
    makeupGain.connect(mod1.Wet);

    // --- 2. VOCAL POLISH ---
    const deEssFilter = ctx.createBiquadFilter();
    deEssFilter.type = 'peaking';
    deEssFilter.frequency.value = 6500;
    deEssFilter.Q.value = 1.5;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'highshelf';
    airFilter.frequency.value = 8000;

    const exciterWs = ctx.createWaveShaper();
    exciterWs.oversample = '2x';

    mod2.In.connect(deEssFilter);
    deEssFilter.connect(airFilter);
    airFilter.connect(exciterWs);
    exciterWs.connect(mod2.Wet);

    // --- 3. MODULATION (Phaser) ---
    const p1 = ctx.createBiquadFilter(); p1.type = 'allpass'; p1.Q.value = 2;
    const p2 = ctx.createBiquadFilter(); p2.type = 'allpass'; p2.Q.value = 2;
    const p3 = ctx.createBiquadFilter(); p3.type = 'allpass'; p3.Q.value = 2;
    
    const modLfo = ctx.createOscillator(); modLfo.type = 'sine'; modLfo.start();
    const modLfoGain = ctx.createGain();

    modLfo.connect(modLfoGain);
    modLfoGain.connect(p1.frequency);
    modLfoGain.connect(p2.frequency);
    modLfoGain.connect(p3.frequency);

    mod3.In.connect(p1); p1.connect(p2); p2.connect(p3);
    p3.connect(mod3.Wet);

    // --- 4. MASTERING (Width + Limiter) ---
    // Mid/Side
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);

    const midGain = ctx.createGain();
    const sideGain = ctx.createGain();
    
    const lInvert = ctx.createGain(); lInvert.gain.value = -1;
    const rInvert = ctx.createGain(); rInvert.gain.value = -1;
    const sInvert = ctx.createGain(); sInvert.gain.value = -1;

    mod4.In.connect(splitter);
    
    // L+R = Mid
    splitter.connect(midGain, 0);
    splitter.connect(midGain, 1);
    
    // L-R = Side
    splitter.connect(sideGain, 0);
    splitter.connect(rInvert, 1);
    rInvert.connect(sideGain);

    midGain.connect(merger, 0, 0);
    sideGain.connect(merger, 0, 0);
    
    sideGain.connect(sInvert);
    midGain.connect(merger, 0, 1);
    sInvert.connect(merger, 0, 1);

    const limiter = ctx.createDynamicsCompressor();
    limiter.ratio.value = 20; // Brickwall
    limiter.attack.value = 0.002;
    limiter.release.value = 0.05;

    merger.connect(limiter);
    limiter.connect(mod4.Wet);

    nodesRef.current = {
      mod1, mod2, mod3, mod4,
      compressor, makeupGain,
      deEssFilter, airFilter, exciterWs,
      p1, p2, p3, modLfo, modLfoGain,
      midGain, sideGain, limiter
    };

    return () => {
      try {
        inputNode.disconnect(mod1.In);
        mod4.Out.disconnect(outputNode);
        modLfo.stop();
      } catch (e) {}
    };
  }, [audioCtx, inputNode, outputNode, bypass]);

  // Update Parameters
  useEffect(() => {
    if (!audioCtx || !nodesRef.current.compressor) return;
    const t = audioCtx.currentTime;
    const n = nodesRef.current;

    // Mod 1: VCA
    n.mod1.Wet.gain.setTargetAtTime(compActive ? 1 : 0, t, 0.05);
    n.mod1.Dry.gain.setTargetAtTime(compActive ? 0 : 1, t, 0.05);
    
    n.compressor.threshold.setTargetAtTime(compThresh, t, 0.05);
    n.compressor.ratio.setTargetAtTime(compRatio, t, 0.05);
    n.compressor.attack.setTargetAtTime(compAttack / 1000, t, 0.05);
    // Makeup dB to linear
    n.makeupGain.gain.setTargetAtTime(Math.pow(10, compMakeup / 20), t, 0.05);

    // Mod 2: Vocal
    n.mod2.Wet.gain.setTargetAtTime(vocalActive ? 1 : 0, t, 0.05);
    n.mod2.Dry.gain.setTargetAtTime(vocalActive ? 0 : 1, t, 0.05);

    n.deEssFilter.gain.setTargetAtTime(- (deEsser * 0.15), t, 0.05); // Up to -15dB cut
    n.airFilter.gain.setTargetAtTime(air * 0.15, t, 0.05); // Up to +15dB boost
    
    // Exciter waveshaper
    if (exciter === 0) {
      n.exciterWs.curve = null;
    } else {
      const k = exciter * 0.5;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; ++i) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = Math.tanh(x * (1 + k));
      }
      n.exciterWs.curve = curve;
    }

    // Mod 3: Phaser
    n.mod3.Wet.gain.setTargetAtTime(modActive ? 0.7 : 0, t, 0.05);
    n.mod3.Dry.gain.setTargetAtTime(modActive ? 0.7 : 1, t, 0.05); // 50/50 mix for phaser effect

    n.modLfo.frequency.setTargetAtTime(modRate, t, 0.05);
    n.p1.frequency.setTargetAtTime(1000, t, 0.05);
    n.p2.frequency.setTargetAtTime(1000, t, 0.05);
    n.p3.frequency.setTargetAtTime(1000, t, 0.05);
    n.modLfoGain.gain.setTargetAtTime(modDepth * 10, t, 0.05); // Modulate Hz

    // Mod 4: Master
    n.mod4.Wet.gain.setTargetAtTime(masterActive ? 1 : 0, t, 0.05);
    n.mod4.Dry.gain.setTargetAtTime(masterActive ? 0 : 1, t, 0.05);

    // Mid/Side matrix gains
    n.midGain.gain.setTargetAtTime(0.5, t, 0.05);
    n.sideGain.gain.setTargetAtTime(0.5 * (stereoWidth / 100), t, 0.05);

    n.limiter.threshold.setTargetAtTime(limitThresh, t, 0.05);

  }, [
    audioCtx, compActive, compThresh, compRatio, compAttack, compMakeup,
    vocalActive, deEsser, air, exciter,
    modActive, modRate, modDepth,
    masterActive, stereoWidth, limitThresh
  ]);

  const MiniKnob = ({ label, value, min, max, onChange, unit = '', color = '#10b981' }: any) => {
    const rotation = ((value - min) / (max - min)) * 270 - 135;
    
    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startValue = value;
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const range = max - min;
        let newVal = startValue + deltaY * (range / 100);
        newVal = Math.max(min, Math.min(max, newVal));
        onChange(Math.round(newVal * 10) / 10);
      };
      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    return (
      <div className="flex flex-col items-center gap-2 select-none group">
        <div 
          className="relative w-14 h-14 rounded-full bg-[#16171d] shadow-[0_4px_10px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.05)] border border-white/10 flex items-center justify-center cursor-pointer"
          onPointerDown={handlePointerDown}
        >
          {/* Track */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeDasharray="264" strokeDashoffset="66" strokeLinecap="round" />
             <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6" strokeDasharray="264" strokeDashoffset={264 - (264 * 0.75 * ((value - min) / (max - min)))} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.1s' }} />
          </svg>
          {/* Knob */}
          <div className="w-[75%] h-[75%] rounded-full bg-gradient-to-b from-[#2a2c38] to-[#1a1b23] shadow-inner relative" style={{ transform: `rotate(${rotation}deg)` }}>
            <div className="w-1.5 h-1.5 rounded-full absolute top-1.5 left-1/2 -translate-x-1/2 shadow-[0_0_5px_currentColor]" style={{ backgroundColor: color, color: color }}></div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-bold tracking-widest text-white/50 uppercase">{label}</div>
          <div className="text-[11px] font-mono font-medium text-white/90">{value}{unit}</div>
        </div>
      </div>
    );
  };

  const RackUnit = ({ title, icon: Icon, color, active, onToggle, children }: any) => (
    <div className={`bg-[#16171d] rounded-xl border border-white/5 overflow-hidden transition-all duration-300 ${active ? 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]' : 'opacity-60'}`}>
      <div className="px-4 py-2 bg-[#1a1b23] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Icon className="w-4 h-4" style={{ color }} />
           <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/80">{title}</h3>
        </div>
        <button onClick={onToggle} className="w-8 h-4 rounded-full bg-black/50 border border-white/10 relative shadow-inner">
           <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${active ? 'left-4 shadow-[0_0_8px_currentColor]' : 'left-0.5 bg-white/20'}`} style={{ backgroundColor: active ? color : '', color: active ? color : '' }}></div>
        </button>
      </div>
      <div className={`p-5 flex items-center justify-around gap-4 ${!active && 'pointer-events-none grayscale-[0.5]'}`}>
        {children}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-[800px] bg-[#21232d] rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col font-sans max-h-[95vh] sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 bg-[#121319] border-b border-white/5 shrink-0 relative gap-3 sm:gap-0">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-teal-500/0"></div>
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <h2 className="text-white font-black tracking-widest text-lg sm:text-xl flex items-center gap-2">
              <span className="text-emerald-500">FC</span> STUDIO FX <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-1">PRO</span>
            </h2>
            <button onClick={onClose} className="sm:hidden text-white/40 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <button 
              onClick={() => {
                setCompThresh(-24); setCompRatio(4); setCompAttack(15); setCompMakeup(2);
                setDeEsser(40); setAir(50); setExciter(20);
                setModRate(2); setModDepth(60);
                setStereoWidth(130); setLimitThresh(-2);
                setCompActive(true); setVocalActive(true); setModActive(false); setMasterActive(true);
              }}
              className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Reset All
            </button>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <button 
              onClick={() => setBypass(!bypass)} 
              className={`px-4 sm:px-6 py-1.5 rounded-md text-[10px] sm:text-xs font-black tracking-widest transition-all border ${bypass ? 'bg-black/50 text-white/50 border-white/10 hover:text-white hover:border-white/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}
            >
              {bypass ? 'BYPASSED' : 'ACTIVE'}
            </button>
            <button onClick={onClose} className="hidden sm:block text-white/40 hover:text-white ml-2 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Rack Scrollable Area */}
        <div className={`p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 ${bypass ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''} transition-all duration-500`} style={{ background: 'radial-gradient(circle at 50% 0%, #2a2d3a 0%, #1a1b23 100%)' }}>
          
          {/* Rack 1: Compressor */}
          <RackUnit title="TecLab VCA Comp" icon={Sliders} color="#3b82f6" active={compActive} onToggle={() => setCompActive(!compActive)}>
            <MiniKnob label="Thresh" value={compThresh} min={-60} max={0} unit="dB" onChange={setCompThresh} color="#3b82f6" />
            <MiniKnob label="Ratio" value={compRatio} min={1} max={20} unit=":1" onChange={setCompRatio} color="#3b82f6" />
            <MiniKnob label="Attack" value={compAttack} min={1} max={100} unit="ms" onChange={setCompAttack} color="#3b82f6" />
            <MiniKnob label="Makeup" value={compMakeup} min={0} max={24} unit="dB" onChange={setCompMakeup} color="#3b82f6" />
          </RackUnit>

          {/* Rack 2: Vocal Polish */}
          <RackUnit title="Vocal Enhancer" icon={Mic} color="#ec4899" active={vocalActive} onToggle={() => setVocalActive(!vocalActive)}>
            <MiniKnob label="De-Esser" value={deEsser} min={0} max={100} unit="%" onChange={setDeEsser} color="#ec4899" />
            <MiniKnob label="Air EQ" value={air} min={0} max={100} unit="%" onChange={setAir} color="#ec4899" />
            <MiniKnob label="Exciter" value={exciter} min={0} max={100} unit="%" onChange={setExciter} color="#ec4899" />
          </RackUnit>

          {/* Rack 3: Modulation */}
          <RackUnit title="Phase Modulator" icon={Waves} color="#a855f7" active={modActive} onToggle={() => setModActive(!modActive)}>
            <MiniKnob label="Rate" value={modRate} min={0.1} max={10} unit="Hz" onChange={setModRate} color="#a855f7" />
            <MiniKnob label="Depth" value={modDepth} min={0} max={100} unit="%" onChange={setModDepth} color="#a855f7" />
          </RackUnit>

          {/* Rack 4: Mastering */}
          <RackUnit title="Mastering Limiter" icon={Maximize} color="#f59e0b" active={masterActive} onToggle={() => setMasterActive(!masterActive)}>
            <MiniKnob label="Width" value={stereoWidth} min={0} max={200} unit="%" onChange={setStereoWidth} color="#f59e0b" />
            <MiniKnob label="Limit" value={limitThresh} min={-20} max={0} unit="dB" onChange={setLimitThresh} color="#f59e0b" />
          </RackUnit>

        </div>
      </div>
    </div>
  );
}
