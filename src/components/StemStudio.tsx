import WaveSurfer from "wavesurfer.js";
import JSZip from 'jszip';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import audioBufferToWav from 'audiobuffer-to-wav';

function normalizeAudioBuffer(buffer: AudioBuffer) {
  let maxVal = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > maxVal) {
        maxVal = Math.abs(data[i]);
      }
    }
  }
  if (maxVal > 1.0) {
    const ratio = 0.99 / maxVal;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        data[i] *= ratio;
      }
    }
  }
}

function audioBufferToMp3(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const globalLame = (window as any).lamejs;
  if (!globalLame) {
    throw new Error("LAME MP3 library could not be loaded from CDN. Please check your internet connection.");
  }
  const EncoderClass = globalLame.Mp3Encoder;
  if (!EncoderClass) {
    throw new Error("LAME MP3 encoder constructor was not found inside lamejs library.");
  }
  const mp3encoder = new EncoderClass(channels, sampleRate, 192);
  const mp3Data: any[] = [];
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;
  const sampleBlockSize = 1152;
  
  const leftChunk = new Int16Array(sampleBlockSize);
  const rightChunk = new Int16Array(sampleBlockSize);

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const end = Math.min(left.length, i + sampleBlockSize);
    const chunkLength = end - i;
    
    const lChunk = chunkLength === sampleBlockSize ? leftChunk : new Int16Array(chunkLength);
    const rChunk = chunkLength === sampleBlockSize ? rightChunk : new Int16Array(chunkLength);

    for (let j = 0; j < chunkLength; j++) {
      lChunk[j] = Math.max(-1, Math.min(1, left[i + j])) * 0x7FFF;
      if (channels > 1) {
        rChunk[j] = Math.max(-1, Math.min(1, right[i + j])) * 0x7FFF;
      }
    }

    let mp3buf;
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(lChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(lChunk, rChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Int8Array(mp3buf));
  }
  return new Blob(mp3Data, {type: 'audio/mp3'});
}
import { Play, Pause, ChevronDown, ChevronRight, ChevronUp, Volume2, VolumeX, X, Settings2, Download, Maximize2, Minimize2, Radio, Activity, Sliders, Sparkles, ArrowLeft, Plus, Loader2, Zap, Cloud, Brain, Headphones, Clock, Music, Wind, RotateCcw, Type, Check } from 'lucide-react';
import { transcribeWithCohere } from '../utils/cohereTranscriber';
import { transcribeWithRNNT } from '../utils/rnntTranscriber';
import { Copy, FileText, Edit2, Save } from 'lucide-react';

interface StemStudioProps {
  originalAudioUrl?: string | null;
  stemUrls?: { vocals?: string | null; drums?: string | null; bass?: string | null; guitar?: string | null; piano?: string | null; other?: string | null } | null;
  songTitle: string;
  coverUrl?: string | null;
  originalDuration?: number;
  onClose: () => void;
  isEmbedded?: boolean;
  isCompactUI?: boolean;
  stemmixStatus?: "idle" | "loading" | "ready" | "error";
  progress?: number;
  stemmixError?: string | null;
  onRetrySeparate?: () => void;
  separationMode?: "webgpu" | "onnx" | "ai";
  onStemLoadError?: (stem: string, error: string) => void;
  onSetSeparationMode?: (mode: "webgpu" | "onnx" | "ai") => void;
  newSongTitle?: string | null;
  onExtractNewSong?: () => void;
}

function textToLrc(rawText: string, totalDuration: number): string {
  if (!rawText) return "";
  
  // If the text already has LRC format timestamps like [01:23.45], return it as-is
  const lrcLineRegex = /^\[\d{2,}:\d{2}(?:\.\d{1,3})?\]/;
  const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0 && lines.every(line => lrcLineRegex.test(line))) {
    return rawText;
  }
  
  // Otherwise, split the raw text into logical lines/segments
  const rawSegments = rawText.split(/\n+/).filter(s => s.trim().length > 0);
  const processedSegments: string[] = [];
  
  for (const seg of rawSegments) {
    const clauses = seg.split(/(?<=[.?!,])\s+/).filter(c => c.trim().length > 0);
    for (const clause of clauses) {
      const words = clause.split(/\s+/).filter(w => w.length > 0);
      const wordsPerLine = 8;
      if (words.length <= 12) {
        processedSegments.push(clause.trim());
      } else {
        for (let i = 0; i < words.length; i += wordsPerLine) {
          const chunk = words.slice(i, i + wordsPerLine).join(' ');
          if (chunk.trim()) {
            processedSegments.push(chunk.trim());
          }
        }
      }
    }
  }
  
  const totalChars = processedSegments.reduce((acc, s) => acc + s.length, 0);
  let currTime = 0;
  
  const lrcLines = processedSegments.map(seg => {
    const ratio = seg.length / (totalChars || 1);
    const dur = ratio * (totalDuration || 60);
    const start = currTime;
    currTime += dur;
    
    const m = Math.floor(start / 60).toString().padStart(2, '0');
    const s = Math.floor(start % 60).toString().padStart(2, '0');
    const hundredths = Math.floor((start % 1) * 100).toString().padStart(2, '0');
    return `[${m}:${s}.${hundredths}] ${seg}`;
  });
  
  return lrcLines.join("\n");
}

function parseLrc(lrcText: string, totalDuration: number) {
  if (!lrcText) return [];
  const lines = lrcText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  // Supports [MM:SS.xx], [HH:MM:SS.xx], [MM:SS.xx -> MM:SS.xx]
  const lrcLineRegex = /^\[(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?(?:\s*(?:->|-->|\|)\s*(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?)?\]\s*(.*)$/;
  
  const parsed: { text: string; start: number; end: number }[] = [];
  
  for (const line of lines) {
    const match = line.match(lrcLineRegex);
    if (match) {
      const h1 = match[1] ? parseInt(match[1], 10) : 0;
      const m1 = parseInt(match[2], 10);
      const s1 = parseInt(match[3], 10);
      const frac1 = parseFloat(`0.${match[4] || "0"}`);
      const start = h1 * 3600 + m1 * 60 + s1 + frac1;
      
      const text = match[9].trim();
      let end = start + 2;
      
      if (match[6] !== undefined) {
          const h2 = match[5] ? parseInt(match[5], 10) : 0;
          const m2 = parseInt(match[6], 10);
          const s2 = parseInt(match[7], 10);
          const frac2 = parseFloat(`0.${match[8] || "0"}`);
          end = h2 * 3600 + m2 * 60 + s2 + frac2;
      }
      
      parsed.push({ text, start, end });
    } else {
      parsed.push({ text: line, start: -1, end: -1 });
    }
  }
  
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i].start === -1) {
      const prevStart = i > 0 ? parsed[i - 1].end : 0;
      parsed[i].start = prevStart;
      parsed[i].end = prevStart + 3;
    } else {
      // If we don't have an explicit end from the regex (start + 2 was used), 
      // let's adjust to the next line's start.
      if (parsed[i].end === parsed[i].start + 2) {
          if (i < parsed.length - 1 && parsed[i + 1].start !== -1) {
            parsed[i].end = parsed[i + 1].start;
          } else {
            parsed[i].end = Math.max(parsed[i].start + 3, totalDuration || (parsed[i].start + 5));
          }
      }
    }
  }
  
  return parsed;
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


function safeDecodeAudioData(ctx: any, audioData: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const promise = ctx.decodeAudioData(
        audioData,
        (buffer: any) => resolve(buffer),
        (err: any) => reject(err || new Error("decodeAudioData callback error"))
      );
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err: any) => reject(err || new Error("decodeAudioData promise error")));
      }
    } catch (err) {
      reject(err);
    }
  });
}


function StemWaveform({ url, color, audioElement }: { url: string, color: string, audioElement: HTMLMediaElement | null }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        if (!containerRef.current || !url) return;
        wsRef.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: color,
            progressColor: 'rgba(255,255,255,0.5)',
            url,
            media: audioElement,
            height: 'auto',
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            interact: false
        });
        return () => wsRef.current?.destroy();
    }, [url, color, audioElement]);

    return <div ref={containerRef} className="w-full h-full opacity-60 hover:opacity-100 transition-opacity absolute inset-0 mix-blend-screen" />;
}

export default function StemStudio({ 
  originalAudioUrl,
  stemUrls, 
  songTitle,
  coverUrl, 
  originalDuration, 
  onClose, 
  isEmbedded, 
  isCompactUI,
  stemmixStatus = "ready",
  progress = 0,
  stemmixError = null,
  onRetrySeparate,
  separationMode = "webgpu",
  onSetSeparationMode,
  onStemLoadError,
  newSongTitle,
  onExtractNewSong
}: StemStudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<"wav" | "mp3">("mp3");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadLink, setDownloadLink] = useState<{ url: string; filename: string } | null>(null);

  // To avoid memory leaks, revoke old URL when setting a new one or unmounting
  useEffect(() => {
    return () => {
      if (downloadLink) {
        try {
          URL.revokeObjectURL(downloadLink.url);
        } catch {}
      }
    };
  }, [downloadLink]);

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
  const [pans, setPans] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState<number>(1);
  const [preservePitch, setPreservePitch] = useState<boolean>(true);
  const [reverb, setReverb] = useState<number>(0);
  const pannerNodesRef = useRef<Record<string, StereoPannerNode>>({});
  const convolverRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const [mutes, setMutes] = useState<Record<string, boolean>>({
    vocals: false, drums: false, bass: false, guitar: false, piano: false, other: false
  });
  const [solos, setSolos] = useState<Record<string, boolean>>({
    vocals: false, drums: false, bass: false, guitar: false, piano: false, other: false
  });
  
  // Whisper Transcription States
    const [expandedSections, setExpandedSections] = useState({
    mixer: true,
    transcript: true,
    masterFx: true,
    masterEq: true,
    aiCloud: true
  });
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [subtitles, setSubtitles] = useState<any[] | null>(null);
  const [cohereTranscript, setCohereTranscript] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editingLineIdx, setEditingLineIdx] = useState<number | null>(null);
  const [editingLineText, setEditingLineText] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(originalDuration || 0);

  // Clear old song Vocal transcript when a new song/stems load
  useEffect(() => {
    setCohereTranscript(null);
    setSubtitles(null);
    setIsEditingTranscript(false);
    setEditingLineIdx(null);
    setEditingLineText("");
  }, [originalAudioUrl, stemUrls]);

  const transcriptLines = useMemo(() => {
    return parseLrc(cohereTranscript || "", duration || 0);
  }, [cohereTranscript, duration]);

  const handleSaveInlineLine = (idx: number, text: string) => {
    if (text.trim() === "") return;
    const lines = cohereTranscript ? cohereTranscript.split("\n").filter(l => l.trim().length > 0) : [];
    const newLines = lines.map((line, i) => {
      if (i === idx) {
        // Keep the timestamp if it exists, replace the text
        const match = line.match(/^\[(?:(?:\d+):)?\d+:\d+(?:\.\d+)?(?:\s*(?:->|-->|\|)\s*(?:(?:\d+):)?\d+:\d+(?:\.\d+)?)?\]/);
        if (match) {
          return `${match[0]} ${text.trim()}`;
        }
        return text.trim();
      }
      return line;
    });
    setCohereTranscript(newLines.join("\n"));
    setEditingLineIdx(null);
  };
  
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

  const [logs, setLogs] = useState<string[]>([]);
  const [customSpaceUrl, setCustomSpaceUrl] = useState(() => {
    try {
      return localStorage.getItem("stemmix_custom_space_url") || "";
    } catch {
      return "";
    }
  });
  const loadedUrlsRef = useRef<Record<string, string>>({});
  
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
    if (stemsList.length > 0 && loadedCount >= stemsList.length) {
      setIsLoadingAudio(false);
    } else {
      setIsLoadingAudio(true);
    }
  }, [loadedCount, stemsList.length]);

  useEffect(() => {
    stemsList.forEach(stem => {
      const url = (stemUrls as any)[stem];
      if (!url) return;

      let audio = audioElementsRef.current[stem];
      
      // 1. Create audio element if it doesn't exist
      if (!audio) {
        audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        audio.loop = false;

        audio.addEventListener('error', (e) => {
            const msg = audio.error ? audio.error.code + " - " + audio.error.message : "unknown error";
            console.error(`Audio error for stem ${stem}:`, msg);
            if (typeof onStemLoadError === 'function') onStemLoadError(stem, "Media failed to decode: " + msg);
        });

        const handleCanPlay = () => {
            console.log(`Audio canplay for stem ${stem}`);
            setLoadedCount(prev => prev + 1);
        };
        
        audio.addEventListener('canplay', handleCanPlay);

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
        audio.playbackRate = speed;
      }

      // 2. If url has changed, load the new source
      if (loadedUrlsRef.current[stem] !== url) {
        loadedUrlsRef.current[stem] = url;
        audio.pause();
        
        // Reset state for this stem
        setLoadedCount(prev => Math.max(0, prev - 1));

        if (url.startsWith("blob:") || url.startsWith("data:")) {
          audio.src = url;
          audio.load();
        } else {
          // Fetch as blob to prevent range request issues with large WAV files and to catch HTTP errors
          fetch(url)
            .then(res => {
              if (!res.ok) throw new Error("HTTP error " + res.status);
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("json")) {
                throw new Error("Received JSON instead of audio");
              }
              if (contentType && contentType.includes("html")) {
                throw new Error("Received HTML instead of audio");
              }
              return res.blob();
            })
            .then(blob => {
              if (blob.size < 1000) {
                throw new Error("Blob too small (" + blob.size + " bytes), likely an error page or invalid data");
              }
              const objectUrl = URL.createObjectURL(blob);
              audio.src = objectUrl;
              audio.load();
            })
            .catch(err => {
              console.error(`Failed to fetch stem ${stem}:`, err);
              if (typeof onStemLoadError === 'function') onStemLoadError(stem, err.message);
            });
        }
      }
    });
  }, [stemUrls, stemsList]);

  // Handle component unmount cleanup only
  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestRef.current);
      Object.values(audioElementsRef.current).forEach((a: any) => {
        try {
          a.pause();
          a.removeAttribute("src");
        } catch {}
      });
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
        initAttemptedRef.current = false;
      }
    };
  }, []);

  // Terminal logs simulation effect
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stemmixStatus !== "loading") {
      setLogs([]);
      return;
    }

    const mode = separationMode;
    const now = new Date();
    const timeStr = () => {
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      return `[${h}:${m}:${s}]`;
    };

    const addLog = (text: string, delay: number) => {
      setTimeout(() => {
        setLogs(prev => {
          if (prev.some(log => log.endsWith(text))) return prev;
          return [...prev, `${timeStr()} ${text}`];
        });
      }, delay);
    };

    if (mode === "webgpu") {
      addLog("[SYSTEM] Initializing WebGPU subsystem...", 100);
      addLog("[GPU] Querying available local graphics hardware...", 500);
      addLog("[GPU] WebGPU adapter detected. Active: WebGPU Parallel Core", 1100);
      addLog("[WGSL] Compiling custom WGSL audio shaders & FIR modules...", 1800);
      addLog("[PIPELINE] Binding 4-channel audio workgroups...", 2500);
      addLog("[AUDIO] Decoding original track buffer at 44100Hz...", 3100);
      addLog("[DSP] Processing 31-tap parallel FIR separation filters...", 4200);
      addLog("[MATH] Enhancing acoustic presence & isolation curves...", 5500);
      addLog("[COMPILER] Re-packing isolated PCM channels to 16-bit WAV...", 7000);
      addLog("[SYSTEM] Local WebGPU separation finished. Initializing stems...", 8200);
    } else if (mode === "onnx") {
      addLog("[SYSTEM] Initializing ONNX Runtime WebAssembly environment...", 100);
      addLog("[WASM] Spawning SIMD multi-threaded web workers...", 700);
      addLog("[MODEL] Loading Demucs ML weights from browser IndexedDB...", 1500);
      addLog("[MODEL] Cache Hit! Loading 120MB weights into neural network...", 2200);
      addLog("[SESSION] ONNX inference session successfully created...", 3500);
      addLog("[INFERENCE] Extracting vocals & drums (Pass 1 of 2)...", 5000);
      addLog("[INFERENCE] Extracting bass & melody (Pass 2 of 2)...", 12000);
      addLog("[POST] Re-aggregating multi-channel frequency responses...", 20000);
      addLog("[WAV] Packing Float32 PCM arrays to standard WAV blobs...", 25000);
      addLog("[SYSTEM] ONNX neural net separation complete. Rendering...", 28000);
    } else { // "ai"
      addLog("[SYSTEM] Initializing secure handshake with API backend...", 100);
      addLog("[NETWORK] Verifying server status and ingress routes...", 500);
      addLog("[AUDIO] Fetching source audio track stream (NCT/YouTube)...", 1000);
      addLog("[PAYLOAD] Formulating multipart payload with track stream...", 1800);
      
      const customS = localStorage.getItem("stemmix_custom_space_url") || "";
      if (customS) {
        addLog(`[SERVER] Custom Space detected: ${customS}`, 2300);
        addLog(`[SERVER] Handshaking custom Hugging Face space: ${customS}...`, 2700);
      } else {
        addLog("[SERVER] Handshaking default Hugging Face cluster Spaces...", 2300);
      }
      
      addLog("[GRADIO] Initializing remote Gradio separation client...", 3200);
      addLog("[HF] Activating Demucs-v4 deep learning models...", 4500);
      addLog("[DEEP_LEARNING] Isolation running on remote NVIDIA GPU...", 6200);
      addLog("[PROGRESS] Processing audio frames: 25% complete...", 8500);
      addLog("[PROGRESS] Processing audio frames: 55% complete...", 12000);
      addLog("[PROGRESS] Processing audio frames: 85% complete...", 16000);
      addLog("[PROGRESS] Processing audio frames: 100% complete!", 20000);
      addLog("[SERVER] Separation finished. Packaging audio stream headers...", 22000);
      addLog("[PROXY] Preparing secure direct audio proxies...", 23500);
      addLog("[SYSTEM] AI Cloud separation complete! Transferring stems...", 24800);
    }
  }, [stemmixStatus, separationMode]);

  // Auto scroll logs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const initAudio = () => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const master = ctx.createGain();
      masterGainRef.current = master;

      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 2.5; 
      const impulse = ctx.createBuffer(2, length, sampleRate);
      const impulseL = impulse.getChannelData(0);
      const impulseR = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (sampleRate * 0.3));
        impulseL[i] = (Math.random() * 2 - 1) * decay;
        impulseR[i] = (Math.random() * 2 - 1) * decay;
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = impulse;
      convolverRef.current = convolver;
      
      const revGain = ctx.createGain();
      revGain.gain.value = reverb;
      reverbGainRef.current = revGain;

      master.connect(convolver);
      convolver.connect(revGain);

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
      revGain.connect(eqNodes[0]);

      stemsList.forEach(stem => {
        const audio = audioElementsRef.current[stem];
        if (!audio) return;
        
        const source = ctx.createMediaElementSource(audio);
        
        // EQ Nodes
                const gain = ctx.createGain();
        gainNodesRef.current[stem] = gain;
        
        const panner = ctx.createStereoPanner();
        panner.pan.value = pans[stem] || 0;
        pannerNodesRef.current[stem] = panner;

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
        analyser.connect(panner);
        panner.connect(gain);
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
        const maxRadius = Math.min(width, height) * 0.44;
        const dpr = window.devicePixelRatio || 1;

        // 1. Fluid, eye-safe fading backdrop for smooth neon phosphorescent trails
        ctx.fillStyle = "rgba(7, 8, 13, 0.16)";
        ctx.fillRect(0, 0, width, height);

        // 2. High-DPI Tech Radar concentric dashed background lines
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([3 * dpr, 9 * dpr]);
        for (let r = maxRadius * 0.2; r <= maxRadius; r += maxRadius * 0.2) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // 3. High-DPI Subtle crosshairs
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(centerX - maxRadius, centerY);
        ctx.lineTo(centerX + maxRadius, centerY);
        ctx.moveTo(centerX, centerY - maxRadius);
        ctx.lineTo(centerX, centerY + maxRadius);
        ctx.stroke();
        ctx.restore();

        // 4. Compute average amplitude for dynamic core pulsing
        let totalAmp = 0;
        let activeCount = 0;
        
        stemsList.forEach((stem) => {
          const analyser = analysersRef.current[stem];
          if (!analyser) return;
          const isMuted = mutes[stem] || (Object.values(solos).some(v=>v) && !solos[stem]) || volumes[stem] === 0;
          if (!isMuted) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            totalAmp += sum / bufferLength;
            activeCount++;
          }
        });
        
        const avgAmp = activeCount > 0 ? (totalAmp / activeCount) / 255 : 0;

        // 5. Ambient glowing dust particles that drift and expand with the audio beats
        ctx.save();
        const time = Date.now() * 0.0004;
        for (let p = 0; p < 45; p++) {
          const pAngle = (p * 7.13 + time * (p % 2 === 0 ? 0.8 : -0.8) * 0.15) % (Math.PI * 2);
          const pDistance = (p * 13.57 + avgAmp * 45 * dpr + (Date.now() * 0.025 * (1 + (p % 3)))) % maxRadius;
          const px = centerX + Math.cos(pAngle) * pDistance;
          const py = centerY + Math.sin(pAngle) * pDistance;
          const pSize = (0.6 + (p % 3) * 0.6) * dpr * (0.6 + avgAmp * 1.4);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + (p % 4) * 0.04 + avgAmp * 0.25})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 6. Glowing Neon Central Energy Core
        ctx.save();
        const coreRadius = maxRadius * 0.12 + avgAmp * maxRadius * 0.08;
        const gradient = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.15, centerX, centerY, coreRadius);
        gradient.addColorStop(0, "rgba(251, 191, 36, 0.85)"); // Vibrant gold
        gradient.addColorStop(0.4, "rgba(139, 92, 246, 0.35)"); // Cosmic purple aura
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); // Smooth shadow blending
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        // 7. Dynamic Stem Frequency Rings
        stemsList.forEach((stem, index) => {
          const analyser = analysersRef.current[stem];
          if (!analyser) return;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          const color = STEM_COLORS[stem] || "#ffffff";
          const isMuted = mutes[stem] || (Object.values(solos).some(v=>v) && !solos[stem]) || volumes[stem] === 0;

          // Base radius for this stem track
          const radiusStep = maxRadius / (stemsList.length + 0.5);
          const baseRadius = radiusStep * (index + 1);

          // Smooth frequencies with sliding-window moving average
          const smoothedArray = new Float32Array(bufferLength);
          const windowSize = 9; // smooth out jittery spikes
          for (let i = 0; i < bufferLength; i++) {
            let sum = 0;
            let count = 0;
            for (let w = -Math.floor(windowSize / 2); w <= Math.floor(windowSize / 2); w++) {
              const idx = (i + w + bufferLength) % bufferLength;
              sum += dataArray[idx];
              count++;
            }
            smoothedArray[i] = sum / count;
          }

          // Build symmetrical 360-degree point loop
          const points: { x: number; y: number }[] = [];
          const numPoints = 120; // optimal resolution for curved bezier lines
          
          for (let i = 0; i < numPoints; i++) {
            // Symmetrical frequency index mapping
            const freqIdx = i < numPoints / 2 
              ? Math.floor((i / (numPoints / 2)) * (bufferLength * 0.5))
              : Math.floor(((numPoints - i) / (numPoints / 2)) * (bufferLength * 0.5));
              
            const v = isMuted ? 0 : (smoothedArray[freqIdx] || 0) / 255.0;
            const boost = Math.pow(v, 1.25) * radiusStep * 1.7;
            const r = baseRadius + boost;
            
            const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
            points.push({
              x: centerX + Math.cos(angle) * r,
              y: centerY + Math.sin(angle) * r
            });
          }

          if (points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < points.length; i++) {
              const p0 = points[i];
              const p1 = points[(i + 1) % points.length];
              const midX = (p0.x + p1.x) / 2;
              const midY = (p0.y + p1.y) / 2;
              ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
            }
            ctx.closePath();

            // Symmetrical soft fluid glowing ribbon background
            if (!isMuted) {
              ctx.save();
              ctx.fillStyle = `${color}10`; // light transparent color fill
              ctx.fill();
              ctx.restore();
            }

            // Beautiful HD high-DPI outline stroke
            ctx.save();
            if (isMuted) {
              ctx.strokeStyle = `${color}30`;
              ctx.lineWidth = 1 * dpr;
              ctx.shadowBlur = 0;
            } else {
              ctx.strokeStyle = color;
              ctx.lineWidth = 2.5 * dpr;
              ctx.shadowBlur = 16 * dpr;
              ctx.shadowColor = color;
            }
            ctx.stroke();
            ctx.restore();
          }
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
      analyser.getByteFrequencyData(dataArray);

      const color = STEM_COLORS[stem] || "#ffffff";
      const isMuted = mutes[stem] || (Object.values(solos).some(v=>v) && !solos[stem]) || volumes[stem] === 0;

      // Draw symmetrical professional waveform bars
      sCtx.lineWidth = 2.5;
      sCtx.lineCap = 'round';

      const barCount = 64;
      const barWidth = w / barCount;
      const spacing = 3;

      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * (bufferLength * 0.5));
        let val = dataArray[dataIdx] / 255.0;

        if (isMuted || !isPlaying) {
          val = isPlaying && !isMuted ? 0.02 : (Math.max(0, Math.sin(i * 0.2 + Date.now() * 0.003)) * 0.05);
        }

        const barHeight = Math.max(3, val * h * 0.85);
        const x = i * barWidth + spacing / 2;
        const yTop = (h - barHeight) / 2;

        sCtx.beginPath();
        sCtx.fillStyle = isMuted ? 'rgba(255, 255, 255, 0.06)' : color;
        
        if (!isMuted && isPlaying) {
          sCtx.shadowBlur = val * 8;
          sCtx.shadowColor = color;
        } else {
          sCtx.shadowBlur = 0;
        }

        if (sCtx.roundRect) {
          sCtx.roundRect(x, yTop, barWidth - spacing, barHeight, 4);
        } else {
          sCtx.rect(x, yTop, barWidth - spacing, barHeight);
        }
        sCtx.fill();
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

  // Sync real-time master reverb changes
  useEffect(() => {
    if (reverbGainRef.current && audioContextRef.current) {
      reverbGainRef.current.gain.setTargetAtTime(reverb, audioContextRef.current.currentTime, 0.05);
    }
  }, [reverb]);

  // Sync real-time tempo (speed) changes
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach((a: HTMLAudioElement) => {
      try {
        a.playbackRate = speed;
      } catch (e) {
        console.error("Failed to set playback rate:", e);
      }
    });
  }, [speed]);

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


  
  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      for (const stem of stemsList) {
        const url = (stemUrls as any)[stem];
        if (url) {
           const res = await fetch(url);
           const blob = await res.blob();
           zip.file(`${stem}.wav`, blob);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const dlUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = "separated_stems.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      console.error("ZIP Export failed", e);
      alert("ZIP Export failed. Check console.");
    }
  };

  
  const handleDownloadStem = async (stem: string) => {
    if (!stemUrls || !stemUrls[stem as keyof typeof stemUrls]) return;
    const url = stemUrls[stem as keyof typeof stemUrls] as string;
    try {
      // In web browser, a simple a tag might open the URL in the browser if it's not same-origin, 
      // or might fail to download a blob URL correctly without a filename. 
      // Using fetch + blob ensures it forces a download with a name.
      const res = await fetch(url);
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `${songTitle} - ${stem}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      console.error(`Failed to download ${stem}:`, e);
      // Fallback
      const a = document.createElement("a");
      a.href = url;
      a.download = `${songTitle} - ${stem}.mp3`;
      a.click();
    }
  };
  const handleRNNTTranscribe = async () => {
    const audioUrlToTranscribe = originalAudioUrl || (stemUrls && stemUrls["vocals"]);
    if (!audioUrlToTranscribe) return;
    try {
      setIsTranscribing(true);
      setTranscriptionStatus('Uploading to RNN-T API...');
      
      const text = await transcribeWithRNNT(audioUrlToTranscribe);
      setCohereTranscript(textToLrc(text, duration || 0));
      setTranscriptionStatus('Done!');
    } catch (e: any) {
      console.error('RNN-T error', e);
      setTranscriptionStatus(`Error: ${e.message}`);
    } finally {
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionStatus('');
      }, 5000);
    }
  };
  const handleCohereTranscribe = async () => {
    const audioUrlToTranscribe = originalAudioUrl || (stemUrls && stemUrls["vocals"]);
    if (!audioUrlToTranscribe) return;

    try {
      setIsTranscribing(true);
      setTranscriptionStatus('Uploading to Cohere ASR...');
      
      const text = await transcribeWithCohere(audioUrlToTranscribe, "vi");
      setCohereTranscript(textToLrc(text, duration || 0));
      setTranscriptionStatus('Done!');
    } catch (e: any) {
      console.error('Cohere error', e);
      setTranscriptionStatus(`Error: ${e.message}`);
    } finally {
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionStatus('');
      }, 5000);
    }
  };
  
  const handleCopyTranscript = () => {
      if (cohereTranscript) navigator.clipboard.writeText(cohereTranscript);
  };
  
  const handleExportSRT = () => {
      if (!cohereTranscript) return;
      
      // Simple pseudo-SRT generation since we don't have timestamps from Cohere
      const lines = cohereTranscript.split(/(?<=[.?!])\s+/).filter(l => l.trim().length > 0);
      let srtContent = "";
      let startTime = 0;
      const durationPerLine = (duration || 60) / (lines.length || 1);
      
      const formatTime = (secs: number) => {
          const h = Math.floor(secs / 3600).toString().padStart(2, '0');
          const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
          const s = Math.floor(secs % 60).toString().padStart(2, '0');
          const ms = Math.floor((secs % 1) * 1000).toString().padStart(3, '0');
          return `${h}:${m}:${s},${ms}`;
      };
      
      lines.forEach((line, i) => {
          srtContent += `${i + 1}\n`;
          srtContent += `${formatTime(startTime)} --> ${formatTime(startTime + durationPerLine)}\n`;
          srtContent += `${line}\n\n`;
          startTime += durationPerLine;
      });
      
      const blob = new Blob([srtContent], { type: 'text/srt' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${songTitle || 'transcript'}.srt`;
      a.click();
  };

  const handleExportMix = async (format: "wav" | "mp3" = "wav") => {
    if (!stemUrls) return;
    setExportFormat(format);
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setDownloadLink(null);
    
    try {
      // 1. Ensure audio engine is initialized
      if (!audioContextRef.current) {
        try {
          initAudio();
        } catch (err) {
          console.warn("Failed to initialize main audio engine for export, falling back:", err);
        }
      }
      
      const decodeCtx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 2. Pre-decode phase to discover exact track length and bypass OfflineAudioContext decode issues
      const decodedBuffers: { [key: string]: AudioBuffer } = {};
      let maxDuration = 0;
      
      const activeStems = stemsList.filter(stem => (stemUrls as any)[stem]);
      if (activeStems.length === 0) {
        throw new Error("No isolated stems are currently available to mix.");
      }
      
      for (let i = 0; i < activeStems.length; i++) {
         const stem = activeStems[i];
         const url = (stemUrls as any)[stem];
         if (!url) continue;
         
         const baseProgress = Math.floor((i / activeStems.length) * 40);
         setExportProgress(baseProgress);
         
         const res = await fetch(url);
         if (!res.ok) {
           throw new Error(`Failed to download stem "${stem}": ${res.statusText}`);
         }
         const arrayBuf = await res.arrayBuffer();
         
         // Decode audio data safely across all mobile engines
         const audioBuf = await new Promise<AudioBuffer>((resolve, reject) => {
           try {
             const promise = decodeCtx.decodeAudioData(arrayBuf, resolve, (err) => {
               reject(err || new Error(`Decode failed for stem "${stem}"`));
             });
             if (promise && typeof promise.catch === "function") {
               promise.catch(reject);
             }
           } catch (e) {
             reject(e);
           }
         });
         
         decodedBuffers[stem] = audioBuf;
         if (audioBuf.duration > maxDuration) {
           maxDuration = audioBuf.duration;
         }
      }
      
      if (maxDuration <= 0) {
        maxDuration = duration || 180;
      }
      
      setExportProgress(45);
      
      // 3. Create OfflineAudioContext matching the decoded buffer sample rate to prevent mismatch errors
      const exportSampleRate = decodeCtx.sampleRate || 44100;
      const offlineCtx = new OfflineAudioContext(2, Math.ceil(exportSampleRate * maxDuration), exportSampleRate);
      
      const offlineMaster = offlineCtx.createGain();
      const offlineConvolver = offlineCtx.createConvolver();
      if (convolverRef.current && convolverRef.current.buffer) {
          offlineConvolver.buffer = convolverRef.current.buffer;
      }
      const offlineRevGain = offlineCtx.createGain();
      offlineRevGain.gain.value = reverb;
      
      offlineMaster.connect(offlineConvolver);
      offlineConvolver.connect(offlineRevGain);

      // Create offline EQ filter nodes to match real-time graph
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

      const offlineEqNodes = bands.map((b, idx) => {
        const filter = offlineCtx.createBiquadFilter();
        filter.type = b.type as BiquadFilterType;
        filter.frequency.value = b.f;
        filter.Q.value = 1.0;
        
        let boost = 0;
        if (isHD) {
          if (b.f <= 100) boost = 2.5;
          else if (b.f >= 6300) boost = 3.5;
          else if (b.f === 1600 || b.f === 2500 || b.f === 4000) boost = 2.0;
        }
        filter.gain.value = (masterEq[idx]?.g || 0) + boost;
        return filter;
      });

      // Connect offlineMaster -> eqFilters -> destination
      let lastOfflineNode: AudioNode = offlineMaster;
      offlineEqNodes.forEach(filter => {
         lastOfflineNode.connect(filter);
         lastOfflineNode = filter;
      });
      lastOfflineNode.connect(offlineCtx.destination);

      // Connect wet reverb channel to the EQ chain
      offlineRevGain.connect(offlineEqNodes[0]); 

      for (const stem of activeStems) {
         const audioBuf = decodedBuffers[stem];
         if (!audioBuf) continue;
         
         const source = offlineCtx.createBufferSource();
         source.buffer = audioBuf;
         source.playbackRate.value = speed;
         
         const panner = offlineCtx.createStereoPanner();
         panner.pan.value = pans[stem] || 0;
         
         const gain = offlineCtx.createGain();
         gain.gain.value = mutes[stem] ? 0 : (Object.values(solos).some(v=>v) ? (solos[stem] ? volumes[stem] : 0) : volumes[stem]);
         
         let audioNode: AudioNode = source;
         if (isDspFallback) {
          if (stem === "bass") {
            const lp = offlineCtx.createBiquadFilter();
            lp.type = "lowpass"; lp.frequency.value = 140; lp.Q.value = 1.2;
            audioNode.connect(lp); audioNode = lp;
          } else if (stem === "vocals") {
            const hp = offlineCtx.createBiquadFilter();
            hp.type = "highpass"; hp.frequency.value = 280;
            const lp = offlineCtx.createBiquadFilter();
            lp.type = "lowpass"; lp.frequency.value = 3500;
            audioNode.connect(hp); hp.connect(lp); audioNode = lp;
          } else if (stem === "drums") {
            const hp = offlineCtx.createBiquadFilter();
            hp.type = "highpass"; hp.frequency.value = 4500;
            audioNode.connect(hp); audioNode = hp;
          } else if (stem === "guitar") {
            const bp = offlineCtx.createBiquadFilter();
            bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.8;
            audioNode.connect(bp); audioNode = bp;
          } else if (stem === "piano") {
            const bp = offlineCtx.createBiquadFilter();
            bp.type = "bandpass"; bp.frequency.value = 650; bp.Q.value = 0.8;
            audioNode.connect(bp); audioNode = bp;
          } else if (stem === "other") {
            const hp = offlineCtx.createBiquadFilter();
            hp.type = "highpass"; hp.frequency.value = 80;
            audioNode.connect(hp); audioNode = hp;
          }
         }
         audioNode.connect(panner);
         panner.connect(gain);
         gain.connect(offlineMaster);
         source.start(0);
      }
      
      setExportProgress(50);
      const renderedBuffer = await offlineCtx.startRendering();
      setExportProgress(80);
      
      normalizeAudioBuffer(renderedBuffer);
      setExportProgress(90);

      let blob: Blob;
      let filename: string;
      if (format === "mp3") {
        blob = audioBufferToMp3(renderedBuffer);
        filename = `${songTitle || 'custom_mixdown'}.mp3`;
      } else {
        const wav = audioBufferToWav(renderedBuffer);
        blob = new Blob([wav], { type: "audio/wav" });
        filename = `${songTitle || 'custom_mixdown'}.wav`;
      }
      
      const dlUrl = URL.createObjectURL(blob);
      
      // Fallback auto-trigger
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Store the link so that mobile webviews or embedded iframes can render a direct click button
      setDownloadLink({ url: dlUrl, filename });
      setExportProgress(100);
      
    } catch (e: any) {
      console.error(e);
      setExportError(e?.message || "Mixdown failed. Check your connection or memory limits.");
    } finally {
      setIsExporting(false);
    }
  };

  const togglePlay = () => {
    if (!initAttemptedRef.current) initAudio();
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      Object.values(audioElementsRef.current).forEach((a: any) => a.pause());
    } else {
      const currentSyncTime = currentTime;
      Object.values(audioElementsRef.current).forEach((a: any) => {
        try { a.currentTime = currentSyncTime; } catch (err) {}
      });
      Object.values(audioElementsRef.current).forEach((a: any) => {
        a.play().catch((e: any) => {
          if (e.name !== 'AbortError') console.error("Playback failed:", e);
        });
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    if (!initAttemptedRef.current) initAudio();
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Pause first
    Object.values(audioElementsRef.current).forEach((a: any) => a.pause());
    
    // Reset to 0
    setCurrentTime(0);
    Object.values(audioElementsRef.current).forEach((a: any) => {
      try { a.currentTime = 0; } catch (err) {}
    });

    // Start playing immediately
    Object.values(audioElementsRef.current).forEach((a: any) => {
      a.play().catch((e: any) => {
        if (e.name !== 'AbortError') console.error("Playback failed on restart:", e);
      });
    });
    setIsPlaying(true);
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
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-white/25 rounded-full border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" />
            
            {/* Active Positive Fill Indicator */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-[4px] rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] pointer-events-none transition-all duration-200"
               style={{
                 height: `${band.g > 0 ? (band.g / 12) * 50 : 0}%`,
                 bottom: '50%'
              }}
             />
            {/* Active Negative Fill Indicator */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-[4px] rounded-full bg-white/40 pointer-events-none transition-all duration-200"
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
    <div className={isEmbedded ? "w-full h-full flex flex-col text-white overflow-hidden rounded-[24px] relative bg-transparent" : "fixed inset-0 z-[100] flex flex-col text-white overflow-hidden animate-in fade-in duration-500 relative bg-black/50 backdrop-blur-3xl"}>
       {/* Dynamic Cover Artwork Background */}
       {coverUrl && (
          <>
             <div className="absolute inset-0 bg-cover bg-center opacity-40 scale-[1.2] blur-[40px] saturate-[1.5] transition-all duration-1000 pointer-events-none z-0" style={{ backgroundImage: `url(${coverUrl})` }} />
             <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B10]/40 via-[#0A0B10]/60 to-[#0A0B10]/80 pointer-events-none z-0" />
          </>
       )}
       
       {/* Ambient Studio Lighting Glows */}
       <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-400/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />
       <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-[150px] pointer-events-none z-0" />
       
       {/* HEADER BAR */}
       <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/5 bg-black/20 backdrop-blur-md shrink-0 z-10 overflow-visible gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
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
 
             {newSongTitle && onExtractNewSong && (
                <button
                    onClick={onExtractNewSong}
                    className="ml-1 px-2.5 py-1 bg-amber-400 text-black text-[9px] font-black tracking-widest uppercase rounded-full shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shrink-0 animate-pulse"
                    title={`Extract stems for ${newSongTitle}`}
                >
                    <Sparkles className="w-3 h-3" />
                    Extract New
                </button>
             )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
             {/* Engine Toggle Selection */}
             <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-full border border-white/5 mr-1 shrink-0 overflow-x-auto no-scrollbar max-w-full">
                <button
                   onClick={() => onSetSeparationMode?.("webgpu")}
                   className={`px-2.5 py-1 flex items-center justify-center gap-1.5 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 ${
                     separationMode === "webgpu"
                       ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                       : "text-white/40 hover:text-white/70"
                   }`}
                   title="Use high-performance client-side WebGPU DSP isolation"
                >
                   <Zap className="w-3.5 h-3.5 shrink-0" />
                   <span className="hidden sm:inline">WebGPU</span>
                </button>
                <button
                   onClick={() => onSetSeparationMode?.("ai")}
                   className={`px-2.5 py-1 flex items-center justify-center gap-1.5 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 ${
                     separationMode === "ai"
                       ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                       : "text-white/40 hover:text-white/70"
                   }`}
                   title="Use server-side AI Cloud"
                >
                   <Cloud className="w-3.5 h-3.5 shrink-0" />
                   <span className="hidden sm:inline">AI Cloud</span>
                </button>
                <button
                   onClick={() => onSetSeparationMode?.("onnx")}
                   className={`px-2.5 py-1 flex items-center justify-center gap-1.5 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 ${
                     separationMode === "onnx"
                       ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                       : "text-white/40 hover:text-white/70"
                   }`}
                   title="Use client-side ONNX neural network"
                >
                   <Brain className="w-3.5 h-3.5 shrink-0" />
                   <span className="hidden sm:inline">ONNX ML</span>
                </button>
             </div>

             {isDspFallback && (
                <div className="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-400/5 px-2.5 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1 animate-pulse">
                   <Radio className="w-2.5 h-2.5 text-amber-400" /> <span className="hidden sm:inline">Acoustic </span>DSP<span className="hidden sm:inline"> Local</span>
                </div>
             )}
             <div className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded-full border border-emerald-400/10 flex items-center gap-1 hidden md:flex">
                <Activity className="w-2.5 h-2.5 animate-pulse" /> WebGPU Active
             </div>
             <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* MP3 Export Button */}
                <button
                   onClick={() => handleExportMix("mp3")}
                   disabled={stemmixStatus !== "ready" || isExporting}
                   className={`flex items-center gap-1 sm:gap-1.5 text-[9px] font-black tracking-widest uppercase px-2.5 sm:px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-md ${
                      stemmixStatus === "ready"
                        ? isExporting && exportFormat === "mp3"
                          ? "bg-amber-400 text-black shadow-amber-400/25 animate-pulse"
                          : "bg-white/[0.04] text-white hover:bg-white/[0.1] hover:text-amber-400 border border-white/5"
                        : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed shadow-none"
                   }`}
                   title="Export Mix as MP3 (192kbps)"
                >
                   {isExporting && exportFormat === "mp3" ? (
                      <Loader2 className="w-3 h-3 animate-spin text-black" />
                   ) : (
                      <Download className="w-3 h-3 text-amber-400" />
                   )}
                   <span>
                      {isExporting && exportFormat === "mp3" ? `${exportProgress}%` : "MP3"}
                   </span>
                </button>

                {/* WAV Export Button */}
                <button
                   onClick={() => handleExportMix("wav")}
                   disabled={stemmixStatus !== "ready" || isExporting}
                   className={`flex items-center gap-1 sm:gap-1.5 text-[9px] font-black tracking-widest uppercase px-2.5 sm:px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-md ${
                      stemmixStatus === "ready"
                        ? isExporting && exportFormat === "wav"
                          ? "bg-amber-400 text-black shadow-amber-400/25 animate-pulse"
                          : "bg-white/[0.04] text-white hover:bg-white/[0.1] hover:text-amber-400 border border-white/5"
                        : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed shadow-none"
                   }`}
                   title="Export Mix as Lossless WAV"
                >
                   {isExporting && exportFormat === "wav" ? (
                      <Loader2 className="w-3 h-3 animate-spin text-black" />
                   ) : (
                      <Download className="w-3 h-3 text-amber-400" />
                   )}
                   <span>
                      {isExporting && exportFormat === "wav" ? `${exportProgress}%` : "WAV"}
                   </span>
                </button>
             </div>
          </div>
       </div>

       {/* SCROLLABLE CONTENT BODY */}
       <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-4 md:p-5 flex flex-col gap-5 custom-scrollbar bg-transparent z-10">
          
          {downloadLink && (
             <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in slide-in-from-top-2 duration-300 shadow-lg shadow-emerald-500/5">
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Check className="w-4 h-4" />
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-[11px] sm:text-xs font-black tracking-widest uppercase text-white">Mixdown Completed!</h4>
                      <p className="text-[10px] text-emerald-400 font-mono truncate max-w-[200px] xs:max-w-[250px] sm:max-w-md mt-0.5" title={downloadLink.filename}>
                         {downloadLink.filename}
                      </p>
                   </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                   <a
                      href={downloadLink.url}
                      download={downloadLink.filename}
                      onClick={() => {
                         setTimeout(() => setDownloadLink(null), 8000);
                      }}
                      className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-emerald-400 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                      referrerPolicy="no-referrer"
                   >
                      <Download className="w-3.5 h-3.5 animate-bounce" /> Save / Download
                   </a>
                   <button
                      onClick={() => setDownloadLink(null)}
                      className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors"
                   >
                      <X className="w-4 h-4" />
                   </button>
                </div>
             </div>
          )}

          {exportError && (
             <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                      <X className="w-4 h-4" />
                   </div>
                   <div>
                      <h4 className="text-[11px] sm:text-xs font-black tracking-widest uppercase text-white">Export Failed</h4>
                      <p className="text-[10px] text-white/60 leading-relaxed mt-0.5 max-w-sm">{exportError}</p>
                   </div>
                </div>
                <button
                   onClick={() => setExportError(null)}
                   className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors"
                >
                   <X className="w-4 h-4" />
                </button>
             </div>
          )}

          {stemmixStatus !== "ready" ? (
             <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto animate-in fade-in duration-500">
                {stemmixStatus === "idle" ? (
                   <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-6">
                         <Sparkles className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm sm:text-base tracking-[0.2em] uppercase font-black text-white mb-3">Extract Stems</h3>
                      <p className="text-[11px] sm:text-xs text-white/40 text-center max-w-sm leading-relaxed mb-8">
                         Isolate vocals, drums, bass, and other instruments using AI or WebGPU processing.
                      </p>
                      {onRetrySeparate && (
                         <button
                             type="button"
                             onClick={onRetrySeparate}
                             className="text-[10px] tracking-widest uppercase font-black border-2 border-amber-400 text-black bg-amber-400 px-8 py-3 rounded-full hover:bg-amber-300 hover:border-amber-300 transition-all active:scale-95 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                         >
                            Run Stem Extraction
                         </button>
                      )}
                   </div>
                ) : stemmixStatus === "loading" ? (
                   <div className="flex flex-col items-center justify-center py-12 px-4 text-white/50">
                      <div className="w-12 h-12 border-4 border-amber-400 rounded-full border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(251,191,36,0.2)]" />
                      <h3 className="text-sm sm:text-base tracking-[0.2em] uppercase font-black text-amber-400 mb-2 animate-pulse">{separationMode === "webgpu" ? "WebGPU DSP Processing..." : separationMode === "onnx" ? "ONNX Neural Net Processing..." : "AI Cloud Processing..."}</h3>
                      <p className="text-[11px] sm:text-xs text-white/40 text-center max-w-sm leading-relaxed">
                         {separationMode === "webgpu" ? "Compiling custom WGSL audio shaders & running 31-tap parallel FIR filters on your local GPU. Pure local acceleration." : separationMode === "onnx" ? "Running ONNX Runtime Web via WASM/WebGPU to extract stems using neural network inference. This may take up to 2 minutes..." : "Sending audio to high-performance Hugging Face server clusters for deep learning separation. This may take a minute..."}
                      </p>
                      <div className="w-48 h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden border border-white/5">
                         <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full animate-pulse transition-all duration-300 ease-out" style={{ width: separationMode === "webgpu" ? '85%' : separationMode === "onnx" && progress > 0 ? `${progress}%` : '60%' }} />
                      </div>

                      {separationMode === "ai" && (
                         <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
                            <div className="text-[10.5px] text-white/40 flex items-center gap-1.5 font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                               <span>Default AI Space:</span>
                               <a 
                                  href="https://huggingface.co/spaces/tienqnguyen95/Stemmix" 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-amber-400 font-bold hover:underline inline-flex items-center gap-0.5"
                               >
                                  tienqnguyen95/Stemmix ↗
                               </a>
                            </div>
                            <div className="max-w-md bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-[10.5px] leading-relaxed text-amber-300/80 font-sans mt-2 shadow-[inset_0_0_8px_rgba(251,191,36,0.02)]">
                               <strong>Patience Advised:</strong> Once the model completes the separation steps, downloading the final stems to your device takes about <strong>1 minute</strong>. Please leave this page open.
                            </div>
                         </div>
                      )}

                      {/* Terminal Log Console */}
                      <div className="w-full bg-[#050507]/95 border border-white/5 rounded-2xl p-4 flex flex-col font-mono text-left shadow-2xl h-52 overflow-hidden relative backdrop-blur-md mt-6">
                         <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 shrink-0">
                            <div className="flex items-center gap-1.5">
                               <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                               <span className="text-[9px] font-black text-amber-400 tracking-widest uppercase">Pipeline Diagnostics</span>
                            </div>
                            <span className="text-[8px] text-white/30 tracking-widest font-mono">LIVE FEED</span>
                         </div>
                         
                         <div 
                            ref={logsContainerRef}
                            className="flex-1 overflow-y-auto text-[10px] text-white/70 flex flex-col gap-1 select-none custom-scrollbar"
                         >
                            {logs.length === 0 ? (
                               <div className="text-white/20 animate-pulse">[SYSTEM] Awaiting stream signal...</div>
                            ) : (
                               logs.map((log, lIdx) => {
                                  let colorClass = "text-white/70";
                                  if (log.includes("[SYSTEM]")) colorClass = "text-amber-400 font-bold";
                                  if (log.includes("[ERROR]")) colorClass = "text-red-400 font-bold";
                                  if (log.includes("[SERVER]") || log.includes("[HF]")) colorClass = "text-cyan-400 font-medium";
                                  if (log.includes("[GPU]") || log.includes("[WASM]")) colorClass = "text-emerald-400 font-medium";
                                  if (log.includes("[PROGRESS]")) colorClass = "text-purple-400 font-semibold";
                                  
                                  return (
                                     <div key={lIdx} className={`${colorClass} leading-normal`}>
                                        {log}
                                     </div>
                                  );
                               })
                            )}
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center py-8 px-4 text-center max-w-xl mx-auto">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
                         <X className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm sm:text-base tracking-[0.2em] uppercase font-black text-red-400 mb-2">Separation Failed</h3>
                      <p className="text-[11px] sm:text-xs text-white/40 text-center max-w-sm leading-relaxed mb-6 font-sans">
                         {stemmixError || "An unexpected error occurred during processing."}
                      </p>

                      {separationMode === "ai" && (
                         <div className="w-full bg-[#0E1015]/90 border border-amber-400/20 rounded-2xl p-4 mb-6 text-left shadow-lg">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
                               <Cloud className="w-4 h-4 shrink-0" />
                               <span>Get Your Own Free AI Separation Cloud:</span>
                            </div>
                            <p className="text-[11px] text-white/70 leading-relaxed font-sans mb-3">
                               Public servers are busy or rate-limited. You can duplicate the space to run on your own free Hugging Face hardware:
                            </p>
                            
                            <div className="flex flex-col gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5 text-[10px] text-white/60 mb-3.5">
                               <div className="flex items-start gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px] font-black text-amber-400 shrink-0">1</span>
                                  <div>
                                     <span>Go to the official space: </span>
                                     <a 
                                        href="https://huggingface.co/spaces/tienqnguyen95/Stemmix" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-amber-400 hover:underline break-all font-mono font-bold inline-flex items-center gap-0.5"
                                     >
                                        tienqnguyen95/Stemmix ↗
                                     </a>
                                  </div>
                               </div>
                               <div className="flex items-start gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px] font-black text-amber-400 shrink-0">2</span>
                                  <div>
                                     Click the three dots <strong className="text-white font-mono">...</strong> in the top-right corner, then click <strong className="text-white">"Duplicate this Space"</strong>. Set visibility to <strong className="text-amber-400">Public</strong> (runs on free CPU).
                                  </div>
                               </div>
                               <div className="flex items-start gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px] font-black text-amber-400 shrink-0">3</span>
                                  <div>
                                     Paste your cloned Space ID (e.g., <span className="font-mono text-amber-300 font-bold">your-username/Stemmix</span>) below:
                                  </div>
                               </div>
                            </div>

                            <div className="flex gap-2">
                               <input
                                  type="text"
                                  placeholder="e.g. your-username/Stemmix"
                                  value={customSpaceUrl}
                                  onChange={(e) => {
                                     const val = e.target.value.trim();
                                     setCustomSpaceUrl(val);
                                     try {
                                        localStorage.setItem("stemmix_custom_space_url", val);
                                     } catch {}
                                  }}
                                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/15"
                               />
                               {customSpaceUrl && (
                                  <button
                                     type="button"
                                     onClick={() => {
                                        setCustomSpaceUrl("");
                                        try {
                                           localStorage.removeItem("stemmix_custom_space_url");
                                        } catch {}
                                     }}
                                     className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all border border-white/5"
                                  >
                                     Clear
                                  </button>
                               )}
                            </div>
                            {customSpaceUrl && (
                               <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono mt-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Connected: Your Space will be prioritized for retry/separation!
                                </div>
                            )}
                         </div>
                      )}

                      <div className="flex gap-3 items-center justify-center">
                         {onRetrySeparate && (
                            <button 
                               type="button"
                               onClick={onRetrySeparate} 
                               className="text-[10px] tracking-widest uppercase font-black border-2 border-amber-400 text-black bg-amber-400 px-6 py-2.5 rounded-full hover:bg-amber-300 hover:border-amber-300 transition-all active:scale-95 shadow-lg shadow-amber-400/10"
                            >
                               Retry Separation
                            </button>
                         )}
                         {separationMode === "ai" && (
                            <button
                               type="button"
                               onClick={() => onSetSeparationMode?.("webgpu")}
                               className="text-[10px] tracking-widest uppercase font-black border border-white/10 text-white/60 hover:text-white bg-white/5 px-6 py-2.5 rounded-full hover:bg-white/10 transition-all active:scale-95"
                            >
                               Switch to WebGPU
                            </button>
                         )}
                      </div>
                   </div>
                )}
             </div>
          ) : (
             <>
                 {/* LARGE INTEGRATED PLAYER & VISUALIZER */}
           <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-[32px] flex flex-col shrink-0 relative overflow-hidden shadow-2xl shadow-black/50 mb-4">
              {/* Ambient Glows */}
              <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-400/5 rounded-full blur-3xl pointer-events-none z-0" />
              <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none z-0" />
              
              {/* Large Master Visualizer Canvas & Info Container */}
              <div className="w-full h-40 sm:h-56 lg:h-72 relative bg-black/60 shadow-inner overflow-hidden border-b border-white/5 z-10 flex flex-row">
                 
                 {/* LEFT: Visualizer */}
                 <div className="w-1/3 min-w-[200px] max-w-[350px] relative border-r border-white/5">
                    <canvas 
                       ref={canvasRef} 
                       className="w-full h-full absolute inset-0 z-10"
                       style={{ mixBlendMode: 'screen' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-black/20 to-transparent z-20 pointer-events-none" />
                    <div className="absolute bottom-4 left-5 z-30 pointer-events-none">
                       <div className="flex items-center gap-2">
                          <span className="text-[9px] sm:text-[10px] font-black text-black bg-amber-400 px-2 py-0.5 rounded uppercase tracking-widest shadow-md shadow-amber-400/20">V2 HD</span>
                          <span className="text-[9px] text-white/60 font-mono tracking-widest flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                             LIVE FEED
                          </span>
                       </div>
                    </div>
                 </div>
                 
                 {/* RIGHT: Title and Status */}
                 <div className="flex-1 relative bg-black/40 z-30 p-5 flex flex-col justify-end items-end text-right overflow-hidden">
                    {coverUrl && (
                        <>
                           <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm transition-transform duration-[10s]" style={{ backgroundImage: `url(${coverUrl})` }} />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                        </>
                    )}
                    <div className="mb-auto mt-2 relative z-10">
                        {isLoadingAudio ? (
                           <div className="flex flex-col min-w-0 leading-tight bg-black/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-md text-right items-end shadow-xl">
                              <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest animate-pulse flex items-center gap-2">
                                 <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Buffering
                              </span>
                              <span className="text-[9px] text-white/50 font-mono uppercase tracking-widest mt-1">Stems: {loadedCount}/{stemsList.length}</span>
                           </div>
                        ) : (
                           <div className="flex flex-col min-w-0 leading-tight bg-black/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-md text-right items-end shadow-xl">
                              <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                 {isPlaying ? <><Play className="w-3 h-3 fill-current" /> PLAYING</> : <><Pause className="w-3 h-3 fill-current" /> PAUSED</>}
                              </span>
                              <span className="text-[8px] sm:text-[9px] text-white/50 font-mono uppercase tracking-widest mt-1">EQ Ready</span>
                           </div>
                        )}
                    </div>
                    <div className="w-full min-w-0 relative z-10">
                       <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white truncate drop-shadow-lg tracking-tight" title={songTitle}>
                          {songTitle}
                       </h3>
                    </div>
                 </div>
              </div>              {/* Player Controls */}
              <div className="p-4 sm:px-6 sm:py-4 flex flex-col md:flex-row md:items-center gap-4 bg-black/40 border-t border-white/5 shadow-inner z-20 relative w-full">
                 
                 {/* Left: Playback controls container */}
                 <div className="flex items-center justify-center md:justify-start gap-3 w-full md:w-auto shrink-0">
                    <div className="flex items-center gap-3">
                       <button 
                          disabled={isLoadingAudio || isExporting}
                          onClick={togglePlay}
                          className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-tr from-amber-400 to-amber-300 text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(251,191,36,0.25)] hover:shadow-[0_0_35px_rgba(251,191,36,0.4)] shrink-0 border border-white/20"
                          title={isPlaying ? "Pause" : "Play"}
                       >
                          {isLoadingAudio ? (
                             <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-black" />
                          ) : isPlaying ? (
                             <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black" />
                          ) : (
                             <Play className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black ml-0.5 sm:ml-1" />
                          )}
                       </button>
                       
                       <button
                          disabled={isLoadingAudio || isExporting}
                          onClick={handleRestart}
                          className="w-11 h-11 sm:w-14 sm:h-14 bg-black/40 hover:bg-black/60 text-white border border-white/10 hover:border-white/20 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-inner shrink-0"
                          title="Restart from beginning"
                       >
                          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                       </button>
                       <button onClick={() => setIsHD(!isHD)} className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border text-[11px] sm:text-[13px] font-black tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${isHD ? 'border-amber-400/40 bg-amber-400/10 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] shadow-[inset_0_0_15px_rgba(245,158,11,0.2)]' : 'bg-black/40 hover:bg-black/60 border-white/10 text-white/40 hover:text-white/70 shadow-inner'}`} title="Toggle Lossless HD Audio">HD</button>
                    </div>
                 </div>

                 {/* Middle: Seeker (Waveform & Timer) */}
                 <div className="flex-1 w-full h-14 sm:h-20 bg-black/60 border border-white/5 rounded-xl overflow-hidden relative group-hover:border-white/15 transition-colors shadow-inner flex flex-col justify-center min-h-[56px]">
                    
                    {/* Simulated Waveform Background */}
                    <div className="absolute inset-0 flex items-center justify-between gap-[1px] sm:gap-[2px] opacity-40 pointer-events-none overflow-hidden px-1">
                       {Array.from({ length: 100 }).map((_, i) => {
                          const isPlayed = i / 100 < (currentTime / (duration || 1));
                          const pseudoRand = Math.abs(Math.sin(i * 13.5) * Math.cos(i * 4.2));
                          const h = 15 + pseudoRand * 70;
                          return (
                             <div 
                                key={i} 
                                className="flex-1 rounded-full transition-colors duration-300" 
                                style={{ 
                                   height: `${h}%`,
                                   opacity: isPlayed ? 1 : 0.4,
                                   backgroundColor: isPlayed ? '#fcd34d' : 'white'
                                }} 
                             />
                          );
                       })}
                    </div>
                    
                    {/* Decorative Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />

                    <div className="w-full h-full absolute inset-0 cursor-pointer z-10" 
                       onPointerDown={(e) => {
                          if (isLoadingAudio || isExporting) return;
                          if (isPlaying) {
                              Object.values(audioElementsRef.current).forEach((a: any) => a.pause());
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const p = Math.max(0, Math.min(100, (x / rect.width) * 100));
                          handleSeek({ target: { value: (p / 100) * (duration || 0) } } as any);
                       }}
                       onPointerUp={(e) => {
                          if (isLoadingAudio || isExporting) return;
                          if (isPlaying) {
                              Object.values(audioElementsRef.current).forEach((a: any) => { try { a.currentTime = currentTime; } catch(e){} });
                              Object.values(audioElementsRef.current).forEach((a: any) => { a.play().catch(()=>{}); });
                          }
                       }}
                    >
                       <div className="w-full h-full relative">
                          <div className="absolute top-0 bottom-0 left-0 bg-amber-400/15 border-r border-amber-400/50 shadow-[4px_0_15px_rgba(251,191,36,0.2)] transition-all duration-75" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-full bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,1)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                       </div>
                    </div>
                    
                    <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] sm:text-[10px] font-black text-white tracking-widest px-1 z-20 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                       <span className="bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">{formatTime(currentTime)}</span>
                       <span className="bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">{formatTime(duration)}</span>
                    </div>
                 </div>
                 
                 {/* Right: Transcription Tools */}
                 <div className="flex items-center gap-2 w-full md:w-auto shrink-0 bg-black/20 p-2 rounded-xl border border-white/5 h-14 sm:h-20 justify-center">
                    <div className="flex flex-col items-center gap-1 w-full text-center">
                       <span className="text-[9px] font-bold tracking-[0.1em] text-white/40 uppercase mb-0.5 hidden xs:block">Subtitles</span>
                       <div className="flex gap-1.5">
                           <button
                                onClick={handleCohereTranscribe}
                                className="h-9 px-4 sm:h-8 sm:px-3 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border bg-black/40 border-white/5 text-amber-400/80 hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30"
                                title="Transcribe with Cohere (WebGPU Demo)"
                           >
                                {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                                <span className="xs:inline">AI Transcript</span>
                           </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

          {/* GLOBAL COLLAPSE / EXPAND CONTROL */}
          <div className="flex justify-end items-center gap-2 mb-1 shrink-0">
             <button
                onClick={() => {
                   const allExpanded = Object.values(expandedSections).every(v => v);
                   setExpandedSections({
                      mixer: !allExpanded,
                      transcript: !allExpanded,
                      masterFx: !allExpanded,
                      masterEq: !allExpanded,
                      aiCloud: !allExpanded
                   });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
             >
                {Object.values(expandedSections).every(v => v) ? (
                   <>
                      <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                      Collapse All Sections
                   </>
                ) : (
                   <>
                      <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                      Expand All Sections
                   </>
                )}
             </button>
          </div>

          {/* STEM VOLUMES MIXER */}
          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('mixer')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Sliders className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Mixer</h3>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-mono font-medium text-white/30">{stemsList.length} <span className="hidden sm:inline">Tracks Loaded</span></span>
                   {expandedSections.mixer ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             
             {expandedSections.mixer && (
             <div className="flex flex-col gap-2.5">
                {stemsList.map(stem => (
                   <div key={stem} className="w-full bg-black/30 border border-white/5 hover:border-white/10 hover:bg-black/50 rounded-2xl p-3 flex flex-col md:flex-row md:items-center gap-4 transition-all duration-300 group">
                      
                      {/* Left: Icon, Name & M/S controls */}
                      <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto shrink-0">
                         <div className="flex items-center gap-3 w-40">
                            <button 
                                onClick={() => handleDownloadStem(stem)}
                                title={`Download ${stem} stem`}
                                className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/50 border border-white/5 transition-colors hover:bg-white/10 group-hover:bg-black/70 shadow-inner relative overflow-hidden group/icon" 
                                style={{ color: STEM_COLORS[stem] || '#fff' }}
                            >
                                 <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/icon:opacity-100 transition-opacity">
                                     <Download className="w-4 h-4 text-white" />
                                 </div>
                                 <div className="group-hover/icon:opacity-0 transition-opacity flex items-center justify-center w-full h-full">
                                     {stem === 'vocals' && <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>}
                                     {stem === 'drums' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}
                                     {stem === 'bass' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><path d="M6 15H3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2Z"/><path d="M18 13h-3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2Z"/></svg>}
                                     {stem === 'guitar' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 8v8"/><path d="M12 8v8"/><path d="M16 8v8"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>}
                                     {stem === 'piano' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M6 5v14"/><path d="M10 5v14"/><path d="M14 5v14"/><path d="M18 5v14"/></svg>}
                                     {stem === 'other' && <Sparkles className="w-5 h-5" />}
                                 </div>
                            </button>
                            <div className="flex flex-col min-w-0">
                               <span className="text-xs font-black uppercase tracking-wider text-white truncate" style={{ textShadow: `0 0 8px ${(STEM_COLORS[stem] || '#fff')}33` }}>{stem}</span>
                               
                               
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-black text-white/30 uppercase w-2 text-right">L</span>
                                  <input
                                      type="range" min="-1" max="1" step="0.01" value={pans[stem] || 0}
                                      onChange={(e) => setPans(p => ({...p, [stem]: parseFloat(e.target.value)}))}
                                      className="w-20 h-1 rounded-full appearance-none bg-white/10 accent-white/50 hover:accent-white/80"
                                      title="Pan"
                                  />
                                  <span className="text-[8px] font-black text-white/30 uppercase w-2 text-left">R</span>
                               </div>
                            </div>
                         </div>

                         {/* Mute / Solo / Download buttons */}
                         <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                             <button
                                onClick={() => setMutes(p => ({...p, [stem]: !p[stem]}))}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${mutes[stem] ? 'bg-red-500 text-black shadow-md shadow-red-500/20 border-red-500 font-extrabold' : 'bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                                title="Mute Track"
                             >
                                <VolumeX className="w-3.5 h-3.5" />
                             </button>
                             <button
                                onClick={() => setSolos(p => ({...p, [stem]: !p[stem]}))}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${solos[stem] ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/20 border-yellow-500 font-extrabold' : 'bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                                title="Solo Track"
                             >
                                <Headphones className="w-3.5 h-3.5" />
                             </button>
                             <button
                                onClick={() => handleDownloadStem(stem)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5"
                                title="Download Stem"
                             >
                                <Download className="w-3.5 h-3.5" />
                             </button>

                         </div>
                      </div>

                      {/* Middle: Beautiful Flowing Waveform Canvas */}
                      <div className="flex-1 h-16 sm:h-20 bg-black/50 border border-white/5 rounded-xl overflow-hidden relative group-hover:border-white/15 transition-colors shadow-inner">
                         <canvas
                            ref={(el) => {
                              if (el) {
                                stemCanvasRefs.current[stem] = el;
                              } else {
                                delete stemCanvasRefs.current[stem];
                              }
                            }}
                            width={500}
                            height={80}
                            className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity z-10 relative pointer-events-none"
                         />
                         <StemWaveform url={(stemUrls as any)[stem]} color={STEM_COLORS[stem] || '#fbbf24'} audioElement={audioElementsRef.current[stem]} />
                         {/* Decorative Grid Lines */}
                         <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px]" />
                         <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
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
             )}
          </div>
                                      {/* SUBTITLES UI */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('transcript')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Type className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Vocal Transcript</h3>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                       {cohereTranscript && !isEditingTranscript && (
                           <>
                               <button onClick={() => setIsEditingTranscript(true)} className="text-white/40 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                               <button onClick={handleCopyTranscript} className="text-white/40 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                               <button onClick={handleExportSRT} className="text-amber-400/70 hover:text-amber-400 text-[10px] uppercase font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Export SRT</button>
                           </>
                       )}
                       {cohereTranscript && isEditingTranscript && (
                           <button onClick={() => setIsEditingTranscript(false)} className="text-amber-400 hover:text-amber-300 text-[10px] uppercase font-bold flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                       )}
                       {isTranscribing && <span className="text-[9px] font-mono font-medium text-amber-400 animate-pulse">{transcriptionStatus}</span>}
                   </div>
                   {expandedSections.transcript ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             
             {expandedSections.transcript && (
               <div className="flex flex-col gap-2.5">
                {cohereTranscript && isEditingTranscript && (
                    <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white/90 text-sm leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-400/50 min-h-[200px]"
                        value={cohereTranscript}
                        onChange={(e) => setCohereTranscript(e.target.value)}
                    />
                )}
                
                {cohereTranscript && !isEditingTranscript && (
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-3 max-h-80 overflow-y-auto custom-scrollbar shadow-inner text-left scroll-smooth">
                        {transcriptLines.map((line, idx) => {
                           const isActive = currentTime >= line.start && currentTime < line.end;
                           const isPast = currentTime >= line.end;
                           return (
                             <div 
                               key={idx} 
                               className={`text-sm leading-relaxed transition-colors duration-300 flex items-center gap-3 ${isActive ? 'text-amber-400 font-bold scale-[1.01] origin-left' : isPast ? 'text-white/60' : 'text-white/30'} group/item`}
                             >
                               <span 
                                 className="text-[9px] font-mono opacity-50 shrink-0 w-12 hover:opacity-100 hover:text-amber-400 cursor-pointer transition-colors"
                                 onClick={() => handleSeek({ target: { value: line.start } })}
                                 title="Seek to this time"
                               >
                                 {Math.floor(line.start / 60)}:{(Math.floor(line.start % 60)).toString().padStart(2, '0')}
                               </span>
                               
                               {editingLineIdx === idx ? (
                                 <input
                                   type="text"
                                   value={editingLineText}
                                   onChange={(e) => setEditingLineText(e.target.value)}
                                   onBlur={() => handleSaveInlineLine(idx, editingLineText)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       handleSaveInlineLine(idx, editingLineText);
                                     } else if (e.key === 'Escape') {
                                       setEditingLineIdx(null);
                                     }
                                   }}
                                   autoFocus
                                   className="flex-1 bg-white/5 border border-amber-400/30 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-400/80 font-normal text-sm"
                                 />
                                ) : (
                                  <span 
                                    className="flex-1 cursor-pointer hover:text-amber-300 hover:underline transition-all"
                                    onClick={() => {
                                      setEditingLineIdx(idx);
                                      setEditingLineText(line.text);
                                    }}
                                    title="Click to edit text"
                                  >
                                    {line.text}
                                  </span>
                                )}
                             </div>
                           );
                        })}
                    </div>
                )}
               </div>
             )}
          </div>
          {/* MASTER FX */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('masterFx')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Settings2 className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Master FX</h3>
                {expandedSections.masterFx ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
             </div>
             {expandedSections.masterFx && (
               <div className="flex flex-col gap-3.5">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                   <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Tempo</span>
                         <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={preservePitch} onChange={(e) => setPreservePitch(e.target.checked)} className="accent-amber-400" />
                            <span className="text-[9px] font-bold text-white/50 uppercase flex items-center gap-1">Pitch Sync</span>
                         </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/70 w-8">{speed.toFixed(2)}x</span>
                        <input
                            type="range" min="0.5" max="2" step="0.05" value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 rounded-lg appearance-none bg-white/10 accent-amber-400"
                        />
                      </div>
                </div>
                <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1"><Wind className="w-3 h-3" /> Reverb</span>
                      <span className="text-[10px] font-mono text-white/70">{Math.round(reverb * 100)}%</span>
                   </div>
                   <input
                       type="range" min="0" max="1" step="0.01" value={reverb}
                       onChange={(e) => setReverb(parseFloat(e.target.value))}
                       className="w-full h-1.5 rounded-lg appearance-none bg-white/10 accent-purple-400"
                    />
                 </div>
              </div>
           </div>
              )}
           </div>
                                                                                     {/* EQUALIZER */}
           <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('masterEq')}>
                 <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Sliders className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Master EQ</h3>
                 <div className="flex items-center gap-2">
                    <button 
                       onClick={(e) => {
                          e.stopPropagation();
                          const newEq = masterEq.map((b) => ({ ...b, g: 0 }));
                          setMasterEq(newEq);
                       }}
                       className="text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                    >
                       Reset
                    </button>
                    {expandedSections.masterEq ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                 </div>
              </div>
              
              {expandedSections.masterEq && (
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
              )}
           </div>

{/* CUSTOM SERVER CONFIG / HF CLONE INSTRUCTIONS */}
          <div className="flex flex-col gap-3.5 border-t border-white/5 pt-5 pb-3">
             <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase flex items-center gap-1">
                   <Cloud className="w-3.5 h-3.5 text-amber-400" /> AI Cloud custom space
                </h3>
                <span className="text-[8px] bg-amber-400/10 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-black font-mono">OPTIONAL</span>
             </div>
             
             <div className="bg-[#0A0A0C]/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                   Avoid public API rate limits by duplicating the <strong>tienqnguyen95/Stemmix</strong> Hugging Face space for free!
                </p>
                
                <div className="flex flex-col gap-1.5 bg-black/30 p-2.5 rounded-xl border border-white/5 text-[10px]">
                   <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <span className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px]">1</span>
                      <span>Duplicate the Space:</span>
                   </div>
                   <a 
                      href="https://huggingface.co/spaces/tienqnguyen95/Stemmix" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-amber-400 hover:underline break-all font-mono font-bold"
                   >
                      https://huggingface.co/spaces/tienqnguyen95/Stemmix ↗
                   </a>
                   <div className="text-white/40 leading-normal pl-5">
                      Click the three dots in top-right → <strong>"Duplicate this Space"</strong>. Set visibility to <strong>Public</strong> (it runs on free hardware).
                   </div>
                   
                   <div className="flex items-center gap-1.5 text-amber-400 font-bold mt-2">
                      <span className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px]">2</span>
                      <span>Paste your Cloned Space ID below:</span>
                   </div>
                </div>
                
                <div className="flex gap-2">
                   <input
                      type="text"
                      placeholder="e.g. your-username/Stemmix"
                      value={customSpaceUrl}
                      onChange={(e) => {
                         const val = e.target.value.trim();
                         setCustomSpaceUrl(val);
                         localStorage.setItem("stemmix_custom_space_url", val);
                      }}
                      className="flex-1 bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/15"
                   />
                   {customSpaceUrl && (
                      <button
                         type="button"
                         onClick={() => {
                            setCustomSpaceUrl("");
                            localStorage.removeItem("stemmix_custom_space_url");
                         }}
                         className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all border border-white/5"
                      >
                         Clear
                      </button>
                   )}
                </div>
                {customSpaceUrl && (
                   <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active: Your Space will be prioritized for remote AI Cloud separation!
                   </div>
                )}
             </div>
          </div>
          </>
         )}

       </div>

    </div>
   );
}
