import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Loader2, Activity, Upload, Music, Settings2, Sliders, Terminal } from 'lucide-react';

interface SpectrogramProps {
  initialAudioUrl1?: string | null;
  initialAudioUrl2?: string | null;
  title1?: string;
  title2?: string;
  onClose?: () => void;
}

interface AudioData {
  url: string;
  title: string;
  columns: Uint8Array[];
  sampleRate: number;
  duration: number;
}

export default function SpectrogramTool({
  initialAudioUrl1 = null,
  initialAudioUrl2 = null,
  title1 = "Original Audio",
  title2 = "Exported Audio",
  onClose
}: SpectrogramProps) {
  const [data1, setData1] = useState<AudioData | null>(null);
  const [data2, setData2] = useState<AudioData | null>(null);
  
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  
  const [colormap, setColormap] = useState<string>("magma");
  const [maxFreq, setMaxFreq] = useState<number>(20000);
  
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  
  const [playing1, setPlaying1] = useState(false);
  const [playing2, setPlaying2] = useState(false);
  
  const [progress1, setProgress1] = useState(0);
  const [progress2, setProgress2] = useState(0);
  const rafRef = useRef<number>();
  
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  
  const [logs, setLogs] = useState<{time: Date, msg: string}[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  
  const addLog = (msg: string) => {
    setLogs(prev => [...prev, { time: new Date(), msg }]);
  };
  
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, showTerminal]);

  useEffect(() => {
    if (initialAudioUrl1) {
      loadAudio(initialAudioUrl1, title1, 1);
    }
    if (initialAudioUrl2) {
      loadAudio(initialAudioUrl2, title2, 2);
    }
    
    return () => {
      cancelAnimationFrame(rafRef.current!);
      if (audio1Ref.current) audio1Ref.current.pause();
      if (audio2Ref.current) audio2Ref.current.pause();
    };
  }, []);

  const loadAudio = async (url: string, title: string, paneIndex: 1 | 2) => {
    if (paneIndex === 1) setLoading1(true);
    else setLoading2(true);
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      
      const analyser = offlineCtx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.1;
      
      const processor = offlineCtx.createScriptProcessor(4096, 1, 1);
      
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(offlineCtx.destination);
      
      const columns: Uint8Array[] = [];
      processor.onaudioprocess = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        columns.push(data);
      };
      
      source.start(0);
      await offlineCtx.startRendering();
      
      const newData: AudioData = {
        url,
        title,
        columns,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration
      };
      
      addLog(`[${title}] Decoded: ${audioBuffer.duration.toFixed(3)}s | ${audioBuffer.sampleRate}Hz | ${audioBuffer.numberOfChannels}ch`);
      addLog(`[${title}] Spectral frames: ${columns.length} | Bins: ${analyser.frequencyBinCount}`);
      
      if (paneIndex === 1) {
        setData1(newData);
        if (audio1Ref.current) {
            audio1Ref.current.src = url;
            audio1Ref.current.load();
        } else {
            const a = new Audio(url);
            a.crossOrigin = "anonymous";
            audio1Ref.current = a;
        }
      } else {
        setData2(newData);
        if (audio2Ref.current) {
            audio2Ref.current.src = url;
            audio2Ref.current.load();
        } else {
            const a = new Audio(url);
            a.crossOrigin = "anonymous";
            audio2Ref.current = a;
        }
      }
    } catch (err) {
      console.error("Failed to generate spectrogram", err);
    } finally {
      if (paneIndex === 1) setLoading1(false);
      else setLoading2(false);
    }
  };

  const drawSpectrogram = (
    canvas: HTMLCanvasElement | null, 
    data: AudioData | null
  ) => {
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    
    const maxBinIndex = Math.min(
      data.columns[0].length - 1,
      Math.floor((maxFreq / (data.sampleRate / 2)) * data.columns[0].length)
    );
    
    for (let x = 0; x < width; x++) {
      const colIndex = Math.floor((x / width) * data.columns.length);
      const col = data.columns[colIndex];
      if (!col) continue;
      
      for (let y = 0; y < height; y++) {
        const binIndex = Math.floor(((height - 1 - y) / height) * maxBinIndex);
        const val = col[binIndex] || 0;
        const index = (y * width + x) * 4;
        
        if (colormap === 'magma') {
            imgData.data[index] = val; 
            imgData.data[index+1] = Math.max(0, val - 64); 
            imgData.data[index+2] = Math.max(0, val - 128);
        } else if (colormap === 'viridis') {
            imgData.data[index] = Math.max(0, val - 50);
            imgData.data[index+1] = val;
            imgData.data[index+2] = Math.max(0, 150 - val);
        } else if (colormap === 'cyan') {
            imgData.data[index] = 0;
            imgData.data[index+1] = val;
            imgData.data[index+2] = val;
        } else {
            imgData.data[index] = val;
            imgData.data[index+1] = val;
            imgData.data[index+2] = val;
        }
        imgData.data[index+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  // Re-draw when data or settings change
  useEffect(() => {
    drawSpectrogram(canvas1Ref.current, data1);
  }, [data1, colormap, maxFreq]);
  
  useEffect(() => {
    drawSpectrogram(canvas2Ref.current, data2);
  }, [data2, colormap, maxFreq]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawSpectrogram(canvas1Ref.current, data1);
      drawSpectrogram(canvas2Ref.current, data2);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data1, data2, colormap, maxFreq]);

  // Compute Similarity Score
  useEffect(() => {
    if (!data1 || !data2) {
      setSimilarity(null);
      return;
    }
    
    setIsComparing(true);
    
    // Defer comparison so UI doesn't block immediately
    setTimeout(() => {
        let totalDiff = 0;
        let totalCells = 0;
        
        // Find minimum lengths to compare overlap
        const minCols = Math.min(data1.columns.length, data2.columns.length);
        const minBins = Math.min(
            data1.columns[0]?.length || 0, 
            data2.columns[0]?.length || 0
        );
        
        if (minCols === 0 || minBins === 0) {
            setSimilarity(null);
            setIsComparing(false);
            return;
        }

        for (let i = 0; i < minCols; i++) {
            const col1 = data1.columns[i];
            const col2 = data2.columns[i];
            for (let j = 0; j < minBins; j++) {
                totalDiff += Math.abs(col1[j] - col2[j]);
                totalCells++;
            }
        }
        
        const maxPossibleDiff = totalCells * 255;
        const sim = Math.max(0, 100 * (1 - (totalDiff / maxPossibleDiff)));
        setSimilarity(sim);
        setIsComparing(false);
        addLog(`[Compare] Validated points: ${totalCells}`);
        addLog(`[Compare] Visual match index: ${sim.toFixed(4)}%`);
    }, 10);
    
  }, [data1, data2]);

  // Update playback progress
  const updateProgress = () => {
    if (audio1Ref.current && !audio1Ref.current.paused) {
      setProgress1(audio1Ref.current.currentTime / audio1Ref.current.duration);
    }
    if (audio2Ref.current && !audio2Ref.current.paused) {
      setProgress2(audio2Ref.current.currentTime / audio2Ref.current.duration);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafRef.current!);
  }, []);

  const togglePlay = (paneIndex: 1 | 2) => {
    const audio = paneIndex === 1 ? audio1Ref.current : audio2Ref.current;
    if (!audio) return;
    
    if (audio.paused) {
      if (audio.ended || audio.currentTime >= (audio.duration || 0)) {
        audio.currentTime = 0;
      }
      if (paneIndex === 1) setPlaying1(true);
      else setPlaying2(true);

      audio.play().catch(err => {
        console.error(`Audio ${paneIndex} play error:`, err);
        if (paneIndex === 1) setPlaying1(false);
        else setPlaying2(false);
        addLog(`[Audio ${paneIndex} Error] ${err.message || 'Playback blocked'}`);
      });
      
      audio.onended = () => {
        if (paneIndex === 1) {
            setPlaying1(false);
            setProgress1(0);
        } else {
            setPlaying2(false);
            setProgress2(0);
        }
      };
    } else {
      audio.pause();
      if (paneIndex === 1) setPlaying1(false);
      else setPlaying2(false);
    }
  };

  const togglePlayBoth = () => {
    const isPlayingBoth = playing1 || playing2;
    if (isPlayingBoth) {
        addLog("[Audio] Stopping dual playback");
        if (audio1Ref.current) audio1Ref.current.pause();
        if (audio2Ref.current) audio2Ref.current.pause();
        setPlaying1(false);
        setPlaying2(false);
    } else {
        addLog("[Audio] Starting dual playback for both channels");
        const a1 = audio1Ref.current;
        const a2 = audio2Ref.current;

        if (a1) {
            if (a1.ended || a1.currentTime >= (a1.duration || 0)) {
                a1.currentTime = 0;
            }
            setPlaying1(true);
            a1.play().catch(err => {
                console.error("Audio 1 play error:", err);
                setPlaying1(false);
                addLog(`[Audio 1 Error] ${err.message || 'Playback blocked'}`);
            });
            a1.onended = () => { setPlaying1(false); setProgress1(0); };
        }

        if (a2) {
            if (a2.ended || a2.currentTime >= (a2.duration || 0)) {
                a2.currentTime = 0;
            }
            setPlaying2(true);
            a2.play().catch(err => {
                console.error("Audio 2 play error:", err);
                setPlaying2(false);
                addLog(`[Audio 2 Error] ${err.message || 'Playback blocked'}`);
            });
            a2.onended = () => { setPlaying2(false); setProgress2(0); };
        }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>, paneIndex: 1 | 2, duration: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    
    const audio = paneIndex === 1 ? audio1Ref.current : audio2Ref.current;
    if (audio) {
      audio.currentTime = time;
      if (paneIndex === 1) setProgress1(percent);
      else setProgress2(percent);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, paneIndex: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      loadAudio(url, file.name, paneIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0A0B10] text-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Activity className="w-4 h-4" />
            </div>
            <div>
                <h2 className="text-sm font-black tracking-widest uppercase text-white">Spectrogram Compare</h2>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-white/50">Analyze frequencies side by side</p>
                    {isComparing ? (
                        <span className="text-[9px] text-amber-400 flex items-center gap-1 font-bold animate-pulse"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Comparing...</span>
                    ) : similarity !== null ? (
                        <>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${similarity < 90 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                                Match: {similarity.toFixed(2)}%
                            </span>
                            <span className={`text-[9px] font-mono hidden sm:inline-block ${similarity < 90 ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                                {similarity < 90 ? "✓ < 90% Good to pass Suno filter" : "⚠️ ≥ 90% Too similar (Needs < 90% to pass Suno filter)"}
                            </span>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            {(data1 || data2) && (
                <button
                    onClick={togglePlayBoth}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-indigo-500/30"
                >
                    {playing1 || playing2 ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    Both
                </button>
            )}
            <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border ${showTerminal ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-[#1A1B23] text-white/60 border-white/10 hover:text-white'}`}
            >
                <Activity className="w-3.5 h-3.5" /> Log
            </button>
            <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-white/40" />
                <select 
                    value={colormap} 
                    onChange={(e) => setColormap(e.target.value)}
                    className="bg-[#1A1B23] text-white border border-white/10 rounded-lg text-[11px] font-bold px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:border-white/20 transition-colors shadow-inner"
                >
                    <option value="magma" className="bg-[#1A1B23] text-white">Magma (Fire)</option>
                    <option value="viridis" className="bg-[#1A1B23] text-white">Viridis (Nature)</option>
                    <option value="cyan" className="bg-[#1A1B23] text-white">Cyan (Ice)</option>
                    <option value="grayscale" className="bg-[#1A1B23] text-white">Grayscale</option>
                </select>
                
                <div className="flex flex-col ml-2 w-32">
                    <div className="flex justify-between text-[9px] text-white/50 font-bold mb-1">
                        <span>Freq Range</span>
                        <span className="text-indigo-400">{maxFreq / 1000}kHz</span>
                    </div>
                    <input 
                        type="range" 
                        min="2000" 
                        max="22050" 
                        step="100" 
                        value={maxFreq}
                        onChange={(e) => setMaxFreq(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                    />
                </div>
            </div>
            
            {onClose && (
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors ml-2"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 pointer-events-none z-0"></div>
        
        {/* Pane 1 */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 relative z-10 bg-black/20 rounded-2xl border border-white/5 p-2 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between shrink-0 px-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        {data1 ? data1.title : title1}
                    </span>
                    {loading1 && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
                </div>
                
                <div className="flex items-center gap-2">
                    {data1 && (
                        <button 
                            onClick={() => togglePlay(1)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            {playing1 ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" />}
                        </button>
                    )}
                    <label className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border border-dashed border-white/20">
                        <Upload className="w-3 h-3 text-white/50" />
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, 1)} />
                    </label>
                </div>
            </div>
            
            <div className="flex-1 relative rounded-xl overflow-hidden bg-black/60 cursor-crosshair border border-white/5" onClick={(e) => data1 && handleSeek(e, 1, data1.duration)}>
                <canvas ref={canvas1Ref} className="absolute inset-0 w-full h-full object-fill" />
                {data1 && (
                    <div 
                        className="absolute top-0 bottom-0 w-px bg-white shadow-[0_0_10px_#fff] z-20 pointer-events-none"
                        style={{ left: `${progress1 * 100}%` }}
                    />
                )}
                {!data1 && !loading1 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest pointer-events-none">
                        No Audio Loaded
                    </div>
                )}
            </div>
        </div>

        {/* Pane 2 */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 relative z-10 bg-black/20 rounded-2xl border border-white/5 p-2 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between shrink-0 px-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                        {data2 ? data2.title : title2}
                    </span>
                    {loading2 && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
                </div>
                
                <div className="flex items-center gap-2">
                    {data2 && (
                        <button 
                            onClick={() => togglePlay(2)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            {playing2 ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" />}
                        </button>
                    )}
                    <label className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border border-dashed border-white/20">
                        <Upload className="w-3 h-3 text-white/50" />
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, 2)} />
                    </label>
                </div>
            </div>
            
            <div className="flex-1 relative rounded-xl overflow-hidden bg-black/60 cursor-crosshair border border-white/5" onClick={(e) => data2 && handleSeek(e, 2, data2.duration)}>
                <canvas ref={canvas2Ref} className="absolute inset-0 w-full h-full object-fill" />
                {data2 && (
                    <div 
                        className="absolute top-0 bottom-0 w-px bg-white shadow-[0_0_10px_#fff] z-20 pointer-events-none"
                        style={{ left: `${progress2 * 100}%` }}
                    />
                )}
                {!data2 && !loading2 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest pointer-events-none">
                        No Audio Loaded
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* Terminal View */}
      {showTerminal && (
        <div className="h-48 shrink-0 bg-black/95 border-t border-white/10 p-3 font-mono text-[10px] sm:text-xs overflow-y-auto console-scrollbar text-emerald-400 relative z-20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]" ref={terminalRef}>
            <div className="flex items-center justify-between mb-2 text-white/50 sticky top-0 bg-black/90 backdrop-blur-md pb-2 border-b border-white/10 z-10">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-emerald-400" />
                    <span className="uppercase tracking-widest font-black text-[10px] text-white/80">Diagnostics Console</span>
                </div>
                <button 
                    onClick={() => setLogs([])} 
                    className="text-[9px] uppercase tracking-wider text-white/40 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                    Clear Logs
                </button>
            </div>
            <div className="flex flex-col gap-1">
                {logs.length === 0 && <div className="text-white/30 italic">No logs recorded...</div>}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors border-b border-white/[0.02]">
                        <span className="text-white/30 shrink-0 font-mono">[{log.time.toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}]</span>
                        <span className="break-words whitespace-pre-wrap font-mono text-emerald-300">{log.msg}</span>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
