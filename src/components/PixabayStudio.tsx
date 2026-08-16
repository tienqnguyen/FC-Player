import React, { useState, useEffect, useRef, useCallback } from 'react';
import TimelineScrubber from './TimelineScrubber';
import { Search, Play, Pause, Headphones, Download, Trash2, Plus, Sparkles, X, Edit2, Copy, Heart } from 'lucide-react';

interface SFXResult {
  id: number;
  name: string;
  url: string;
  duration: number;
  tags: string[];
}

interface SfxTrack {
  id: string;
  sfxId?: number;
  name: string;
  url?: string;
  duration?: number;
  buffer?: AudioBuffer;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  // properties
  startTime: number;
  trimStart: number; // For future expansion
  trimEnd: number; // For future expansion
  fadeIn: number;
  fadeOut: number;
  isEditingProps: boolean;
}

interface PixabayStudioProps {
  masterDuration?: number;
  onClose?: () => void;
  isPlaying?: boolean;
  primaryAudioRef?: React.MutableRefObject<Record<string, HTMLAudioElement>>;
  primaryStem?: string;
}

const CATEGORIES = ["atmosphere", "cinematic", "background", "atmospheric pads", "ambient pads", "dreamy pads", "synth pads", "chill pads", "space pads", "3d surround", "intro"];
const INSTRUMENTS = ["Piano", "Guitar", "Bass", "Drums", "Strings", "Synth", "Brass", "Woodwinds", "Percussion", "Vocals", "Pad"];

const PixabayStudio = React.forwardRef(({ onClose, isPlaying, primaryAudioRef, primaryStem, masterDuration }: PixabayStudioProps, ref) => {
  const tracksRef = useRef<SfxTrack[]>([]);
  const [tracks, setTracks] = useState<SfxTrack[]>([]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  React.useImperativeHandle(ref, () => ({ getTracks: () => tracks }), [tracks]);

  React.useImperativeHandle(ref, () => ({ getTracks: () => tracks }), [tracks]);

  React.useImperativeHandle(ref, () => ({ getTracks: () => tracks }), [tracks]);

  const [activeSearchTrackId, setActiveSearchTrackId] = useState<string | null>(null);
  
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [favorites, setFavorites] = useState<SFXResult[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('pixabayFavorites');
    if (saved) {
      try { setFavorites(JSON.parse(saved)); } catch(e){}
    }
  }, []);
  
  const toggleFavorite = (res: SFXResult) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === res.id);
      let next;
      if (exists) next = prev.filter(f => f.id !== res.id);
      else next = [...prev, res];
      localStorage.setItem('pixabayFavorites', JSON.stringify(next));
      return next;
    });
  };

  const [results, setResults] = useState<SFXResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, { source: AudioBufferSourceNode, gain: GainNode }>>(new Map());
  
  const handleFileUpload = async (trackId: string, file?: File) => {
    if (!file || !audioCtxRef.current) return;
    try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = await audioCtxRef.current.decodeAudioData(arrayBuf);
        setTracks(prev => prev.map(t => t.id === trackId ? {
            ...t,
            buffer,
            name: file.name,
            duration: buffer.duration,
            fadeOut: Math.min(2, buffer.duration / 2)
        } : t));
    } catch(e) {
        console.error(e);
        alert("Failed to load local audio file.");
    }
  };

  const handleUrlImport = async (trackId: string, url: string) => {
    if (!url || !audioCtxRef.current) return;
    
    // Pixabay link support: if it's a page link, try to extract ID and use Pixabay API
    let fetchUrl = url;
    if (url.includes('pixabay.com/sound-effects/')) {
          const match = url.match(/-(\d+)\/?$/);
        if (match && match[1]) {
            try {
                // If the user pastes a pixabay link, we just search for its ID to get the direct MP3 link
                const res = await fetch(`/api/pixabay/search?q=${match[1]}`);
                const data = await res.json();
                if (data.success && data.data && data.data.length > 0) {
                    fetchUrl = data.data[0].url;
                    // Pre-fill name from pixabay data
                    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, name: data.data[0].name || "Imported Sound" } : t));
                } else {
                    alert("Could not find Pixabay sound by ID.");
                    return;
                }
            } catch(e) {
                console.error(e);
                alert("Failed to resolve Pixabay link.");
                return;
            }
        }
    }

    try {
        const res = await fetch(fetchUrl);
        const arrayBuf = await res.arrayBuffer();
        const buffer = await audioCtxRef.current.decodeAudioData(arrayBuf);
        setTracks(prev => prev.map(t => t.id === trackId ? {
            ...t,
            buffer,
            duration: buffer.duration,
            name: t.name !== "New SFX" ? t.name : (fetchUrl.split('/').pop() || "Imported Link"),
            fadeOut: Math.min(2, buffer.duration / 2)
        } : t));
    } catch(e) {
        console.error(e);
        alert("Failed to load audio from URL. Ensure it's a direct media link (e.g., .mp3) and supports CORS.");
    }
  };

  const fetchSFX = async (searchQuery: string, pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pixabay/search?q=${encodeURIComponent(searchQuery)}&p=${pageNum}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResults(data.data.map((hit: any, i: number) => ({
          id: hit.id || i,
          name: hit.name || "Unknown",
          url: hit.url,
          duration: hit.duration || 5,
          tags: hit.tags || ["sfx"],
        })));
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSearchTrackId) {
      fetchSFX(category, 1); setPage(1);
    }
  }, [category, activeSearchTrackId]);

  const addTrack = () => {
    setShowFavorites(false);
    const newId = `sfx-${Date.now()}`;
    setTracks(prev => [...prev, {
      id: newId,
      name: `SFX ${prev.length + 1}`,
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSolo: false,
      startTime: 0,
      trimStart: 0,
      trimEnd: 0,
      fadeIn: 0.1,
      fadeOut: 0.5,
      isEditingProps: false
    }]);
    setActiveSearchTrackId(newId);
  };

  const removeTrack = (id: string) => {
    stopTrack(id);
    setTracks(prev => prev.filter(t => t.id !== id));
    if (activeSearchTrackId === id) setActiveSearchTrackId(null);
  };
  
  const duplicateTrack = (track: SfxTrack) => {
    const newId = `sfx-${Date.now()}`;
    setTracks(prev => [...prev, {
        ...track,
        id: newId,
        name: track.name + ' (Copy)'
    }]);
  };

  const loadSound = async (trackId: string, result: SFXResult) => {
    // Initial assignment so UI updates immediately
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, name: result.name, url: result.url, sfxId: result.id, duration: result.duration, isEditingProps: true } : t));
    setActiveSearchTrackId(null);
    if (playingPreview) {
       audioPreviewRef.current?.pause();
       setPlayingPreview(null);
    }
    
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const res = await fetch(result.url);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, buffer, duration: buffer.duration } : t));
    } catch (e) {
      console.error("Error loading sfx buffer", e);
    }
  };

  const togglePreview = (result: SFXResult) => {
    if (playingPreview === result.id) {
      audioPreviewRef.current?.pause();
      setPlayingPreview(null);
    } else {
      if (!audioPreviewRef.current) audioPreviewRef.current = new Audio();
      audioPreviewRef.current.src = result.url;
      audioPreviewRef.current.play();
      setPlayingPreview(result.id);
    }
  };

  // --- AUDIO SCHEDULING ---
  
  const anySolo = tracks.some(t => t.isSolo);
  
  const stopTrack = useCallback((trackId: string) => {
     const nodes = sourceNodesRef.current.get(trackId);
     if (nodes) {
        try { nodes.source.stop(); } catch(e){}
        try { nodes.source.disconnect(); } catch(e){}
        try { nodes.gain.disconnect(); } catch(e){}
        sourceNodesRef.current.delete(trackId);
     }
  }, []);
  
  const stopAll = useCallback(() => {
    sourceNodesRef.current.forEach((_, id) => stopTrack(id));
  }, [stopTrack]);

  const scheduleTrack = useCallback((track: SfxTrack, masterTime: number) => {
    if (!audioCtxRef.current || !track.buffer) return;
    const ctx = audioCtxRef.current;
    
    const trimStart = track.trimStart || 0;
    const trimEnd = track.trimEnd || 0;
    const activeDuration = track.duration! - trimStart - trimEnd;
    
    const playWindowStart = track.startTime;
    const playWindowEnd = track.startTime + activeDuration;
    
    if (masterTime >= playWindowEnd) return;
    
    stopTrack(track.id);
    
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    
    const fadeGainNode = ctx.createGain();
    const userGainNode = ctx.createGain();
    
    let finalGain = track.volume;
    if (track.isMuted) finalGain = 0;
    const _anySolo = tracksRef.current.some(t => t.isSolo);
    if (_anySolo && !track.isSolo) finalGain = 0;
    userGainNode.gain.value = finalGain;
    
    let offset = trimStart;
    let timeToStart = ctx.currentTime;
    
    if (masterTime > track.startTime) {
       const elapsed = masterTime - track.startTime;
       offset += elapsed;
       
       if (elapsed < track.fadeIn) {
           fadeGainNode.gain.setValueAtTime(0, timeToStart);
           fadeGainNode.gain.linearRampToValueAtTime(1, timeToStart + (track.fadeIn - elapsed));
       } else if (elapsed > activeDuration - track.fadeOut) {
           const fadeRemaining = activeDuration - elapsed;
           const curGain = (fadeRemaining / track.fadeOut);
           fadeGainNode.gain.setValueAtTime(curGain, timeToStart);
           fadeGainNode.gain.linearRampToValueAtTime(0, timeToStart + fadeRemaining);
       } else {
           fadeGainNode.gain.setValueAtTime(1, timeToStart);
           fadeGainNode.gain.setValueAtTime(1, timeToStart + (activeDuration - elapsed - track.fadeOut));
           fadeGainNode.gain.linearRampToValueAtTime(0, timeToStart + (activeDuration - elapsed));
       }
       source.start(timeToStart, offset, activeDuration - elapsed);
    } else {
       timeToStart = ctx.currentTime + (track.startTime - masterTime);
       fadeGainNode.gain.setValueAtTime(0, timeToStart);
       fadeGainNode.gain.linearRampToValueAtTime(1, timeToStart + track.fadeIn);
       fadeGainNode.gain.setValueAtTime(1, timeToStart + activeDuration - track.fadeOut);
       fadeGainNode.gain.linearRampToValueAtTime(0, timeToStart + activeDuration);
       source.start(timeToStart, trimStart, activeDuration);
    }
    
    source.connect(fadeGainNode);
    fadeGainNode.connect(userGainNode);
    userGainNode.connect(ctx.destination);
    
    sourceNodesRef.current.set(track.id, { source, gain: userGainNode });
  }, [stopTrack]);

  // When master isPlaying changes, trigger playback!
  useEffect(() => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    if (isPlaying) {
      if (ctx.state === 'suspended') ctx.resume();
      
      const masterAudio = primaryAudioRef?.current?.[primaryStem || ''];
      const masterTime = masterAudio ? masterAudio.currentTime : 0;
      
      tracks.forEach(t => scheduleTrack(t, masterTime));
    } else {
      stopAll();
    }
  }, [isPlaying, tracks, primaryAudioRef, primaryStem, scheduleTrack, stopAll]);
  
  // Realtime volume updates if playing
  useEffect(() => {
     tracks.forEach(track => {
         const nodes = sourceNodesRef.current.get(track.id);
         if (nodes && audioCtxRef.current) {
             let finalGain = track.volume;
             if (track.isMuted) finalGain = 0;
             if (anySolo && !track.isSolo) finalGain = 0;
             
             // We just set a target at time, assuming we aren't interfering with an active fade
             // Note: in a perfect app we'd track the envelope precisely, but this is fine for live mixing
             nodes.gain.gain.setTargetAtTime(finalGain, audioCtxRef.current.currentTime, 0.1);
         }
     });
  }, [tracks, anySolo]);

  // Reschedule tracks if their structural properties change while playing
  const prevTracksRef = useRef<SfxTrack[]>([]);
  useEffect(() => {
    if (isPlaying) {
       tracks.forEach(track => {
          const prev = prevTracksRef.current.find(t => t.id === track.id);
          // If it's new, or if timing/buffer changed, reschedule!
          if (!prev || prev.buffer !== track.buffer || prev.startTime !== track.startTime || prev.trimStart !== track.trimStart || prev.trimEnd !== track.trimEnd || prev.fadeIn !== track.fadeIn || prev.fadeOut !== track.fadeOut) {
             const masterAudio = primaryAudioRef?.current?.[primaryStem || ''];
             const masterTime = masterAudio ? masterAudio.currentTime : 0;
             scheduleTrack(track, masterTime);
          }
       });
    }
    prevTracksRef.current = tracks;
  }, [tracks, isPlaying, primaryAudioRef, primaryStem, scheduleTrack]);
  return (
    <div className="flex flex-col gap-2.5 w-full mt-4 border-t border-white/5 pt-4">
      {tracks.length > 0 && (
          <div className="flex items-center gap-2 mb-1 px-1">
             <span className="text-[9px] font-mono font-medium text-white/30">{tracks.length} Custom SFX Tracks</span>
          </div>
      )}
      
      {tracks.map(track => (
        <div key={track.id} className="flex flex-col gap-0 w-full bg-black/30 border border-white/5 hover:border-white/10 hover:bg-black/50 rounded-2xl transition-all duration-300 group relative">
          
          <div className="p-3 flex flex-col md:flex-row md:items-center gap-4">
              {/* Left: Icon, Name & M/S controls */}
              <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto shrink-0">
                 <div className="flex items-center gap-3 w-40">
                    <button 
                        onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? {...t, isEditingProps: !t.isEditingProps} : t))}
                        title="Edit Properties"
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/50 border border-white/5 transition-colors hover:bg-white/10 group-hover:bg-black/70 shadow-inner relative overflow-hidden group/icon text-cyan-400" 
                    >
                         <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/icon:opacity-100 transition-opacity">
                             <Edit2 className="w-4 h-4 text-white" />
                         </div>
                         <div className="group-hover/icon:opacity-0 transition-opacity flex items-center justify-center w-full h-full">
                             <Sparkles className="w-5 h-5" />
                         </div>
                    </button>
                    <div className="flex flex-col min-w-0">
                       <span className="text-xs font-black uppercase tracking-wider text-white truncate" style={{ textShadow: `0 0 8px rgba(6,182,212,0.5)` }}>{track.name}</span>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-black text-white/30 uppercase w-2 text-right">L</span>
                          <input
                              type="range" min="-1" max="1" step="0.01" value={track.pan}
                              onChange={(e) => setTracks(p => p.map(t => t.id === track.id ? {...t, pan: parseFloat(e.target.value)} : t))}
                              className="w-20 h-1 rounded-full appearance-none bg-white/10 accent-white/50 hover:accent-white/80"
                          />
                          <span className="text-[8px] font-black text-white/30 uppercase w-2 text-left">R</span>
                       </div>
                    </div>
                 </div>
                 
                 {/* Mute / Solo / Download buttons */}
                 <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                     <button
                        onClick={() => setTracks(p => p.map(t => t.id === track.id ? {...t, isMuted: !t.isMuted} : t))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${track.isMuted ? 'bg-red-500 text-black shadow-md shadow-red-500/20 border-red-500 font-extrabold' : 'bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                     >
                        <Pause className="w-3.5 h-3.5" />
                     </button>
                     <button
                        onClick={() => setTracks(p => p.map(t => t.id === track.id ? {...t, isSolo: !t.isSolo} : t))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${track.isSolo ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/20 border-yellow-500 font-extrabold' : 'bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                     >
                        <Headphones className="w-3.5 h-3.5" />
                     </button>
                     <button
                        onClick={() => removeTrack(track.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border bg-transparent border-transparent text-red-500/50 hover:text-red-400 hover:bg-red-500/10"
                     >
                        <Trash2 className="w-3.5 h-3.5" />
                     </button>
                 </div>
              </div>
              
              {/* Middle: Beautiful Flowing Waveform Canvas (or Add Sound) */}
              <div className="flex-1 h-16 sm:h-20 bg-black/50 border border-white/5 rounded-xl overflow-hidden relative group-hover:border-white/15 transition-colors shadow-inner flex items-center justify-center">
                 {!track.buffer && activeSearchTrackId !== track.id && (
                     <button 
                        onClick={() => setActiveSearchTrackId(track.id)}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-4 py-2 rounded-lg flex items-center gap-2"
                     >
                         <Search className="w-4 h-4" /> ADD FREESOUND
                     </button>
                 )}
                 {track.buffer && (
                     <TimelineScrubber track={track} setTracks={setTracks} masterDuration={masterDuration || 0} />
                 )}
                 
                 {/* Decorative Grid Lines */}
                 <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px]" />
                 <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
              </div>
              
              {/* Right: Vol Slider */}
              <div className="flex items-center gap-3.5 w-full md:w-56 shrink-0 bg-black/20 p-2 rounded-xl border border-white/5">
                 <svg className="w-4 h-4 text-white/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                 <div className="flex-1 relative flex items-center">
                    <input
                       type="range"
                       min="0" max="1" step="0.01"
                       value={track.volume}
                       onChange={(e) => setTracks(p => p.map(t => t.id === track.id ? {...t, volume: parseFloat(e.target.value)} : t))}
                       className="w-full h-1.5 rounded-lg appearance-none bg-white/10 cursor-pointer accent-cyan-400 focus:outline-none"
                    />
                 </div>
                 <div className="w-10 text-right text-[11px] font-black font-mono tracking-tight shrink-0 text-cyan-400">
                    {Math.round(track.volume * 100)}%
                 </div>
              </div>
          </div>
          
          {/* Track Properties Extender */}
          {track.isEditingProps && (
             <div className="w-full p-4 border-t border-white/5 bg-black/20 flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-top-2">
                 <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Start Time (s)</label>
                       <input 
                           type="number" min="0" step="0.1" 
                           value={track.startTime.toFixed(2)} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, startTime: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Trim Left (s)</label>
                       <input 
                           type="number" min="0" step="0.1" max={(track.duration || 0) - (track.trimEnd || 0)}
                           value={(track.trimStart || 0).toFixed(2)} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, trimStart: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Trim Right (s)</label>
                       <input 
                           type="number" min="0" step="0.1" max={(track.duration || 0) - (track.trimStart || 0)}
                           value={(track.trimEnd || 0).toFixed(2)} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, trimEnd: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Fade In (s)</label>
                       <input 
                           type="number" min="0" step="0.1" 
                           value={track.fadeIn} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, fadeIn: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Fade Out (s)</label>
                       <input 
                           type="number" min="0" step="0.1" 
                           value={track.fadeOut} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, fadeOut: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                 </div>
                 <div className="flex items-end gap-2">
                    <button 
                       onClick={() => duplicateTrack(track)}
                       className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white flex items-center gap-2"
                    >
                       <Copy className="w-3.5 h-3.5" /> DUPLICATE
                    </button>
                 </div>
             </div>
          )}
          
          {/* Active Search Modal for this track */}
          {activeSearchTrackId === track.id && (
             <div className="w-full p-4 border-t border-white/5 bg-black/40">
                 <div className="flex items-center justify-between mb-3">
                     <h4 className="text-[10px] font-bold text-white/50 uppercase flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Freesound search</h4>
                     <button onClick={() => setActiveSearchTrackId(null)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                 </div>
                 
                 <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-2">
                    <button
                        onClick={() => setShowFavorites(!showFavorites)}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          showFavorites ? 'bg-pink-500 text-white' : 'bg-white/5 text-pink-400 hover:bg-white/10'
                        }`}
                    >
                        <Heart className={`w-3.5 h-3.5 ${showFavorites ? 'fill-current' : ''}`} />
                        Favorites ({favorites.length})
                    </button>
                    <div className="w-px h-6 bg-white/10 shrink-0 self-center mx-1"></div>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setShowFavorites(false); }}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          !showFavorites && category === cat ? 'bg-cyan-500 text-black font-bold' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
                 
                                  {!showFavorites && (
                 <div className="flex flex-col gap-3 mb-3">
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                       {INSTRUMENTS.map(inst => (
                           <button
                             key={inst}
                             onClick={() => { setCategory(inst); setShowFavorites(false); }}
                             className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold whitespace-nowrap transition-colors ${
                               category === inst ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                             }`}
                           >
                             {inst}
                           </button>
                       ))}
                    </div>
                    <div className="flex items-center gap-2">
                    <input
                       type="text"
                       placeholder="Search Freesound..."
                       value={query}
                       onChange={e => setQuery(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') { fetchSFX(query, 1); setPage(1); } }}
                       className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <button onClick={() => { fetchSFX(query, 1); setPage(1); }} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-4 py-2 rounded-lg">
                       SEARCH
                    </button>
                 </div>
                 </div>
                 )}
                 
                 {showFavorites ? (
                    <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                       {favorites.map((res, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                             <span className="text-xs text-white/70 truncate flex-1">{res.name}</span>
                             <div className="flex items-center gap-2">
                                <button onClick={() => toggleFavorite(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-pink-400 hover:bg-black/60">
                                   <Heart className={`w-3.5 h-3.5 ${favorites.find(f => f.id === res.id) ? 'fill-pink-400 text-pink-400' : ''}`} />
                                </button>
                                <button onClick={() => togglePreview(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-white hover:bg-black/60">
                                   {playingPreview === res.id ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => loadSound(track.id, res)} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors">
                                   ADD TO TRACK
                                </button>
                             </div>
                          </div>
                       ))}
                       {favorites.length === 0 && <div className="text-center p-4 text-xs text-white/30">No favorites yet</div>}
                    </div>
                 ) : loading ? (
                    <div className="p-8 flex justify-center text-cyan-500"><Sparkles className="w-5 h-5 animate-spin" /></div>
                 ) : (
                    <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                       {results.map((res, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                             <span className="text-xs text-white/70 truncate flex-1">{res.name}</span>
                             <div className="flex items-center gap-2">
                                <button onClick={() => toggleFavorite(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-pink-400 hover:bg-black/60">
                                   <Heart className={`w-3.5 h-3.5 ${favorites.find(f => f.id === res.id) ? 'fill-pink-400 text-pink-400' : ''}`} />
                                </button>
                                <button onClick={() => togglePreview(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-white hover:bg-black/60">
                                   {playingPreview === res.id ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => loadSound(track.id, res)} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors">
                                   ADD TO TRACK
                                </button>
                             </div>
                          </div>
                       ))}
                       {results.length === 0 && <div className="text-center p-4 text-xs text-white/30">No results found</div>}
                    </div>
                 )}
                 
                 {/* Pagination */}
                 {!loading && !showFavorites && results.length > 0 && (
                     <div className="flex items-center justify-between pt-2 px-2 border-t border-white/5 mt-2">
                         <button 
                            disabled={page <= 1}
                            onClick={() => { const newPage = page - 1; setPage(newPage); fetchSFX(query || category, newPage); }}
                            className="text-[10px] font-bold text-white/50 hover:text-white disabled:opacity-30 px-2 py-1"
                         >
                             &lt; PREV
                         </button>
                         <span className="text-[10px] text-white/30">PAGE {page}</span>
                         <button 
                            onClick={() => { const newPage = page + 1; setPage(newPage); fetchSFX(query || category, newPage); }}
                            className="text-[10px] font-bold text-white/50 hover:text-white px-2 py-1"
                         >
                             NEXT &gt;
                         </button>
                     </div>
                 )}
             </div>
          )}
          
        </div>
      ))}
      
      <button 
        onClick={addTrack}
        className="w-full mt-2 border border-dashed border-cyan-500/30 hover:border-cyan-500/70 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-500 font-black tracking-widest text-[10px] py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
      >
        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        ADD SFX STEM
      </button>

    </div>
  );
});
export default PixabayStudio;
