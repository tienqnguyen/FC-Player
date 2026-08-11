import React, { useRef, useState, useEffect, useMemo } from 'react';

export default function TimelineScrubber({ track, setTracks, masterDuration }: { track: any, setTracks: any, masterDuration: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // activeDrag: 'move', 'left', 'right', or null
  const dragState = useRef<{ mode: string; startX: number; initialStartTime: number; initialTrimStart: number; initialTrimEnd: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, mode: string) => {
    e.stopPropagation();
    if (!containerRef.current || !masterDuration) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    dragState.current = {
      mode,
      startX: (e.clientX - rect.left) / rect.width * masterDuration,
      initialStartTime: track.startTime,
      initialTrimStart: track.trimStart || 0,
      initialTrimEnd: track.trimEnd || 0
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState.current || !containerRef.current || !masterDuration) return;
    const state = dragState.current;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / rect.width * masterDuration;
    const delta = currentX - state.startX;
    
    const duration = track.duration || 0;
    
    setTracks((p: any[]) => p.map(t => {
      if (t.id !== track.id) return t;
      
      let newStartTime = state.initialStartTime;
      let newTrimStart = state.initialTrimStart;
      let newTrimEnd = state.initialTrimEnd;
      
      if (state.mode === 'move') {
        newStartTime = state.initialStartTime + delta;
        // constrain
        if (newStartTime < 0) newStartTime = 0;
        const maxStart = masterDuration - (duration - newTrimStart - newTrimEnd);
        if (newStartTime > maxStart) newStartTime = Math.max(0, maxStart);
      } else if (state.mode === 'left') {
        newTrimStart = state.initialTrimStart + delta;
        if (newTrimStart < 0) newTrimStart = 0;
        if (newTrimStart > duration - newTrimEnd - 0.1) newTrimStart = duration - newTrimEnd - 0.1;
        
        // When we change trim start, we also shift the start time so the right edge stays in place
        const trimDelta = newTrimStart - state.initialTrimStart;
        newStartTime = state.initialStartTime + trimDelta;
        
        // If start time goes below 0, we have to clamp it
        if (newStartTime < 0) {
            newStartTime = 0;
            newTrimStart = state.initialTrimStart - state.initialStartTime;
        }
      } else if (state.mode === 'right') {
        newTrimEnd = state.initialTrimEnd - delta;
        if (newTrimEnd < 0) newTrimEnd = 0;
        if (newTrimEnd > duration - newTrimStart - 0.1) newTrimEnd = duration - newTrimStart - 0.1;
        
        // Right edge drag doesn't move start time, unless we need to clamp because of master duration
        const newActiveDuration = duration - newTrimStart - newTrimEnd;
        if (newStartTime + newActiveDuration > masterDuration) {
           newTrimEnd = duration - newTrimStart - (masterDuration - newStartTime);
        }
      }
      
      return { ...t, startTime: newStartTime, trimStart: newTrimStart, trimEnd: newTrimEnd };
    }));
  };

  const handleMouseUp = () => {
    dragState.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!masterDuration || !track.duration) {
      return (
          <div className="absolute inset-0 flex items-center px-2 opacity-60 overflow-hidden w-full">
            {Array.from({ length: 60 }).map((_, i) => (
               <div key={i} className="w-1 bg-cyan-500 rounded-full flex-shrink-0 mx-[1px]" style={{ height: `${20 + Math.random() * 80}%` }} />
            ))}
          </div>
      );
  }

  const trimStart = track.trimStart || 0;
  const trimEnd = track.trimEnd || 0;
  const activeDuration = track.duration - trimStart - trimEnd;
  
  const leftPercent = (track.startTime / masterDuration) * 100;
  const widthPercent = (activeDuration / masterDuration) * 100;

  return (
    <div className="absolute inset-0 w-full h-full cursor-ew-resize" ref={containerRef} onMouseDown={(e) => {
        // Only jump if clicking outside the clip
        if (e.target !== containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let percent = x / rect.width;
        let newStart = percent * masterDuration;
        const maxStart = Math.max(0, masterDuration - activeDuration);
        if (newStart > maxStart) newStart = maxStart;
        setTracks((p: any[]) => p.map(t => t.id === track.id ? {...t, startTime: newStart} : t));
        handleMouseDown(e, 'move');
    }}>
      <div 
        className="absolute top-1 bottom-1 bg-cyan-500/20 border border-cyan-500/50 rounded-lg flex items-center justify-center overflow-hidden"
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
{/* Fake visualization scaled to clip */}
        <div className="absolute inset-0 flex items-center justify-between px-1 opacity-60">
            {useMemo(() => Array.from({ length: 200 }).map(() => 30 + Math.random() * 70), []).slice(0, Math.max(5, Math.floor(activeDuration * 5))).map((h, i) => (
               <div key={i} className="w-0.5 bg-cyan-400 rounded-full mx-px" style={{ height: `${h}%` }} />
            ))}
        </div>
        
        {/* Handles */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-2.5 bg-white/30 hover:bg-white/80 cursor-col-resize flex flex-col justify-center items-center backdrop-blur-sm z-10 border-r border-cyan-500/30"
          onMouseDown={(e) => handleMouseDown(e, 'left')}
        >
          <div className="w-0.5 h-3 bg-black/40 rounded-full"></div>
        </div>
        
        <div 
          className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/30 hover:bg-white/80 cursor-col-resize flex flex-col justify-center items-center backdrop-blur-sm z-10 border-l border-cyan-500/30"
          onMouseDown={(e) => handleMouseDown(e, 'right')}
        >
           <div className="w-0.5 h-3 bg-black/40 rounded-full"></div>
        </div>
        
        <div className="absolute top-1 left-3 text-[8px] font-black text-cyan-200 bg-black/60 px-1 rounded shadow-sm whitespace-nowrap">
          {track.startTime.toFixed(1)}s
        </div>
      </div>
    </div>
  );
}
