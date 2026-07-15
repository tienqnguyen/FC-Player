import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Scissors } from 'lucide-react';
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
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const regions = RegionsPlugin.create();
    regionsRef.current = regions;
    
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255, 255, 255, 0.2)',
      progressColor: 'rgba(251, 191, 36, 0.8)',
      cursorColor: '#fbbf24',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 120,
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
        color: 'rgba(251, 191, 36, 0.2)',
        drag: false,
        resize: true
      });
    });
    
    regions.on('region-updated', (region) => {
      setStartSec(region.start);
      setEndSec(region.end);
    });
    
    return () => {
      ws.destroy();
    };
  }, [audioUrl]);
  
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
    <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full relative bg-black/40 border border-white/10 rounded-xl p-4">
        <div className="absolute top-2 left-4 z-10 text-[10px] font-bold text-white/50 uppercase tracking-widest">
          Trim Region ({Math.max(0, endSec - startSec).toFixed(1)}s)
        </div>
        {(!isReady || isProcessing) && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 rounded-xl">
             <div className="flex flex-col items-center gap-2">
                 <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                 {isProcessing && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Processing...</span>}
             </div>
           </div>
        )}
        <div ref={containerRef} className="w-full mt-4" />
      </div>
      <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-full font-bold text-xs tracking-widest uppercase border border-white/20 text-white/70 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!isReady || isProcessing}
            className="flex items-center gap-2 bg-amber-400 text-black px-6 py-2.5 rounded-full font-bold text-xs tracking-widest uppercase hover:bg-amber-300 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)]"
          >
            <Scissors className="w-4 h-4" />
            Apply Trim
          </button>
      </div>
    </div>
  );
}
