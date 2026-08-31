import React, { useState, useEffect, useRef } from 'react';
import { X, Power, Activity, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export interface AudioEnhancerProps {
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

export function AudioEnhancer({ onClose, isOpen = true, audioCtx, inputNode, outputNode, isBypassed, onBypassChange }: AudioEnhancerProps) {
  const bypass = isBypassed;
  const setBypass = onBypassChange;
  
  // Power states
  const [powerDyn, setPowerDyn] = useState(true);
  const [powerTone, setPowerTone] = useState(true);
  const [powerSpace, setPowerSpace] = useState(true);
  const [powerSfx, setPowerSfx] = useState(true);

  // Parameters (0-100)
  const [dynComp, setDynComp] = useState(0);
  const [dynAttack, setDynAttack] = useState(50);
  const [dynRelease, setDynRelease] = useState(50);

  const [eqLow, setEqLow] = useState(50);
  const [eqMid, setEqMid] = useState(50);
  const [eqHigh, setEqHigh] = useState(50);
  const [eqAir, setEqAir] = useState(50);

  const [spaceReverb, setSpaceReverb] = useState(0);
  const [spaceDelay, setSpaceDelay] = useState(0);
  const [spaceTime, setSpaceTime] = useState(25); // ~500ms

  const [sfxDrive, setSfxDrive] = useState(0);
  const [sfxChorus, setSfxChorus] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<any>({});

  // Presets
  const presets = [
    { name: 'Neutral', vals: { c:0, a:50, r:50, l:50, m:50, h:50, air:50, rev:0, dly:0, dt:25, drv:0, cho:0 } },
    { name: 'Clear Lead Vocals', vals: { c:60, a:30, r:40, l:40, m:55, h:65, air:75, rev:30, dly:15, dt:20, drv:15, cho:10 } },
    { name: 'Warm Vintage', vals: { c:45, a:60, r:60, l:65, m:60, h:45, air:35, rev:20, dly:10, dt:30, drv:55, cho:20 } },
    { name: 'Radio Lo-Fi', vals: { c:80, a:10, r:20, l:15, m:85, h:20, air:10, rev:15, dly:40, dt:15, drv:85, cho:50 } },
    { name: 'Spacious Pop', vals: { c:50, a:40, r:50, l:45, m:50, h:60, air:70, rev:55, dly:35, dt:45, drv:10, cho:25 } },
  ];
  const [presetIdx, setPresetIdx] = useState(0);

  const applyPreset = (idx: number) => {
    setPresetIdx(idx);
    const p = presets[idx].vals;
    setDynComp(p.c); setDynAttack(p.a); setDynRelease(p.r);
    setEqLow(p.l); setEqMid(p.m); setEqHigh(p.h); setEqAir(p.air);
    setSpaceReverb(p.rev); setSpaceDelay(p.dly); setSpaceTime(p.dt);
    setSfxDrive(p.drv); setSfxChorus(p.cho);
  };

  // Canvas Drawing
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      
      const analyser = nodesRef.current?.analyser;
      if (!analyser || bypass) {
        ctx.beginPath();
        ctx.moveTo(0, height - 10);
        ctx.lineTo(width, height - 10);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.05)');
      gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.3)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0.6)');

      ctx.beginPath();
      ctx.moveTo(0, height);
      
      const visibleBins = Math.floor(bufferLength * 0.5);
      const sliceWidth = width / visibleBins;
      let x = 0;

      for (let i = 0; i < visibleBins; i++) {
        const v = dataArray[i] / 255.0;
        const y = height - (v * height * 0.8) - 10;
        ctx.lineTo(x, y);
        x += sliceWidth;
      }
      
      ctx.lineTo(width, height);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      x = 0;
      for (let i = 0; i < visibleBins; i++) {
        const v = dataArray[i] / 255.0;
        const y = height - (v * height * 0.8) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    
    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isOpen, bypass]);

  // Init DSP Graph
  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode) return;

    // Analyzer
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;

    // Dynamics
    const comp = audioCtx.createDynamicsCompressor();

    // Tone (EQ)
    const eqL = audioCtx.createBiquadFilter(); eqL.type = 'lowshelf'; eqL.frequency.value = 150;
    const eqM = audioCtx.createBiquadFilter(); eqM.type = 'peaking'; eqM.frequency.value = 1000;
    const eqH = audioCtx.createBiquadFilter(); eqH.type = 'peaking'; eqH.frequency.value = 4000;
    const eqA = audioCtx.createBiquadFilter(); eqA.type = 'highshelf'; eqA.frequency.value = 10000;

    // SFX (Drive & Chorus)
    const drive = audioCtx.createWaveShaper();
    drive.oversample = '4x';
    
    const lfo = audioCtx.createOscillator(); lfo.frequency.value = 1.2; lfo.start();
    const chorusDelay = audioCtx.createDelay(); chorusDelay.delayTime.value = 0.02;
    const chorusDepth = audioCtx.createGain(); chorusDepth.gain.value = 0;
    lfo.connect(chorusDepth); chorusDepth.connect(chorusDelay.delayTime);
    const chorusMix = audioCtx.createGain(); chorusMix.gain.value = 0;
    const chorusDry = audioCtx.createGain(); chorusDry.gain.value = 1;
    const sfxOut = audioCtx.createGain();

    // Space (Delay & Reverb)
    const delay = audioCtx.createDelay(5.0);
    const delayFb = audioCtx.createGain(); delayFb.gain.value = 0.3;
    const delayMix = audioCtx.createGain(); delayMix.gain.value = 0;
    
    const reverb = audioCtx.createConvolver();
    reverb.buffer = createReverbIR(audioCtx, 2.5, 3.0);
    const reverbMix = audioCtx.createGain(); reverbMix.gain.value = 0;
    
    const spaceDry = audioCtx.createGain(); spaceDry.gain.value = 1;
    const masterOut = audioCtx.createGain();

    nodesRef.current = {
      analyser, comp, eqL, eqM, eqH, eqA,
      drive, lfo, chorusDelay, chorusDepth, chorusMix, chorusDry, sfxOut,
      delay, delayFb, delayMix, reverb, reverbMix, spaceDry, masterOut
    };

    return () => {
      try {
        inputNode.disconnect();
        analyser.disconnect();
        comp.disconnect();
        eqL.disconnect(); eqM.disconnect(); eqH.disconnect(); eqA.disconnect();
        drive.disconnect();
        lfo.stop(); lfo.disconnect(); chorusDelay.disconnect(); chorusDepth.disconnect();
        chorusMix.disconnect(); chorusDry.disconnect(); sfxOut.disconnect();
        delay.disconnect(); delayFb.disconnect(); delayMix.disconnect();
        reverb.disconnect(); reverbMix.disconnect(); spaceDry.disconnect();
        masterOut.disconnect();
        inputNode.connect(outputNode); // restore straight bypass on unmount
      } catch (e) {}
    };
  }, [audioCtx, inputNode, outputNode]);

  // Update Graph Routing based on power toggles
  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode || !nodesRef.current.comp) return;
    const n = nodesRef.current;

    // Disconnect everything
    try { inputNode.disconnect(); n.analyser.disconnect(); } catch (e) {}
    try { n.comp.disconnect(); n.eqL.disconnect(); n.eqM.disconnect(); n.eqH.disconnect(); n.eqA.disconnect(); } catch(e){}
    try { n.drive.disconnect(); n.chorusDelay.disconnect(); n.chorusMix.disconnect(); n.chorusDry.disconnect(); n.sfxOut.disconnect(); } catch(e){}
    try { n.delay.disconnect(); n.delayFb.disconnect(); n.delayMix.disconnect(); n.reverb.disconnect(); n.reverbMix.disconnect(); n.spaceDry.disconnect(); n.masterOut.disconnect(); } catch(e){}

    if (bypass) {
      inputNode.connect(outputNode);
      return;
    }

    let current = inputNode as AudioNode;

    // Dynamics
    if (powerDyn) {
      current.connect(n.comp);
      current = n.comp;
    }

    // Tone
    if (powerTone) {
      current.connect(n.eqL);
      n.eqL.connect(n.eqM);
      n.eqM.connect(n.eqH);
      n.eqH.connect(n.eqA);
      current = n.eqA;
    }

    // SFX
    if (powerSfx) {
      current.connect(n.drive);
      n.drive.connect(n.chorusDelay);
      n.drive.connect(n.chorusDry);
      n.chorusDelay.connect(n.chorusMix);
      n.chorusMix.connect(n.sfxOut);
      n.chorusDry.connect(n.sfxOut);
      current = n.sfxOut;
    }

    // Space
    if (powerSpace) {
      current.connect(n.delay);
      n.delay.connect(n.delayFb);
      n.delayFb.connect(n.delay);
      n.delay.connect(n.delayMix);

      current.connect(n.reverb);
      n.reverb.connect(n.reverbMix);

      current.connect(n.spaceDry);

      n.delayMix.connect(n.masterOut);
      n.reverbMix.connect(n.masterOut);
      n.spaceDry.connect(n.masterOut);
      current = n.masterOut;
    }

    // Connect to output & analyzer
    current.connect(n.analyser);
    n.analyser.connect(outputNode);

  }, [bypass, powerDyn, powerTone, powerSpace, powerSfx, audioCtx, inputNode, outputNode]);

  // Update Parameters
  useEffect(() => {
    if (!nodesRef.current.comp || bypass) return;
    const n = nodesRef.current;
    const time = audioCtx?.currentTime || 0;

    // DYNAMICS
    if (powerDyn) {
      n.comp.threshold.setTargetAtTime(dynComp === 0 ? 0 : -10 - (dynComp * 0.4), time, 0.05); // 0 to -50dB
      n.comp.ratio.setTargetAtTime(1 + (dynComp * 0.1), time, 0.05); // 1 to 11
      n.comp.attack.setTargetAtTime(0.005 + (dynAttack * 0.001), time, 0.05); // 5ms to 105ms
      n.comp.release.setTargetAtTime(0.05 + (dynRelease * 0.005), time, 0.05); // 50ms to 550ms
    }

    // TONE
    if (powerTone) {
      n.eqL.gain.setTargetAtTime((eqLow - 50) * 0.3, time, 0.05); // -15dB to +15dB
      n.eqM.gain.setTargetAtTime((eqMid - 50) * 0.3, time, 0.05);
      n.eqH.gain.setTargetAtTime((eqHigh - 50) * 0.3, time, 0.05);
      n.eqA.gain.setTargetAtTime((eqAir - 50) * 0.3, time, 0.05);
    }

    // SFX
    if (powerSfx) {
      // Saturation Math
      if (sfxDrive === 0) {
        n.drive.curve = null;
      } else {
        const k = sfxDrive * 0.5;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
          const x = (i * 2) / n_samples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x) + 0.001);
        }
        n.drive.curve = curve;
      }

      // Chorus Math
      n.chorusDepth.gain.setTargetAtTime(sfxChorus * 0.0001, time, 0.05);
      n.chorusMix.gain.setTargetAtTime(sfxChorus === 0 ? 0 : (sfxChorus * 0.005), time, 0.05); // 0 to 0.5
      n.chorusDry.gain.setTargetAtTime(sfxChorus === 0 ? 1 : 1 - (sfxChorus * 0.003), time, 0.05);
    }

    // SPACE
    if (powerSpace) {
      n.delay.delayTime.setTargetAtTime(0.1 + (spaceTime * 0.015), time, 0.05); // 100ms to 1.6s
      n.delayMix.gain.setTargetAtTime(spaceDelay * 0.005, time, 0.05); // 0 to 0.5
      n.reverbMix.gain.setTargetAtTime(spaceReverb * 0.006, time, 0.05); // 0 to 0.6
      
      // Auto-duck dry signal slightly when wet is very high
      const maxWet = Math.max(spaceDelay, spaceReverb);
      n.spaceDry.gain.setTargetAtTime(1 - (maxWet * 0.003), time, 0.05); 
    }

  }, [
    bypass, powerDyn, powerTone, powerSpace, powerSfx,
    dynComp, dynAttack, dynRelease,
    eqLow, eqMid, eqHigh, eqAir,
    sfxDrive, sfxChorus,
    spaceReverb, spaceDelay, spaceTime,
    audioCtx
  ]);


  // Custom UI Controls
  const Knob = ({ label, value, onChange, min = 0, max = 100, color = 'bg-indigo-500' }: any) => {
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
      <div className="flex flex-col items-center gap-2 select-none touch-none group">
        <div 
          className="relative w-14 h-14 rounded-full bg-[#1a1b23] shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.05)] border border-white/5 flex items-center justify-center cursor-pointer"
          onPointerDown={handlePointerDown}
        >
          {/* Active Ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-black/40"></div>
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
             <circle 
               cx="50" cy="50" r="46" 
               fill="none" 
               stroke="currentColor" 
               strokeWidth="3" 
               strokeDasharray="289" 
               strokeDashoffset={289 - (289 * 0.75 * ((value - min) / (max - min)))}
               className={`text-${color.split('-')[1]}-${color.split('-')[2]} opacity-80`}
               strokeLinecap="round"
             />
          </svg>
          {/* Knob Body */}
          <div 
            className="w-[85%] h-[85%] rounded-full bg-gradient-to-b from-[#2a2c38] to-[#1c1d25] shadow-inner flex items-center justify-center"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Indicator Dot */}
            <div className={`w-1.5 h-1.5 rounded-full ${color} absolute top-1.5 shadow-[0_0_8px_currentColor]`}></div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest group-hover:text-white/80 transition-colors">{label}</div>
          <div className="text-[9px] text-white/30 font-mono mt-0.5">{value}</div>
        </div>
      </div>
    );
  };
  
  const VerticalSlider = ({ label, value, onChange, min = 0, max = 100, color = 'bg-blue-400' }: any) => {
    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startValue = value;
      
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const range = max - min;
        const speed = range / 100;
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

    const percent = ((value - min) / (max - min)) * 100;

    return (
      <div className="flex flex-col items-center gap-3 select-none touch-none group">
        <div 
          className="relative w-6 h-32 bg-[#121319] rounded-full border border-white/5 flex justify-center cursor-pointer overflow-hidden shadow-inner"
          onPointerDown={handlePointerDown}
        >
          {/* Track Fill */}
          <div 
            className={`absolute bottom-0 w-full ${color} opacity-20`}
            style={{ height: `${percent}%` }}
          />
          {/* Thumb */}
          <div 
            className="absolute w-5 h-5 rounded-full bg-white border border-black/20 shadow-md"
            style={{ bottom: `calc(${percent}% - 10px)`, transition: 'none' }}
          >
            <div className={`absolute inset-1 rounded-full ${color} shadow-[0_0_8px_currentColor] opacity-80`} />
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-white/50 font-bold uppercase tracking-widest group-hover:text-white/80 transition-colors">{label}</div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ title, power, setPower, colorHex }: any) => (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setPower(!power)}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${power ? '' : 'bg-black/50 text-white/20'}`}
          style={power ? { backgroundColor: `${colorHex}20`, color: colorHex, boxShadow: `0 0 10px ${colorHex}40` } : {}}
        >
          <Power className="w-3.5 h-3.5" />
        </button>
        <h3 className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: power ? colorHex : 'rgba(255,255,255,0.2)' }}>
          {title}
        </h3>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-[1000px] max-h-[95vh] sm:max-h-[90vh] bg-[#1a1b23] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-3 bg-[#121319] border-b border-white/5 gap-3 sm:gap-0 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <h2 className="text-white font-black tracking-widest text-lg sm:text-xl flex items-center gap-2">
              <span className="text-cyan-400">FC</span> AUDIO <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold ml-1">PRO</span>
            </h2>
            {/* Close button on mobile moves here for better UX */}
            <button onClick={onClose} className="sm:hidden text-white/40 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {/* Presets */}
            <div className="flex items-center bg-black/40 border border-white/10 rounded-md px-3 py-1.5 flex-1 sm:flex-none min-w-[180px] sm:min-w-[220px] justify-between">
              <span className="text-white text-[10px] sm:text-xs font-semibold tracking-wide mr-2 truncate">{presets[presetIdx].name}</span>
              <div className="flex items-center gap-1.5 text-white/40 shrink-0">
                <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-white transition-colors" onClick={() => applyPreset((presetIdx - 1 + presets.length) % presets.length)} />
                <ChevronRight className="w-4 h-4 cursor-pointer hover:text-white transition-colors" onClick={() => applyPreset((presetIdx + 1) % presets.length)} />
                <div className="w-px h-3 bg-white/20 mx-1"></div>
                <RotateCcw className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => applyPreset(0)} title="Reset to Neutral" />
              </div>
            </div>
            
            <button 
              onClick={() => setBypass(!bypass)} 
              className={`px-4 sm:px-6 py-1.5 rounded-md text-[10px] sm:text-xs font-black tracking-widest transition-all border ${bypass ? 'bg-black/50 text-white/50 border-white/10 hover:text-white hover:border-white/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'}`}
            >
              {bypass ? 'BYPASSED' : 'ACTIVE'}
            </button>
            <button onClick={onClose} className="hidden sm:block text-white/40 hover:text-white ml-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Modules Grid */}
        <div className={`p-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-auto ${bypass ? 'opacity-40 grayscale-[0.8] pointer-events-none transition-all duration-500' : 'transition-all duration-500'}`}>
          
          {/* DYNAMICS Module */}
          <div className="bg-[#21232d] border border-white/5 rounded-xl p-4 flex flex-col shadow-lg">
            <SectionHeader title="DYNAMICS" power={powerDyn} setPower={setPowerDyn} colorHex="#ec4899" />
            
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4">
              <Knob label="COMP" value={dynComp} onChange={setDynComp} color="bg-pink-500" />
              <div className="flex gap-4 w-full justify-center">
                <Knob label="ATTACK" value={dynAttack} onChange={setDynAttack} color="bg-pink-500" />
                <Knob label="RELEASE" value={dynRelease} onChange={setDynRelease} color="bg-pink-500" />
              </div>
            </div>
          </div>

          {/* TONE Module */}
          <div className="bg-[#21232d] border border-white/5 rounded-xl p-4 flex flex-col shadow-lg">
            <SectionHeader title="TONE" power={powerTone} setPower={setPowerTone} colorHex="#38bdf8" />
            
            <div className="flex-1 flex flex-col items-center gap-4 pt-3">
               {/* Analyzer */}
               <div className="w-full h-20 bg-[#121319] rounded-lg border border-white/5 relative overflow-hidden shadow-inner">
                  <canvas ref={canvasRef} className="w-full h-full" width={300} height={80}></canvas>
                  <div className="absolute bottom-1 w-full flex justify-between px-2 text-[7px] text-white/30 font-mono pointer-events-none">
                    <span>150Hz</span><span>1kHz</span><span>4kHz</span><span>10kHz</span>
                  </div>
               </div>

               <div className="flex justify-between w-full px-2 mt-2">
                 <VerticalSlider label="LOW" value={eqLow} onChange={setEqLow} color="bg-sky-400" />
                 <VerticalSlider label="MID" value={eqMid} onChange={setEqMid} color="bg-sky-400" />
                 <VerticalSlider label="HIGH" value={eqHigh} onChange={setEqHigh} color="bg-sky-400" />
                 <VerticalSlider label="AIR+" value={eqAir} onChange={setEqAir} color="bg-sky-400" />
               </div>
            </div>
          </div>

          {/* SPACE Module */}
          <div className="bg-[#21232d] border border-white/5 rounded-xl p-4 flex flex-col shadow-lg">
            <SectionHeader title="SPACE" power={powerSpace} setPower={setPowerSpace} colorHex="#a855f7" />
            
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4">
              <div className="flex gap-4 w-full justify-center">
                <Knob label="REVERB" value={spaceReverb} onChange={setSpaceReverb} color="bg-purple-500" />
                <Knob label="DELAY" value={spaceDelay} onChange={setSpaceDelay} color="bg-purple-500" />
              </div>
              <Knob label="DLY TIME" value={spaceTime} onChange={setSpaceTime} color="bg-purple-500" />
            </div>
          </div>

          {/* SFX Module */}
          <div className="bg-[#21232d] border border-white/5 rounded-xl p-4 flex flex-col shadow-lg">
            <SectionHeader title="SFX" power={powerSfx} setPower={setPowerSfx} colorHex="#eab308" />
            
            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-4">
              <Knob label="TAPE SAT" value={sfxDrive} onChange={setSfxDrive} color="bg-yellow-400" />
              <Knob label="CHORUS" value={sfxChorus} onChange={setSfxChorus} color="bg-yellow-400" />
            </div>
          </div>

        </div>
        
        {/* Bottom Bar */}
        <div className="h-2 bg-[#121319] w-full flex">
           {/* Visual accent lines */}
           <div className="h-full flex-1 bg-pink-500/20"></div>
           <div className="h-full flex-1 bg-sky-500/20"></div>
           <div className="h-full flex-1 bg-purple-500/20"></div>
           <div className="h-full flex-1 bg-yellow-500/20"></div>
        </div>
      </div>
    </div>
  );
}
