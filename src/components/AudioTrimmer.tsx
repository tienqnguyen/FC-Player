import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Scissors, Play, Pause, RotateCcw, Sparkles, Plus, Minus } from 'lucide-react';
import audioBufferToWav from 'audiobuffer-to-wav';

interface AudioTrimmerProps {
  mode?: "full" | "select-only" | "preview";
  onRegionChange?: (start: number, end: number) => void;
  initialStart?: number;
  initialEnd?: number;
  audioUrl: string;
  onTrim: (trimmedAudioUrl: string, trimStart: number, trimEnd: number, autoExtract?: boolean) => void;
  onCancel: () => void;
  showExtractAction?: boolean;
}

export default function AudioTrimmer({ audioUrl, onTrim, onCancel, mode = "full", onRegionChange, initialStart, initialEnd, showExtractAction = false }: AudioTrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startSec, setStartSec] = useState(initialStart || 0);
  const [endSec, setEndSec] = useState(initialEnd || 0);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const regions = RegionsPlugin.create();
    regionsRef.current = regions;
    
    // Create a canvas gradient for the waveform
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let waveGradient: string | CanvasGradient = 'rgba(255, 255, 255, 0.2)';
    let progressGradient: string | CanvasGradient = 'rgba(251, 191, 36, 0.8)';
    
    if (ctx) {
      waveGradient = ctx.createLinearGradient(0, 0, 0, 160);
      waveGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      waveGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
      
      progressGradient = ctx.createLinearGradient(0, 0, 0, 160);
      progressGradient.addColorStop(0, '#fbbf24'); // amber-400
      progressGradient.addColorStop(1, '#d97706'); // amber-600
    }

    
    let wsPlugins = [];
    if (mode !== "preview") {
       wsPlugins.push(regions);
    }
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveGradient,
      progressColor: progressGradient,
      cursorColor: '#fbbf24',
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 160,
      normalize: true,
      plugins: wsPlugins
    });

    
    wavesurferRef.current = ws;
    
    ws.load(audioUrl).catch((e: any) => { if (e && e.name !== 'AbortError' && !String(e).toLowerCase().includes('abort')) console.error('WaveSurfer load error:', e); });
    
    
    ws.on('ready', () => {
      const d = ws.getDuration();
      setDuration(d);
      
      const st = initialStart || 0;
      const en = initialEnd || d;
      
      setStartSec(st);
      setEndSec(en);
      setIsReady(true);
      
      if (mode !== "preview") {
        regions.addRegion({
          start: st,
          end: en,
          color: 'rgba(251, 191, 36, 0.25)',
          drag: false,
          resize: true
        });
      }
    });

    
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    
    
    regions.on('region-updated', (region) => {
      setStartSec(region.start);
      setEndSec(region.end);
      if (onRegionChange) {
        onRegionChange(region.start, region.end);
      }
    });

    
    return () => {
      ws.destroy();
    };
  }, [audioUrl]);
  
  const handlePlayPause = () => {
    if (isPlaying) {
      wavesurferRef.current?.pause();
    } else {
      const regions = regionsRef.current?.getRegions();
      if (regions && regions.length > 0) {
        regions[0].play();
      } else {
        wavesurferRef.current?.play();
      }
    }
  };

  const handleReplay = () => {
    const regions = regionsRef.current?.getRegions();
    if (regions && regions.length > 0) {
      regions[0].play();
    } else {
      wavesurferRef.current?.play(0);
    }
  };
  
  const handleApply = async (autoExtract: boolean = false) => {
    setIsProcessing(true);
    try {
      const res = await fetch(audioUrl);
      const arrayBuffer = await res.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      const startOffset = Math.floor(startSec * sampleRate);
      const endOffset = Math.floor(endSec * sampleRate);
      const frameCount = endOffset - startOffset;
      
      if (frameCount <= 0) throw new Error("Invalid trim region");
      
      const offlineCtx = new OfflineAudioContext(channels, frameCount, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0, startSec, endSec - startSec);
      
      const renderedBuffer = await offlineCtx.startRendering();
      const wavArrayBuffer = audioBufferToWav(renderedBuffer);
      const blob = new Blob([new DataView(wavArrayBuffer)], { type: 'audio/wav' });
      const newUrl = URL.createObjectURL(blob);
      
      onTrim(newUrl, startSec, endSec, autoExtract);
    } catch (e) {
      console.error("Trim failed", e);
    }
    setIsProcessing(false);
  };
  
  const handleNudge = (type: 'start' | 'end', amount: number) => {
    const regions = regionsRef.current?.getRegions();
    if (!regions || regions.length === 0) return;
    
    const region = regions[0];
    let newStart = region.start;
    let newEnd = region.end;
    
    if (type === 'start') {
        newStart = Math.max(0, Math.min(newStart + amount, newEnd - 0.2));
    } else {
        newEnd = Math.max(newStart + 0.2, Math.min(newEnd + amount, duration));
    }
    
    region.setOptions({
        start: newStart,
        end: newEnd
    });
    
    setStartSec(newStart);
    setEndSec(newEnd);
  };
  
  return (
    <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
      <style>{`
        ::part(region-handle) {
          width: 30px !important;
        }
        ::part(region-handle-right) {
          border-right: 3px solid #fbbf24 !important;
          background: linear-gradient(to right, transparent, rgba(251,191,36,0.3)) !important;
        }
        ::part(region-handle-left) {
          border-left: 3px solid #fbbf24 !important;
          background: linear-gradient(to left, transparent, rgba(251,191,36,0.3)) !important;
        }
      `}</style>
      <div className="w-full relative bg-gradient-to-b from-black/60 to-black/30 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        
        {mode !== "preview" && (
          <div className="absolute top-4 left-6 z-10 flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">
              Trim Region
            </span>
            <span className="text-xs font-mono text-white/70">
              {(() => {
                const formatTime = (sec: number) => {
                  const m = Math.floor(sec / 60);
                  const s = sec % 60;
                  if (m > 0) return `${m}'${s.toFixed(2).padStart(5, '0')}`;
                  return `${s.toFixed(2)}s`;
                };
                return `${formatTime(Math.max(0, endSec - startSec))} / ${formatTime(duration)}`;
              })()}
            </span>
          </div>
        )}

        {(!isReady || isProcessing) && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 rounded-2xl">
             <div className="flex flex-col items-center gap-3">
                 <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                 {isProcessing && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest animate-pulse">Processing...</span>}
             </div>
           </div>
        )}
        <div ref={containerRef} className="w-full mt-8 rounded-lg overflow-hidden touch-none select-none" />
        
        {/* Nudgers for mobile precision */}
        {mode !== "preview" && (
           <div className="flex w-full items-center justify-between mt-6 gap-2 sm:gap-4">
               <div className="flex flex-col items-start gap-1 sm:gap-1.5 flex-1">
                   <span className="text-[9px] sm:text-[10px] text-white/50 uppercase font-bold tracking-wider pl-1">Start Time</span>
                   <div className="flex items-center w-full bg-black/40 rounded-xl p-1 border border-white/10 shadow-inner">
                       <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/50 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all active:scale-95 shrink-0" onClick={() => handleNudge('start', -0.1)}><Minus className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                       <span className="text-[10px] sm:text-xs font-mono text-white/90 flex-1 text-center font-medium">
                          {(() => {
                            const sec = startSec;
                            const m = Math.floor(sec / 60);
                            const s = sec % 60;
                            if (m > 0) return `${m}'${s.toFixed(2).padStart(5, '0')}`;
                            return `${s.toFixed(2)}s`;
                          })()}
                       </span>
                       <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/50 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all active:scale-95 shrink-0" onClick={() => handleNudge('start', 0.1)}><Plus className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                   </div>
               </div>
               
               <div className="flex flex-col items-start gap-1 sm:gap-1.5 flex-1">
                   <span className="text-[9px] sm:text-[10px] text-white/50 uppercase font-bold tracking-wider pl-1">End Time</span>
                   <div className="flex items-center w-full bg-black/40 rounded-xl p-1 border border-white/10 shadow-inner">
                       <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/50 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all active:scale-95 shrink-0" onClick={() => handleNudge('end', -0.1)}><Minus className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                       <span className="text-[10px] sm:text-xs font-mono text-white/90 flex-1 text-center font-medium">
                          {(() => {
                            const sec = endSec;
                            const m = Math.floor(sec / 60);
                            const s = sec % 60;
                            if (m > 0) return `${m}'${s.toFixed(2).padStart(5, '0')}`;
                            return `${s.toFixed(2)}s`;
                          })()}
                       </span>
                       <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/50 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all active:scale-95 shrink-0" onClick={() => handleNudge('end', 0.1)}><Plus className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                   </div>
               </div>
           </div>
        )}
      </div>
      

      {mode === "full" && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[9px] sm:text-[10px] tracking-widest uppercase border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all shrink-0"
            >
              Cancel
            </button>
            
            <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-full shrink-0">
               <button 
                 onClick={handleReplay}
                 disabled={!isReady || isProcessing}
                 className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
                 title="Replay from start"
               >
                 <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
               <button 
                 onClick={handlePlayPause}
                 disabled={!isReady || isProcessing}
                 className="flex items-center gap-1.5 bg-blue-500 text-white pl-3 pr-4 py-1.5 sm:pl-4 sm:pr-5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] tracking-widest uppercase hover:bg-blue-400 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
               >
                 {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                 {isPlaying ? "Pause" : "Play Preview"}
               </button>
            </div>
            
            <button
              onClick={() => handleApply(false)}
              disabled={!isReady || isProcessing}
              className="flex items-center gap-1.5 bg-amber-400 text-black px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[9px] sm:text-[10px] tracking-widest uppercase hover:bg-amber-300 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] shrink-0"
            >
              <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Apply Trim
            </button>
            
            {showExtractAction && (
              <button
                onClick={() => handleApply(true)}
                disabled={!isReady || isProcessing}
                className="flex items-center gap-1.5 bg-indigo-500 text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[9px] sm:text-[10px] tracking-widest uppercase hover:bg-indigo-400 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] shrink-0 w-full sm:w-auto justify-center mt-1 sm:mt-0"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Apply & Extract Stems
              </button>
            )}
        </div>
      )}
      
      {mode === "select-only" && (
         <div className="flex items-center gap-2 w-full justify-center">
             <button 
                 onClick={handlePlayPause}
                 disabled={!isReady || isProcessing}
                 className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full font-bold text-[10px] tracking-widest uppercase hover:bg-white/20 disabled:opacity-50 transition-all"
             >
                 {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                 {isPlaying ? "Pause" : "Preview Trim Region"}
             </button>
         </div>
      )}
      {mode === "preview" && (
         <div className="flex items-center gap-3 w-full justify-center mt-2">
             <button 
                 onClick={() => wavesurferRef.current?.play(0)}
                 disabled={!isReady}
                 className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
             >
                 <RotateCcw className="w-5 h-5" />
             </button>
             <button 
                 onClick={() => isPlaying ? wavesurferRef.current?.pause() : wavesurferRef.current?.play()}
                 disabled={!isReady}
                 className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
             >
                 {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
             </button>
         </div>
      )}

    </div>
  );
}
