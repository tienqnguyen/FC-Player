import React, { useState, useEffect, useRef } from 'react';
import { X, Power, Activity, RotateCcw } from 'lucide-react';

export interface FcOneKnobProProps {
  onClose: () => void;
  isOpen?: boolean;
  audioCtx: AudioContext | null;
  inputNode: AudioNode | null;
  outputNode: AudioNode | null;
  isBypassed: boolean;
  onBypassChange: (b: boolean) => void;
}

const createReverbIR = (ctx: AudioContext, duration: number, decay: number) => {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let i = 0; i < 2; i++) {
    const channel = impulse.getChannelData(i);
    for (let j = 0; j < length; j++) {
      channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
    }
  }
  return impulse;
};

export function FcOneKnobPro({ onClose, isOpen = true, audioCtx, inputNode, outputNode, isBypassed, onBypassChange }: FcOneKnobProProps) {
  const bypass = isBypassed;
  const setBypass = onBypassChange;

  // Parameters (0-100)
  const [bassy, setBassy] = useState(0);
  const [brighter, setBrighter] = useState(0);
  const [punchy, setPunchy] = useState(0);
  const [leveller, setLeveller] = useState(0);
  const [dirty, setDirty] = useState(0);
  const [toasty, setToasty] = useState(0);
  const [echo, setEcho] = useState(0);
  const [room, setRoom] = useState(0);

  const nodesRef = useRef<any>({});

  // Reset
  const applyPreset = () => {
    setBassy(0); setBrighter(0); setPunchy(0); setLeveller(0);
    setDirty(0); setToasty(0); setEcho(0); setRoom(0);
  };

  // Init DSP Graph
  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode) return;

    // 1. Bassy (Low shelf)
    const filterBassy = audioCtx.createBiquadFilter();
    filterBassy.type = 'lowshelf'; filterBassy.frequency.value = 100;

    // 2. Brighter (High shelf)
    const filterBrighter = audioCtx.createBiquadFilter();
    filterBrighter.type = 'highshelf'; filterBrighter.frequency.value = 8000;

    // 3. Punchy (Compressor with slow attack, fast release)
    const compPunchy = audioCtx.createDynamicsCompressor();
    compPunchy.attack.value = 0.03; // 30ms
    compPunchy.release.value = 0.05; // 50ms
    compPunchy.ratio.value = 4;
    compPunchy.threshold.value = 0; // modulated
    
    // 4. Leveller (Compressor with fast attack, slow release)
    const compLeveller = audioCtx.createDynamicsCompressor();
    compLeveller.attack.value = 0.005; // 5ms
    compLeveller.release.value = 0.25; // 250ms
    compLeveller.ratio.value = 2;
    compLeveller.threshold.value = 0; // modulated

    // 5. Dirty (Waveshaper)
    const wsDirty = audioCtx.createWaveShaper();
    wsDirty.oversample = '4x';
    
    // 6. Toasty (Waveshaper + Lowpass)
    const wsToasty = audioCtx.createWaveShaper();
    wsToasty.oversample = '2x';
    const lpToasty = audioCtx.createBiquadFilter();
    lpToasty.type = 'lowpass'; lpToasty.frequency.value = 12000;

    // 7. Echo (Delay)
    const delayEcho = audioCtx.createDelay(2.0);
    delayEcho.delayTime.value = 0.35;
    const delayFb = audioCtx.createGain(); delayFb.gain.value = 0.4;
    const delayMix = audioCtx.createGain(); delayMix.gain.value = 0;
    
    // 8. Room (Reverb)
    const reverbRoom = audioCtx.createConvolver();
    reverbRoom.buffer = createReverbIR(audioCtx, 1.5, 4.0);
    const reverbMix = audioCtx.createGain(); reverbMix.gain.value = 0;
    
    // Mixers
    const dryPath = audioCtx.createGain(); dryPath.gain.value = 1;
    const masterOut = audioCtx.createGain();

    nodesRef.current = {
      filterBassy, filterBrighter, compPunchy, compLeveller,
      wsDirty, wsToasty, lpToasty, delayEcho, delayFb, delayMix,
      reverbRoom, reverbMix, dryPath, masterOut
    };

    return () => {
      try {
        inputNode.disconnect();
        filterBassy.disconnect(); filterBrighter.disconnect();
        compPunchy.disconnect(); compLeveller.disconnect();
        wsDirty.disconnect(); wsToasty.disconnect(); lpToasty.disconnect();
        delayEcho.disconnect(); delayFb.disconnect(); delayMix.disconnect();
        reverbRoom.disconnect(); reverbMix.disconnect(); dryPath.disconnect(); masterOut.disconnect();
        inputNode.connect(outputNode);
      } catch (e) {}
    };
  }, [audioCtx, inputNode, outputNode]);

  // Update Graph Routing
  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode || !nodesRef.current.filterBassy) return;
    const n = nodesRef.current;

    // Disconnect everything first
    try { inputNode.disconnect(); } catch (e) {}
    try { n.filterBassy.disconnect(); n.filterBrighter.disconnect(); } catch (e) {}
    try { n.compPunchy.disconnect(); n.compLeveller.disconnect(); } catch (e) {}
    try { n.wsDirty.disconnect(); n.wsToasty.disconnect(); n.lpToasty.disconnect(); } catch (e) {}
    try { n.delayEcho.disconnect(); n.delayFb.disconnect(); n.delayMix.disconnect(); } catch (e) {}
    try { n.reverbRoom.disconnect(); n.reverbMix.disconnect(); n.dryPath.disconnect(); n.masterOut.disconnect(); } catch (e) {}

    if (bypass) {
      inputNode.connect(outputNode);
      return;
    }

    // Linear chain
    inputNode.connect(n.filterBassy);
    n.filterBassy.connect(n.filterBrighter);
    n.filterBrighter.connect(n.wsDirty);
    n.wsDirty.connect(n.wsToasty);
    n.wsToasty.connect(n.lpToasty);
    n.lpToasty.connect(n.compPunchy);
    n.compPunchy.connect(n.compLeveller);

    // Parallel fx (Echo and Reverb)
    n.compLeveller.connect(n.delayEcho);
    n.delayEcho.connect(n.delayFb);
    n.delayFb.connect(n.delayEcho);
    n.delayEcho.connect(n.delayMix);

    n.compLeveller.connect(n.reverbRoom);
    n.reverbRoom.connect(n.reverbMix);

    n.compLeveller.connect(n.dryPath);

    n.delayMix.connect(n.masterOut);
    n.reverbMix.connect(n.masterOut);
    n.dryPath.connect(n.masterOut);

    n.masterOut.connect(outputNode);

  }, [bypass, audioCtx, inputNode, outputNode]);

  // Parameters Update
  useEffect(() => {
    if (!nodesRef.current.filterBassy || bypass) return;
    const n = nodesRef.current;
    const time = audioCtx?.currentTime || 0;

    // Bassy (0 to +18dB)
    n.filterBassy.gain.setTargetAtTime(bassy * 0.18, time, 0.05);
    
    // Brighter (0 to +15dB)
    n.filterBrighter.gain.setTargetAtTime(brighter * 0.15, time, 0.05);

    // Punchy
    n.compPunchy.threshold.setTargetAtTime(punchy === 0 ? 0 : -5 - (punchy * 0.25), time, 0.05); // down to -30dB
    
    // Leveller
    n.compLeveller.threshold.setTargetAtTime(leveller === 0 ? 0 : -10 - (leveller * 0.3), time, 0.05); // down to -40dB

    // Dirty (Waveshaper Math)
    if (dirty === 0) {
      n.wsDirty.curve = null;
    } else {
      const k = dirty * 0.8; // up to 80
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x) + 0.001);
      }
      n.wsDirty.curve = curve;
    }

    // Toasty (Waveshaper + Lowpass)
    if (toasty === 0) {
      n.wsToasty.curve = null;
      n.lpToasty.frequency.setTargetAtTime(22000, time, 0.05);
    } else {
      const k = toasty * 0.3; // softer saturation
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        // Tanh-like soft clip for tape
        curve[i] = Math.tanh(x * (1 + k));
      }
      n.wsToasty.curve = curve;
      n.lpToasty.frequency.setTargetAtTime(18000 - (toasty * 80), time, 0.05); // Rolls off highs
    }

    // Echo Mix (0 to 0.5)
    n.delayMix.gain.setTargetAtTime(echo * 0.005, time, 0.05);
    
    // Room Mix (0 to 0.5)
    n.reverbMix.gain.setTargetAtTime(room * 0.005, time, 0.05);

    // Auto gain compensation for distortion to prevent blasting
    const dirtyGainComp = dirty > 0 ? 1 - (dirty * 0.004) : 1; 
    const toastyGainComp = toasty > 0 ? 1 - (toasty * 0.002) : 1;
    n.masterOut.gain.setTargetAtTime(dirtyGainComp * toastyGainComp, time, 0.05);

  }, [
    bypass, bassy, brighter, punchy, leveller, dirty, toasty, echo, room, audioCtx
  ]);

  const BigKnob = ({ label, desc, value, onChange, color = 'bg-orange-500', hex = '#f97316' }: any) => {
    const min = 0, max = 100;
    const rotation = ((value - min) / (max - min)) * 270 - 135;
    
    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startValue = value;
      
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const range = max - min;
        const speed = range / 120; 
        let newVal = startValue + deltaY * speed;
        newVal = Math.max(min, Math.min(max, newVal));
        onChange(Math.round(newVal));
      };
      
      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    return (
      <div className="flex flex-col items-center gap-4 select-none touch-none group bg-[#16171d] p-5 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden transition-all hover:bg-[#1a1b23]">
        <div className="absolute top-0 w-full h-1" style={{ backgroundColor: hex, opacity: value > 0 ? 0.8 : 0.1, boxShadow: value > 0 ? `0 0 10px ${hex}` : 'none' }}></div>
        <div className="text-center">
          <div className="text-[14px] font-black tracking-widest uppercase" style={{ color: value > 0 ? hex : 'rgba(255,255,255,0.4)' }}>{label}</div>
          <div className="text-[9px] text-white/30 font-medium uppercase mt-1 tracking-wider h-3">{desc}</div>
        </div>

        <div 
          className="relative w-24 h-24 rounded-full bg-[#111216] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] border border-white/5 flex items-center justify-center cursor-pointer"
          onPointerDown={handlePointerDown}
        >
          {/* Active Ring */}
          <div className="absolute inset-0 rounded-full border-[4px] border-black/60"></div>
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-[0_0_5px_currentColor]" viewBox="0 0 100 100">
             <circle 
               cx="50" cy="50" r="44" 
               fill="none" 
               stroke="currentColor" 
               strokeWidth="4" 
               strokeDasharray="276" 
               strokeDashoffset={276 - (276 * 0.75 * ((value - min) / (max - min)))}
               style={{ color: value > 0 ? hex : 'rgba(255,255,255,0.1)' }}
               strokeLinecap="round"
             />
          </svg>
          {/* Knob Body */}
          <div 
            className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-[#2a2c38] to-[#16171d] shadow-inner flex items-center justify-center relative"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
             {/* Grip texture */}
             <div className="absolute inset-2 rounded-full border border-black/30 bg-[repeating-conic-gradient(rgba(255,255,255,0.03)_0deg,transparent_10deg)]"></div>
            {/* Indicator Dot */}
            <div className="w-2.5 h-2.5 rounded-full absolute top-2 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: hex, color: hex }}></div>
          </div>
        </div>
        
        <div className="w-14 h-6 bg-black/50 rounded flex items-center justify-center border border-white/10 shadow-inner mt-1">
          <span className="text-[11px] font-mono font-bold" style={{ color: value > 0 ? 'white' : 'rgba(255,255,255,0.3)' }}>{value}</span>
        </div>
      </div>
    );
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-[1100px] max-h-[95vh] sm:max-h-[90vh] bg-[#1a1b23] rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col font-sans">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 bg-[#121319] border-b border-white/5 relative gap-3 sm:gap-0 shrink-0">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-orange-500/0 via-orange-500/50 to-amber-500/0"></div>
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <h2 className="text-white font-black tracking-widest text-xl sm:text-2xl flex items-center gap-2">
              <span className="text-orange-500">FC</span> ONE-KNOBS <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded font-bold ml-2">PRO</span>
            </h2>
            <button onClick={onClose} className="sm:hidden text-white/40 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto justify-between sm:justify-end">
            <button 
              onClick={applyPreset}
              className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </button>
            
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            
            <button 
              onClick={() => setBypass(!bypass)} 
              className={`px-4 sm:px-8 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs font-black tracking-widest transition-all border ${bypass ? 'bg-black/50 text-white/50 border-white/10 hover:text-white hover:border-white/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.3)]'}`}
            >
              {bypass ? 'BYPASSED' : 'ACTIVE'}
            </button>
            <button onClick={onClose} className="hidden sm:block text-white/40 hover:text-white ml-2 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Knobs Grid */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 bg-[#21232d] ${bypass ? 'opacity-40 grayscale-[0.8] pointer-events-none transition-all duration-500' : 'transition-all duration-500'}`}>
           <BigKnob label="Brighter" desc="Highs / Air" value={brighter} onChange={setBrighter} hex="#38bdf8" />
           <BigKnob label="Bassy" desc="Warmth / Sub" value={bassy} onChange={setBassy} hex="#3b82f6" />
           <BigKnob label="Punchy" desc="Transients" value={punchy} onChange={setPunchy} hex="#ec4899" />
           <BigKnob label="Leveller" desc="Glue / Balance" value={leveller} onChange={setLeveller} hex="#a855f7" />
           <BigKnob label="Dirty" desc="Overdrive" value={dirty} onChange={setDirty} hex="#eab308" />
           <BigKnob label="Toasty" desc="Tape Saturation" value={toasty} onChange={setToasty} hex="#f97316" />
           <BigKnob label="Echo" desc="Clean Delay" value={echo} onChange={setEcho} hex="#10b981" />
           <BigKnob label="Room" desc="Natural Reverb" value={room} onChange={setRoom} hex="#14b8a6" />
        </div>
      </div>
    </div>
  );
}
