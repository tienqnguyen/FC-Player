import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Scissors, Play, Pause, RotateCcw } from 'lucide-react';
import audioBufferToWav from 'audiobuffer-to-wav';

interface AudioTrimmerProps {
  audioUrl: string;
  onTrim: (trimmedAudioUrl: string, trimStart: number, trimEnd: number) => void;
  onCancel: () => void;
}

export default function AudioTrimmer({ audioUrl, onTrim, onCancel }: AudioTrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  
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
      plugins: [regions]
    });
    
    wavesurferRef.current = ws;
    
    ws.load(audioUrl);
    
    ws.on('ready', () => {
      const d = ws.getDuration();
      setDuration(d);
      setEndSec(d);
      setIsReady(true);
      
      regions.addRegion({
        start: 0,
        end: d,
        color: 'rgba(251, 191, 36, 0.25)',
        drag: false,
        resize: true
      });
    });
    
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    
    regions.on('region-updated', (region) => {
      setStartSec(region.start);
      setEndSec(region.end);
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
  
  const handleApply = async () => {
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
      
      onTrim(newUrl, startSec, endSec);
    } catch (e) {
      console.error("Trim failed", e);
    }
    setIsProcessing(false);
  };
  
  return (
    <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full relative bg-gradient-to-b from-black/60 to-black/30 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute top-4 left-6 z-10 flex flex-col gap-0.5">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">
            Trim Region
          </span>
          <span className="text-xs font-mono text-white/70">
            {Math.max(0, endSec - startSec).toFixed(2)}s / {duration.toFixed(2)}s
          </span>
        </div>
        {(!isReady || isProcessing) && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 rounded-2xl">
             <div className="flex flex-col items-center gap-3">
                 <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                 {isProcessing && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest animate-pulse">Processing...</span>}
             </div>
           </div>
        )}
        <div ref={containerRef} className="w-full mt-8 rounded-lg overflow-hidden" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-3 rounded-full font-bold text-[10px] tracking-widest uppercase border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-full">
             <button
               onClick={handleReplay}
               disabled={!isReady || isProcessing}
               className="flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
               title="Replay from start"
             >
               <RotateCcw className="w-4 h-4" />
             </button>
             <button
               onClick={handlePlayPause}
               disabled={!isReady || isProcessing}
               className="flex items-center gap-2 bg-blue-500 text-white pl-4 pr-5 py-2.5 rounded-full font-bold text-[10px] tracking-widest uppercase hover:bg-blue-400 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
             >
               {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
               {isPlaying ? "Pause" : "Play Preview"}
             </button>
          </div>

          <button
            onClick={handleApply}
            disabled={!isReady || isProcessing}
            className="flex items-center gap-2 bg-amber-400 text-black px-6 py-3 rounded-full font-bold text-[10px] tracking-widest uppercase hover:bg-amber-300 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] ml-auto sm:ml-0"
          >
            <Scissors className="w-4 h-4" />
            Apply Trim
          </button>
      </div>
    </div>
  );
}
