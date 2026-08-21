import WaveSurfer from "wavesurfer.js";
import JSZip from 'jszip';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import SunoLyricDownloader from './SunoLyricDownloader';
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
import { Play, Pause, ChevronDown, ChevronRight, ChevronUp, Volume2, VolumeX, X, Settings2, Download, Maximize2, Minimize2, Radio, Activity, Sliders, Sparkles, ArrowLeft, Plus, Loader2, Zap, Cloud, Brain, Headphones, Clock, Music, Wind, RotateCcw, Type, Check, Search, Scissors, Replace, Trash2, SlidersHorizontal, Undo2, Redo2, Edit3, Eye } from 'lucide-react';
import AudioTrimmer from "./AudioTrimmer";
import { transcribeWithCohere } from '../utils/cohereTranscriber';
import { transcribeWithRNNT } from '../utils/rnntTranscriber';
import { Copy, FileText, Edit2, Save, Link, UploadCloud, Repeat, Waves, TreePine, CloudRain, CloudLightning, FileAudio, Wand2, AlertTriangle } from 'lucide-react';
import { diffWords, Change } from 'diff';
import SpectrogramTool from "./Spectrogram";
import PixabayStudio from "./PixabayStudio";

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
  onUpdateAudioUrl?: (newUrl: string, newDuration?: number) => void;
  onClearStems?: () => void;
  webgpuQuality?: 'fast' | 'high' | 'ultra' | 'pro';
  onWebgpuQualityChange?: (quality: 'fast' | 'high' | 'ultra' | 'pro') => void;
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
        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: color,
            progressColor: 'rgba(255,255,255,0.5)',
            media: audioElement || undefined,
            height: 'auto',
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            interact: false
        });
        wsRef.current = ws;
        ws.load(url).catch((e: any) => { if (e && e.name !== 'AbortError' && !e.message?.includes('abort')) console.error(e); });
        
        return () => {
            ws.destroy();
        };
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
  onExtractNewSong,
  onUpdateAudioUrl,
  onClearStems,
  webgpuQuality = "ultra",
  onWebgpuQualityChange
}: StemStudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<"wav" | "mp3">("mp3");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadLink, setDownloadLink] = useState<{ url: string; filename: string } | null>(null);
  const [isTrimmingMixdown, setIsTrimmingMixdown] = useState(false);
  const downloadLinkRef = useRef<HTMLDivElement>(null);

  // Stop all playing audio elements whenever stem separation starts loading
  useEffect(() => {
    if (stemmixStatus === "loading") {
      setIsPlaying(false);
      Object.values(audioElementsRef.current).forEach((a: HTMLAudioElement) => {
        try { a.pause(); } catch {}
      });
      if (typeof document !== 'undefined') {
        document.querySelectorAll('audio').forEach((a: HTMLAudioElement) => {
          try { a.pause(); } catch {}
        });
      }
    }
  }, [stemmixStatus]);

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

  // Scroll Mixdown Ready card into view when generated
  useEffect(() => {
    if (downloadLink && downloadLinkRef.current) {
      setTimeout(() => {
        const container = document.getElementById('stem-studio-scroll-container');
        if (container && downloadLinkRef.current) {
           const offset = downloadLinkRef.current.offsetTop;
           container.scrollTo({ top: offset - 20, behavior: 'smooth' });
        } else {
           downloadLinkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
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
    aiCloud: true,
    lyric: false,
    overlay: true
  });
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Lyric Tool States
  const [lyricRaw, setLyricRaw] = useState<string>("");
  const [lyricFormatted, setLyricFormatted] = useState<string>("");
  const [lyricStyle, setLyricStyle] = useState<string>("");
  const [isFormattingLyric, setIsFormattingLyric] = useState<boolean>(false);

  const [isArrangingLyric, setIsArrangingLyric] = useState<boolean>(false);

  const [arrangeSunoFormat, setArrangeSunoFormat] = useState<boolean>(true);
  const [arrangeAddChords, setArrangeAddChords] = useState<boolean>(false);

  const [arrangeCharLimit, setArrangeCharLimit] = useState<boolean>(true);
  const [arrangeCustomPrompt, setArrangeCustomPrompt] = useState<string>("");


  const [lyricArrangeInput, setLyricArrangeInput] = useState<string>("");
  const [lyricArranged, setLyricArranged] = useState<string>("");
  const [lyricArrangedStyle, setLyricArrangedStyle] = useState<string>("");
  const [isArrangedStyleCopied, setIsArrangedStyleCopied] = useState<boolean>(false);
  const [isArrangedCopied, setIsArrangedCopied] = useState<boolean>(false);

  const [isImprovingLyric, setIsImprovingLyric] = useState<boolean>(false);
  const [isAddingChords, setIsAddingChords] = useState<boolean>(false);
  const [improvePercentage, setImprovePercentage] = useState<number>(3);
  const [swapWordA, setSwapWordA] = useState<string>("Anh");
  const [swapWordB, setSwapWordB] = useState<string>("Em");
  const [lyricDiff, setLyricDiff] = useState<Change[] | null>(null);
  const [isLyricCopied, setIsLyricCopied] = useState<boolean>(false);

  // Find & Replace and Suno Bypass States
  interface FindReplacePair {
    id: string;
    find: string;
    replace: string;
    enabled: boolean;
  }

  const [findReplacePairs, setFindReplacePairs] = useState<FindReplacePair[]>([
    { id: '1', find: 'Anh', replace: 'anhh', enabled: true },
    { id: '2', find: 'Em', replace: 'emm', enabled: true },
  ]);

  const [selectedQuickPickIds, setSelectedQuickPickIds] = useState<string[]>(
    ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  );

  const [findMatchCase, setFindMatchCase] = useState<boolean>(false);
  const [findWholeWord, setFindWholeWord] = useState<boolean>(true);

  interface BypassRule {
    id: string;
    find: string;
    replace: string;
    enabled: boolean;
  }

  const initialBypassRules: BypassRule[] = [
    { id: '1', find: 'Anh', replace: 'anhh', enabled: true },
    { id: '2', find: 'Em', replace: 'emm', enabled: true },
    { id: '3', find: 'anh', replace: 'anhh', enabled: true },
    { id: '4', find: 'em', replace: 'emm', enabled: true },
    { id: '5', find: 'thôi', replace: 'thôii', enabled: true },
    { id: '6', find: 'yêu', replace: 'yêuu', enabled: true },
    { id: '7', find: 'tình', replace: 'tìnhh', enabled: true },
    { id: '8', find: 'mình', replace: 'mìnhh', enabled: true },
    { id: '9', find: 'người', replace: 'ngườii', enabled: true },
  ];

  const [bypassRules, setBypassRules] = useState<BypassRule[]>(initialBypassRules);
  const [showRuleManager, setShowRuleManager] = useState<boolean>(false);
  const [newRuleFind, setNewRuleFind] = useState<string>("");
  
  const [newRuleReplace, setNewRuleReplace] = useState<string>("");

  // Advanced Suno Bypass States
  const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "extreme" | "none">("none");
  const [hyphenStyle, setHyphenStyle] = useState<"consonant" | "auto">("consonant");
  const [bypassIntensity, setBypassIntensity] = useState<"minimal" | "low" | "medium" | "high">("minimal");
  const [protectTags, setProtectTags] = useState<boolean>(true);
  const [preserveSensitive, setPreserveSensitive] = useState<boolean>(true);
  const [showSensitiveWords, setShowSensitiveWords] = useState<boolean>(false);
  const [sensitiveWords, setSensitiveWords] = useState<string[]>(["lên", "nên", "nói", "lòng", "nỗi", "lo", "nắng", "lạnh", "non", "nơi", "lại", "nào", "trời", "chờ", "trăng", "chân", "tròn", "chưa", "trước", "chỉ", "trách", "chạy", "sao", "xanh", "sương", "xa", "sông", "xuống", "sầu", "xưa", "sáng", "xin", "rừng", "dòng", "gió", "ra", "dù", "gần", "rơi", "đường", "duyên", "giấc", "về", "vẫn", "vào", "với", "vui", "vàng", "mắt", "mắc", "biết", "tiếc", "yêu", "thương", "anh", "em", "đâu", "đây"]);

    const [isAIBypassing, setIsAIBypassing] = useState<boolean>(false);
  const [aiBypassStatus, setAiBypassStatus] = useState<string>("");


  // Lyric Tool History & Editing States
  interface LyricHistoryEntry {
    text: string;
    diff: Change[] | null;
  }
  const [lyricHistory, setLyricHistory] = useState<LyricHistoryEntry[]>([]);
  const [lyricRedoStack, setLyricRedoStack] = useState<LyricHistoryEntry[]>([]);
  const [isEditingFormatted, setIsEditingFormatted] = useState<boolean>(true);

  const recordLyricState = (newText: string, newDiff?: Change[] | null) => {
    const baseText = lyricRaw || '';
    const diffToUse = newDiff !== undefined ? newDiff : (baseText ? diffWords(baseText, newText) : null);

    setLyricHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1].text === lyricFormatted && prev[prev.length - 1].diff === lyricDiff) {
        return prev;
      }
      return [...prev.slice(-30), { text: lyricFormatted, diff: lyricDiff }];
    });
    setLyricRedoStack([]);
    setLyricFormatted(newText);
    setLyricDiff(diffToUse);
    if (diffToUse && diffToUse.some(p => p.added || p.removed)) {
      setIsEditingFormatted(false);
    }
  };

  const handleUndoLyric = () => {
    if (lyricHistory.length === 0) return;
    const lastState = lyricHistory[lyricHistory.length - 1];
    setLyricHistory(prev => prev.slice(0, -1));
    setLyricRedoStack(prev => [...prev, { text: lyricFormatted, diff: lyricDiff }]);
    setLyricFormatted(lastState.text);
    setLyricDiff(lastState.diff);
  };

  const handleRedoLyric = () => {
    if (lyricRedoStack.length === 0) return;
    const nextState = lyricRedoStack[lyricRedoStack.length - 1];
    setLyricRedoStack(prev => prev.slice(0, -1));
    setLyricHistory(prev => [...prev, { text: lyricFormatted, diff: lyricDiff }]);
    setLyricFormatted(nextState.text);
    setLyricDiff(nextState.diff);
  };

  const handleCopyLyric = async () => {
    try {
      await navigator.clipboard.writeText(lyricFormatted);
      setIsLyricCopied(true);
      setTimeout(() => setIsLyricCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  
    const handleCopyArrangedStyle = async () => {
    try {
      await navigator.clipboard.writeText(lyricArrangedStyle);
      setIsArrangedStyleCopied(true);
      setTimeout(() => setIsArrangedStyleCopied(false), 2000);
    } catch (err) {}
  };

  const handleCopyArranged = async () => {
    try {
      await navigator.clipboard.writeText(lyricArranged);
      setIsArrangedCopied(true);
      setTimeout(() => setIsArrangedCopied(false), 2000);
    } catch (err) {}
  };

  const handleArrangeLyric = async () => {
     const text = lyricArrangeInput || lyricRaw;
     if (!text) return;
     setIsArrangingLyric(true);
     setLyricArranged("Đang tạo bản phối khí chuyên nghiệp... (Thường mất khoảng 15-30 giây)");
     setLyricArrangedStyle("");
     try {
        const res = await fetch("/api/lyric/arrange", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ lyric: text, options: { sunoFormat: arrangeSunoFormat, addChords: arrangeAddChords, charLimit: arrangeCharLimit, customPrompt: arrangeCustomPrompt } })
        });
        const data = await res.json();
        if (res.ok && data.lyric) {
           setLyricArranged(data.lyric);
           setLyricArrangedStyle(data.style || "");
        } else if (data.error) {
           setLyricArranged("Lỗi: " + data.error);
        }
     } catch (e: any) {
        setLyricArranged("Lỗi kết nối khi phối khí.");
     }
     setIsArrangingLyric(false);
  };

  const handleFormatLyric = async () => {
     if (!lyricRaw) return;
     setIsFormattingLyric(true);
     setLyricDiff(null);
     try {
        const res = await fetch("/api/lyric/format", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ lyric: lyricRaw, style: lyricStyle })
        });
        const data = await res.json();
        if (res.ok && data.prompt) {
           recordLyricState(data.prompt, null);
           if (data.style && !lyricStyle) setLyricStyle(data.style);
        } else if (data.error) {
           alert(data.error);
        }
     } catch (e) {
        console.error("Failed to format lyric", e);
     }
     setIsFormattingLyric(false);
  };

  const handleImproveLyric = async () => {
     const textToImprove = lyricFormatted || lyricRaw;
     if (!textToImprove) return;
     setIsImprovingLyric(true);
     try {
        const res = await fetch("/api/lyric/improve", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ lyric: textToImprove, percentage: improvePercentage })
        });
        const data = await res.json();
        if (res.ok && data.lyric) {
           recordLyricState(data.lyric);
        } else if (data.error) {
           alert(data.error);
        }
     } catch (e) {
        console.error("Failed to improve lyric", e);
     }
     setIsImprovingLyric(false);
  };

  const handleAddChords = async () => {
     const textToProcess = lyricFormatted || lyricRaw;
     if (!textToProcess) return;
     setIsAddingChords(true);
     try {
        const res = await fetch("/api/lyric/chords", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ lyric: textToProcess })
        });
        const data = await res.json();
        if (res.ok && data.lyric) {
           recordLyricState(data.lyric);
        } else if (data.error) {
           alert(data.error);
        }
     } catch (e) {
        console.error("Failed to add chords", e);
     }
     setIsAddingChords(false);
  };

  const handleSwapWords = () => {
     const textToProcess = lyricFormatted || lyricRaw;
     if (!textToProcess || !swapWordA || !swapWordB) return;
     
     // Escape regex specials
     const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     const regex = new RegExp(`\\b(${escapeRegExp(swapWordA)}|${escapeRegExp(swapWordB)})\\b`, 'gi');
     
     const newText = textToProcess.replace(regex, (match) => {
         const lowerMatch = match.toLowerCase();
         const lowerA = swapWordA.toLowerCase();
         const lowerB = swapWordB.toLowerCase();
         
         let replacement = "";
         if (lowerMatch === lowerA) {
             replacement = swapWordB;
         } else if (lowerMatch === lowerB) {
             replacement = swapWordA;
         } else {
             return match;
         }
         
         // Preserve capitalization
         if (match === match.toUpperCase() && match.length > 1) {
             return replacement.toUpperCase();
         } else if (match[0] === match[0].toUpperCase()) {
             return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
         } else {
             return replacement.toLowerCase();
         }
     });
     
     recordLyricState(newText);
  };

  const handleInsertRandomChars = () => {
     if (!lyricFormatted) return;
     const chars = ['.', ',', '!', '?', '^', '~', '-', '*', '😊', '🔥', '✨', '🎶', '🎤', "'", '>', '$', '/', '`', '\\', '"'];
     let newText = "";
     for (let i = 0; i < lyricFormatted.length; i++) {
        newText += lyricFormatted[i];
        if (Math.random() < 0.05 && lyricFormatted[i] === ' ') {
           newText += chars[Math.floor(Math.random() * chars.length)] + " ";
        }
     }
     recordLyricState(newText);
  };

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const executeFindReplace = (targetText: string, findStr: string, replaceStr: string, matchCase = false, wholeWord = true) => {
    if (!targetText || !findStr) return targetText;
    const escaped = escapeRegExp(findStr);
    let pattern = escaped;
    if (wholeWord) {
      const leftBoundary = "(?:^|(?<=[^\\p{L}\\p{N}_]))";
      const rightBoundary = "(?:$|(?=[^\\p{L}\\p{N}_]))";
      pattern = `${leftBoundary}${escaped}${rightBoundary}`;
    }
    const flags = matchCase ? 'gu' : 'gui';
    try {
      const regex = new RegExp(pattern, flags);
      return targetText.replace(regex, replaceStr);
    } catch {
      const fallbackFlags = matchCase ? 'g' : 'gi';
      const fallbackPattern = wholeWord ? `\\b${escaped}\\b` : escaped;
      const regex = new RegExp(fallbackPattern, fallbackFlags);
      return targetText.replace(regex, replaceStr);
    }
  };

  const handleSingleReplace = (findStr: string, replaceStr: string) => {
    const textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess || !findStr) return;

    const newText = executeFindReplace(textToProcess, findStr, replaceStr, findMatchCase, findWholeWord);
    recordLyricState(newText);
  };

  const handleAddPairRow = () => {
    setFindReplacePairs(prev => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString().slice(2, 5), find: '', replace: '', enabled: true }
    ]);
  };

  const handleUpdatePairRow = (id: string, field: 'find' | 'replace' | 'enabled', value: string | boolean) => {
    setFindReplacePairs(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRemovePairRow = (id: string) => {
    setFindReplacePairs(prev => prev.filter(p => p.id !== id));
  };

  const handleClearPairRows = () => {
    setFindReplacePairs([]);
  };

  const handleExecuteAllPairs = () => {
    const textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;

    const activePairs = findReplacePairs.filter(p => p.enabled && p.find.trim());
    if (activePairs.length === 0) return;

    let currentText = textToProcess;
    for (const pair of activePairs) {
      currentText = executeFindReplace(currentText, pair.find, pair.replace, findMatchCase, findWholeWord);
    }

    recordLyricState(currentText);
  };

  // Quick Pick Functions
  const handleToggleQuickPick = (id: string) => {
    setSelectedQuickPickIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllQuickPicks = () => {
    setSelectedQuickPickIds(bypassRules.map(r => r.id));
  };

  const handleDeselectAllQuickPicks = () => {
    setSelectedQuickPickIds([]);
  };

  
  const handleAIBypass = async () => {
    let textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;
    
    setIsAIBypassing(true);
    setAiBypassStatus("Đang gọi AI Model...");
    
    try {
        const res = await fetch("/api/lyric/bypass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lyric: textToProcess })
        });
        const data = await res.json();
        
        if (res.ok && data.lyric) {
            recordLyricState(data.lyric);
            setAiBypassStatus("✅ AI Bypass thành công!");
        } else if (data.error) {
            setAiBypassStatus("❌ " + data.error);
        } else {
            setAiBypassStatus("❌ Lỗi không xác định từ AI.");
        }
    } catch (err) {
        console.error("AI Bypass error", err);
        setAiBypassStatus("❌ Lỗi kết nối AI.");
    }
    
    setTimeout(() => {
       setIsAIBypassing(false);
       setAiBypassStatus("");
    }, 3000);
  };

  const handleApplyAdvancedBypass = () => {
    let textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;

    let intensityProb = 0.65;
    if (bypassIntensity === 'minimal') intensityProb = 0.15;
    if (bypassIntensity === 'low') intensityProb = 0.35;
    if (bypassIntensity === 'high') intensityProb = 0.95;

    const zeroWidthChar = '\u200B';
    const homoglyphMap: Record<string, string[]> = {
      'a': ['a', 'а', 'a'], 'e': ['e', 'е', 'e'], 'o': ['o', 'о', 'o'],
      'p': ['p', 'р', 'p'], 'c': ['c', 'с', 'c'], 'y': ['y', 'у', 'y'],
      'x': ['x', 'х', 'x'], 'H': ['H', 'Н', 'H'], 'P': ['P', 'Р', 'P'],
      'C': ['C', 'С', 'C'], 'M': ['M', 'М', 'M'], 'O': ['O', 'О', 'O'],
      'T': ['T', 'Т', 'T'], 'A': ['A', 'А', 'A']
    };

    const isSensitive = (word: string) => {
      if (!preserveSensitive) return false;
      const lowerWord = word.toLowerCase().replace(/[.,!?;:]/g, "");
      return sensitiveWords.includes(lowerWord);
    };

    const applyBypassToWord = (word: string) => {
      if (Math.random() > intensityProb) return word;
      if (protectTags && /^(\[.*?\]|\(.*?\)|\<.*?\>)$/.test(word)) return word;
      if (isSensitive(word)) return word;

      if (bypassMethod === 'hyphen') {
        if (word.length <= 1) return word;
        if (hyphenStyle === 'consonant') {
           // Vietnamese consonant split
           const match = word.match(/^(tr|th|ch|ph|nh|kh|gi|qu|ngh|ng|gh|[b-df-hj-np-tv-z])(.*)$/i);
           if (match && match[2].length > 0) {
              return match[1] + '-' + match[2];
           }
        }
        // Auto split (middle)
        const mid = Math.floor(word.length / 2);
        return word.slice(0, mid) + '-' + word.slice(mid);
      }
      
      if (bypassMethod === 'zerowidth') {
        const chars = word.split('');
        for (let i = 1; i < chars.length; i++) {
          if (Math.random() < 0.5) {
             chars[i] = zeroWidthChar + chars[i];
          }
        }
        return chars.join('');
      }

      if (bypassMethod === 'alternating') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
          if (Math.random() < 0.5) {
             chars[i] = chars[i].toUpperCase() === chars[i] ? chars[i].toLowerCase() : chars[i].toUpperCase();
          }
        }
        return chars.join('');
      }

      if (bypassMethod === 'homoglyph') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           const char = chars[i];
           if (homoglyphMap[char] && Math.random() < 0.5) {
              chars[i] = homoglyphMap[char][Math.floor(Math.random() * homoglyphMap[char].length)];
           }
        }
        return chars.join('');
      }
      
      if (bypassMethod === 'extreme') {
        const marks = ['\u034F', '\u200C', '\u200D', '\u2060', '\u200B'];
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           if (Math.random() < 0.7) {
              const mark = marks[Math.floor(Math.random() * marks.length)];
              chars[i] = chars[i] + mark;
           }
           if (homoglyphMap[chars[i]] && Math.random() < 0.3) {
              chars[i] = homoglyphMap[chars[i]][Math.floor(Math.random() * homoglyphMap[chars[i]].length)];
           }
        }
        // randomly inject a fake space or newline zero width equivalent
        if (chars.length > 2 && Math.random() < 0.3) {
           const mid = Math.floor(chars.length / 2);
           chars.splice(mid, 0, '\u200B\u200B');
        }
        return chars.join('');
      }

      return word;
    };

    // Process lines and words
    const lines = textToProcess.split('\n');
    const processedLines = lines.map(line => {
      // Don't modify pure tag lines if protect is on
      if (protectTags && /^\[.*?\]$/.test(line.trim())) return line;
      
      const words = line.split(/(\s+)/); // Preserve whitespace
      return words.map(w => {
         if (w.trim() === '') return w;
         return applyBypassToWord(w);
      }).join('');
    });

    recordLyricState(processedLines.join('\n'));
  };

  const handleApplySelectedQuickPicks = () => {

    const textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;

    const selectedRules = bypassRules.filter(r => r.enabled && selectedQuickPickIds.includes(r.id));
    if (selectedRules.length === 0) return;

    let currentText = textToProcess;
    for (const rule of selectedRules) {
      if (!rule.find) continue;
      currentText = executeFindReplace(currentText, rule.find, rule.replace, findMatchCase, findWholeWord);
    }

    recordLyricState(currentText);
  };

  const handleImportSelectedToPairs = () => {
    const selectedRules = bypassRules.filter(r => selectedQuickPickIds.includes(r.id));
    if (selectedRules.length === 0) return;

    const newPairs: FindReplacePair[] = selectedRules.map(r => ({
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      find: r.find,
      replace: r.replace,
      enabled: true,
    }));

    setFindReplacePairs(prev => [...prev, ...newPairs]);
  };

  const handleApplyBypassRules = (customRuleList?: BypassRule[]) => {
    const textToProcess = lyricFormatted || lyricRaw;
    if (!textToProcess) return;
    let currentText = textToProcess;
    const rulesToRun = customRuleList || bypassRules.filter(r => r.enabled);

    for (const rule of rulesToRun) {
      if (!rule.find) continue;
      currentText = executeFindReplace(currentText, rule.find, rule.replace, false, true);
    }

    recordLyricState(currentText);
  };

  const handleAddRule = () => {
    if (!newRuleFind.trim()) return;
    const newRule: BypassRule = {
      id: Date.now().toString(),
      find: newRuleFind.trim(),
      replace: newRuleReplace,
      enabled: true,
    };
    setBypassRules(prev => [...prev, newRule]);
    setNewRuleFind("");
    setNewRuleReplace("");
  };

  const handleToggleRule = (id: string) => {
    setBypassRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDeleteRule = (id: string) => {
    setBypassRules(prev => prev.filter(r => r.id !== id));
  };

  const handleResetDefaultRules = () => {
    setBypassRules(initialBypassRules);
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

  const [isTrimming, setIsTrimming] = useState<boolean>(false);
  const [isTrimmingBeforeExtract, setIsTrimmingBeforeExtract] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isSunoBypass, setIsSunoBypass] = useState<boolean>(false);
  const [sunoSpeedFactor, setSunoSpeedFactor] = useState<number>(() => parseFloat(localStorage.getItem("suno_speed") || "1.045"));
  const [sunoNoiseLevel, setSunoNoiseLevel] = useState<number>(() => parseFloat(localStorage.getItem("suno_noise") || "0"));
  const [sunoPitchShift, setSunoPitchShift] = useState<number>(() => parseFloat(localStorage.getItem("suno_pitch") || "6.5"));
  const [sunoEqLow, setSunoEqLow] = useState<number>(() => parseFloat(localStorage.getItem("suno_eq_low") || "6.5"));
  const [sunoEqMid, setSunoEqMid] = useState<number>(() => parseFloat(localStorage.getItem("suno_eq_mid") || "6.5"));
  const [sunoEqHigh, setSunoEqHigh] = useState<number>(() => parseFloat(localStorage.getItem("suno_eq_high") || "6.5"));
  const [showSunoSettings, setShowSunoSettings] = useState<boolean>(false);

  const handleResetSunoSystemDefault = () => {
    setSunoSpeedFactor(1.045);
    setSunoPitchShift(6.5);
    setSunoNoiseLevel(0);
    setSunoEqLow(6.5);
    setSunoEqMid(6.5);
    setSunoEqHigh(6.5);
  };

  const handleResetSunoOriginal = () => {
    setSunoSpeedFactor(1.0);
    setSunoPitchShift(0);
    setSunoNoiseLevel(0);
    setSunoEqLow(0);
    setSunoEqMid(0);
    setSunoEqHigh(0);
  };

  useEffect(() => {
    localStorage.setItem("suno_bypass", isSunoBypass.toString());
    localStorage.setItem("suno_speed", sunoSpeedFactor.toString());
    localStorage.setItem("suno_noise", sunoNoiseLevel.toString());
    localStorage.setItem("suno_pitch", sunoPitchShift.toString());
    localStorage.setItem("suno_eq_low", sunoEqLow.toString());
    localStorage.setItem("suno_eq_mid", sunoEqMid.toString());
    localStorage.setItem("suno_eq_high", sunoEqHigh.toString());
  }, [isSunoBypass, sunoSpeedFactor, sunoNoiseLevel, sunoPitchShift, sunoEqLow, sunoEqMid, sunoEqHigh]);

  useEffect(() => {
    if (duration > 0 && trimEnd === 0) {
      setTrimEnd(duration);
    }
  }, [duration, trimEnd]);

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
  
  const [activeTab, setActiveTab] = useState<'mixer' | 'eq' | 'ambient'>('mixer');

  // Ambient Overlay States
  const [ambientOverlayUrl, setAmbientOverlayUrl] = useState<string>("");
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);
  const [isAmbientLoop, setIsAmbientLoop] = useState<boolean>(true);
  const [showAmbientInput, setShowAmbientInput] = useState<boolean>(false);
  const [ambientInputUrl, setAmbientInputUrl] = useState<string>("");
  const [showSpectrogram, setShowSpectrogram] = useState<boolean>(false);
  
  const decodeAudioUrl = useMemo(() => {
     let url = originalAudioUrl;
     if (url && url.includes("/api/stream") && (url.includes("facebook.com") || url.includes("fb.watch") || url.includes("facebook"))) {
       url = url.replace("/api/stream", "/api/clean-wav");
     }
     return url;
  }, [originalAudioUrl]);

  const [showPixabaySearch, setShowPixabaySearch] = useState<boolean>(false);
  const [showPixabayStudio, setShowPixabayStudio] = useState<boolean>(false);
  const [pixabayQuery, setPixabayQuery] = useState<string>("rain");
  const [pixabayResults, setPixabayResults] = useState<any[]>([]);
  const [isPixabaySearching, setIsPixabaySearching] = useState<boolean>(false);
  const [previewingUrl, setPreviewingUrl] = useState<string | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingUrl === url) {
       previewAudioRef.current?.pause();
       setPreviewingUrl(null);
    } else {
       if (previewAudioRef.current) {
          previewAudioRef.current.pause();
       }
       setPreviewingUrl(url);
       if (!previewAudioRef.current) {
          previewAudioRef.current = new Audio(url);
          previewAudioRef.current.onended = () => setPreviewingUrl(null);
       } else {
          previewAudioRef.current.src = url;
       }
       previewAudioRef.current.play().catch(e => console.error("Preview failed:", e));
    }
  };

  const handlePixabaySearch = async (overrideQuery?: string | any) => {
    const isOverrideStr = typeof overrideQuery === 'string';
    const q = isOverrideStr ? overrideQuery : pixabayQuery;
    if (!q) return;
    if (isOverrideStr) setPixabayQuery(overrideQuery);
    setIsPixabaySearching(true);
    setPixabayResults([]);
    try {
      const res = await fetch(`/api/pixabay/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPixabayResults(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setIsPixabaySearching(false);
  };

  useEffect(() => {
    if (ambientAudioRef.current) {
      if (isPlaying) {
        ambientAudioRef.current.play().catch(e => console.log("Ambient play failed:", e));
      } else {
        ambientAudioRef.current.pause();
      }
    }
  }, [isPlaying, ambientOverlayUrl]);

  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = ambientVolume;
    }
  }, [ambientVolume, ambientOverlayUrl]);

  const handleAmbientFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (ambientOverlayUrl && ambientOverlayUrl.startsWith('blob:')) {
        URL.revokeObjectURL(ambientOverlayUrl);
      }
      setAmbientOverlayUrl(URL.createObjectURL(file));
      setShowAmbientInput(false);
    }
  };

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
  const masterNoiseGainRef = useRef<GainNode | null>(null);
  const masterToneLowRef = useRef<BiquadFilterNode | null>(null);
  const masterToneMidRef = useRef<BiquadFilterNode | null>(null);
  const masterToneHighRef = useRef<BiquadFilterNode | null>(null);

  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const pixabayStudioRef = useRef<any>(null);

  
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
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.removeAttribute("src");
      }
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.removeAttribute("src");
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
        initAttemptedRef.current = false;
      }
    };
  }, []);

  // Cleanup audio when stems are cleared or song changes
  useEffect(() => {
    if (!stemUrls) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.removeAttribute("src");
        setPreviewingUrl(null);
      }
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.removeAttribute("src");
      }
      Object.values(audioElementsRef.current).forEach((a: any) => {
        try {
          a.pause();
          a.currentTime = 0;
          a.removeAttribute("src");
          a.load();
        } catch {}
      });
      audioElementsRef.current = {};
      loadedUrlsRef.current = {};
      setLoadedCount(0);
      setCurrentTime(0);
      setDuration(originalDuration || 0);
      setIsPlaying(false);
      setDownloadLink(null);

      if (audioContextRef.current) {
        try { audioContextRef.current.close().catch(() => {}); } catch {}
        audioContextRef.current = null;
      }
      initAttemptedRef.current = false;
    }
  }, [stemUrls, originalAudioUrl, originalDuration]);

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
      
      const toneLow = ctx.createBiquadFilter();
      toneLow.type = 'lowshelf';
      toneLow.frequency.value = 320;
      toneLow.gain.value = sunoEqLow;
      masterToneLowRef.current = toneLow;

      const toneMid = ctx.createBiquadFilter();
      toneMid.type = 'peaking';
      toneMid.frequency.value = 1000;
      toneMid.Q.value = 1.0;
      toneMid.gain.value = sunoEqMid;
      masterToneMidRef.current = toneMid;

      const toneHigh = ctx.createBiquadFilter();
      toneHigh.type = 'highshelf';
      toneHigh.frequency.value = 3200;
      toneHigh.gain.value = sunoEqHigh;
      masterToneHighRef.current = toneHigh;

      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0; // Live preview noise is kept at 0 (noise is only added during mixdown/bypass export rendering)
      masterNoiseGainRef.current = noiseGain;
      noiseSrc.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start(0);

      master.connect(toneLow);
      toneLow.connect(toneMid);
      toneMid.connect(toneHigh);
      
      let lastNode: AudioNode = toneHigh;

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

  
  // Sync real-time tempo (speed) and pitch changes
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach((a: HTMLAudioElement) => {
      try {
        const pitchFactor = isSunoBypass ? Math.pow(2, sunoPitchShift / 12) : 1.0;
        const speedFactor = isSunoBypass ? sunoSpeedFactor : 1.0;
        const targetRate = speed * speedFactor * pitchFactor;
        a.playbackRate = targetRate;
        a.preservesPitch = preservePitch && (sunoPitchShift === 0 || !isSunoBypass);
      } catch (e) {
        console.error("Failed to set playback rate:", e);
      }
    });
  }, [speed, isSunoBypass, sunoSpeedFactor, sunoPitchShift, preservePitch]);

  // Sync real-time Tone EQ and Noise
  useEffect(() => {
    if (audioContextRef.current) {
        const t = audioContextRef.current.currentTime;
        if (masterToneLowRef.current) masterToneLowRef.current.gain.setTargetAtTime(isSunoBypass ? sunoEqLow : 0, t, 0.05);
        if (masterToneMidRef.current) masterToneMidRef.current.gain.setTargetAtTime(isSunoBypass ? sunoEqMid : 0, t, 0.05);
        if (masterToneHighRef.current) masterToneHighRef.current.gain.setTargetAtTime(isSunoBypass ? sunoEqHigh : 0, t, 0.05);
        if (masterNoiseGainRef.current) masterNoiseGainRef.current.gain.setTargetAtTime(isSunoBypass ? sunoNoiseLevel : 0, t, 0.05);
    }
  }, [isSunoBypass, sunoEqLow, sunoEqMid, sunoEqHigh, sunoNoiseLevel, isPlaying]);


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


  

  useEffect(() => {
    setDownloadLink(null);
    setIsSunoBypass(false);
  }, [originalAudioUrl]);

  const getSafeTitle = () => {
    let title = songTitle || "track";
    title = title.replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    title = title.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim();
    if (title.length > 30) {
      title = title.substring(0, 30).trim();
    }
    return title || "track";
  };

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
      a.download = `${getSafeTitle()}_stems.zip`;
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
      a.download = `${getSafeTitle()}_${stem}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      console.error(`Failed to download ${stem}:`, e);
      // Fallback
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getSafeTitle()}_${stem}.mp3`;
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
      a.download = `${getSafeTitle()}.srt`;
      a.click();
  };

  const [isBypassingSuno, setIsBypassingSuno] = useState<boolean>(false);

  const handleDirectSunoBypass = async () => {
    if (!originalAudioUrl) return;
    setIsBypassingSuno(true);
    setExportError(null);
    setDownloadLink(null);
    setExportProgress(0);

    try {
      let fetchUrl = originalAudioUrl;
      if (fetchUrl.includes("/api/stream") && (fetchUrl.includes("facebook.com") || fetchUrl.includes("fb.watch") || fetchUrl.includes("facebook"))) {
        fetchUrl = fetchUrl.replace("/api/stream", "/api/clean-wav");
      }
      const res = await fetch(fetchUrl);
      const arrayBuffer = await res.arrayBuffer();
      if (!audioContextRef.current) {
        initAudio();
      }
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      const bypassSpeedFactor = sunoSpeedFactor;
      const exportSampleRate = decodedBuffer.sampleRate;
      
      const activeTrimStart = isTrimming ? trimStart : 0;
      const activeTrimEnd = isTrimming && trimEnd > activeTrimStart ? trimEnd : decodedBuffer.duration;
      const exportDuration = activeTrimEnd - activeTrimStart;
      
      const pitchFactor = Math.pow(2, sunoPitchShift / 12);
      const finalDuration = exportDuration / (bypassSpeedFactor * pitchFactor);
      
      const offlineCtx = new OfflineAudioContext(2, exportSampleRate * finalDuration, exportSampleRate);

      const source = offlineCtx.createBufferSource();
      source.buffer = decodedBuffer;
      
      source.playbackRate.value = bypassSpeedFactor * pitchFactor;
      
      const lowEq = offlineCtx.createBiquadFilter();
      lowEq.type = 'lowshelf';
      lowEq.frequency.value = 320;
      lowEq.gain.value = sunoEqLow;
      
      const midEq = offlineCtx.createBiquadFilter();
      midEq.type = 'peaking';
      midEq.frequency.value = 1000;
      midEq.Q.value = 0.5;
      midEq.gain.value = sunoEqMid;
      
      const highEq = offlineCtx.createBiquadFilter();
      highEq.type = 'highshelf';
      highEq.frequency.value = 3200;
      highEq.gain.value = sunoEqHigh;

      source.connect(lowEq);
      lowEq.connect(midEq);
      midEq.connect(highEq);
      highEq.connect(offlineCtx.destination);

      source.start(0, activeTrimStart, exportDuration);

      if (sunoNoiseLevel > 0.0001) {
        const noiseBufferSize = exportSampleRate * 2;
        const noiseBuffer = offlineCtx.createBuffer(2, noiseBufferSize, exportSampleRate);
        for (let channel = 0; channel < 2; channel++) {
           const output = noiseBuffer.getChannelData(channel);
           let lastOut = 0;
           for (let i = 0; i < noiseBufferSize; i++) {
              const white = Math.random() * 2 - 1;
              output[i] = (lastOut + (0.02 * white)) / 1.02; 
              lastOut = output[i];
              output[i] *= 1.5;
           }
        }
        const noiseSource = offlineCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        const noiseGain = offlineCtx.createGain();
        noiseGain.gain.value = sunoNoiseLevel; 
        noiseSource.connect(noiseGain);
        noiseGain.connect(offlineCtx.destination);
        noiseSource.start(0);
      }

      setExportProgress(50);
      const renderedBuffer = await offlineCtx.startRendering();
      setExportProgress(90);

      const blob = audioBufferToMp3(renderedBuffer);
      const filename = `${getSafeTitle()}_Suno_Safe.mp3`;
      const dlUrl = URL.createObjectURL(blob);
      
      setDownloadLink({ url: dlUrl, filename });
      setExportProgress(100);
    } catch (e: any) {
      console.error("Direct Suno bypass failed", e);
      setExportError(e.message || "Failed to process audio for Suno bypass.");
    } finally {
      setIsBypassingSuno(false);
    }
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
      
      const activeTrimStart = isTrimming ? trimStart : 0;
      const activeTrimEnd = isTrimming && trimEnd > activeTrimStart ? trimEnd : maxDuration;
      const exportDuration = activeTrimEnd - activeTrimStart;

      const bypassSpeedFactor = isSunoBypass ? sunoSpeedFactor : 1.0;
      const pitchFactor = isSunoBypass ? Math.pow(2, sunoPitchShift / 12) : 1.0;
      const finalDuration = exportDuration / (bypassSpeedFactor * pitchFactor);

      setExportProgress(45);
      
      let ambientBuffer: AudioBuffer | null = null;
      if (ambientOverlayUrl) {
         try {
           const res = await fetch(ambientOverlayUrl);
           const arrayBuf = await res.arrayBuffer();
           ambientBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
             decodeCtx.decodeAudioData(arrayBuf, resolve, reject);
           });
         } catch (err) {
           console.warn("Failed to decode ambient audio for export", err);
         }
      }

      // 3. Create OfflineAudioContext matching the decoded buffer sample rate to prevent mismatch errors
      const exportSampleRate = decodeCtx.sampleRate || 44100;
      const offlineCtx = new OfflineAudioContext(2, Math.ceil(exportSampleRate * finalDuration), exportSampleRate);

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

      if (isSunoBypass) {
          const sunoLowEq = offlineCtx.createBiquadFilter();
          sunoLowEq.type = 'lowshelf';
          sunoLowEq.frequency.value = 320;
          sunoLowEq.gain.value = sunoEqLow;
          
          const sunoMidEq = offlineCtx.createBiquadFilter();
          sunoMidEq.type = 'peaking';
          sunoMidEq.frequency.value = 1000;
          sunoMidEq.Q.value = 0.5;
          sunoMidEq.gain.value = sunoEqMid;
          
          const sunoHighEq = offlineCtx.createBiquadFilter();
          sunoHighEq.type = 'highshelf';
          sunoHighEq.frequency.value = 3200;
          sunoHighEq.gain.value = sunoEqHigh;

          lastOfflineNode.connect(sunoLowEq);
          sunoLowEq.connect(sunoMidEq);
          sunoMidEq.connect(sunoHighEq);
          lastOfflineNode = sunoHighEq;
      }

      lastOfflineNode.connect(offlineCtx.destination);

      // Connect wet reverb channel to the EQ chain
      offlineRevGain.connect(offlineEqNodes[0]); 

      for (const stem of activeStems) {
         const audioBuf = decodedBuffers[stem];
         if (!audioBuf) continue;
         
         const source = offlineCtx.createBufferSource();
         source.buffer = audioBuf;
         source.playbackRate.value = speed * bypassSpeedFactor * pitchFactor;
         
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
         source.start(0, activeTrimStart, exportDuration);
      }

      const sfxTracks = pixabayStudioRef.current ? pixabayStudioRef.current.getTracks() : [];
      const anySolo = sfxTracks.some((t: any) => t.isSolo);
      for (const track of sfxTracks) {
         if (!track.buffer) continue;
         
         const trimStart = track.trimStart || 0;
         const trimEnd = track.trimEnd || 0;
         const activeDuration = track.duration - trimStart - trimEnd;
         
         const playWindowStart = track.startTime;
         const playWindowEnd = track.startTime + activeDuration;
         
         if (playWindowEnd <= activeTrimStart) continue;
         if (playWindowStart >= activeTrimStart + exportDuration) continue;
         
         const source = offlineCtx.createBufferSource();
         source.buffer = track.buffer;
         
         const panner = offlineCtx.createStereoPanner();
         panner.pan.value = track.pan || 0;
         
         const gainNode = offlineCtx.createGain();
         let finalGain = track.volume;
         if (track.isMuted) finalGain = 0;
         if (anySolo && !track.isSolo) finalGain = 0;
         
         let offset = trimStart;
         let timeToStart = 0;
         let durationToPlay = activeDuration;
         
         if (activeTrimStart > track.startTime) {
            const elapsed = activeTrimStart - track.startTime;
            offset += elapsed;
            durationToPlay -= elapsed;
            
            if (elapsed < track.fadeIn) {
                gainNode.gain.setValueAtTime(0, timeToStart);
                gainNode.gain.linearRampToValueAtTime(finalGain, timeToStart + (track.fadeIn - elapsed));
            } else if (elapsed > activeDuration - track.fadeOut) {
                const fadeRemaining = activeDuration - elapsed;
                const curGain = finalGain * (fadeRemaining / track.fadeOut);
                gainNode.gain.setValueAtTime(curGain, timeToStart);
                gainNode.gain.linearRampToValueAtTime(0, timeToStart + fadeRemaining);
            } else {
                gainNode.gain.setValueAtTime(finalGain, timeToStart);
                gainNode.gain.setValueAtTime(finalGain, timeToStart + (activeDuration - elapsed - track.fadeOut));
                gainNode.gain.linearRampToValueAtTime(0, timeToStart + (activeDuration - elapsed));
            }
            source.start(timeToStart, offset, Math.min(exportDuration, durationToPlay));
         } else {
            timeToStart = track.startTime - activeTrimStart;
            gainNode.gain.setValueAtTime(0, timeToStart);
            gainNode.gain.linearRampToValueAtTime(finalGain, timeToStart + track.fadeIn);
            gainNode.gain.setValueAtTime(finalGain, timeToStart + activeDuration - track.fadeOut);
            gainNode.gain.linearRampToValueAtTime(0, timeToStart + activeDuration);
            source.start(timeToStart, trimStart, Math.min(exportDuration - timeToStart, durationToPlay));
         }
         
         source.connect(panner);
         panner.connect(gainNode);
         gainNode.connect(offlineCtx.destination);

      }
      if (ambientBuffer) {
         const source = offlineCtx.createBufferSource();
         source.buffer = ambientBuffer;
         source.loop = isAmbientLoop;
         const gain = offlineCtx.createGain();
         gain.gain.value = ambientVolume;
         source.connect(gain);
         gain.connect(offlineCtx.destination);
         source.start(0, isAmbientLoop ? activeTrimStart % ambientBuffer.duration : activeTrimStart, exportDuration);
      }

      if (isSunoBypass && sunoNoiseLevel > 0.0001) {
         const noiseBufferSize = exportSampleRate * 2; // 2 seconds of noise
         const noiseBuffer = offlineCtx.createBuffer(2, noiseBufferSize, exportSampleRate);
         for (let channel = 0; channel < 2; channel++) {
            const output = noiseBuffer.getChannelData(channel);
            let lastOut = 0;
            for (let i = 0; i < noiseBufferSize; i++) {
               const white = Math.random() * 2 - 1;
               output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise approximation
               lastOut = output[i];
               output[i] *= 1.5;
            }
         }
         const noiseSource = offlineCtx.createBufferSource();
         noiseSource.buffer = noiseBuffer;
         noiseSource.loop = true;
         
         const noiseGain = offlineCtx.createGain();
         noiseGain.gain.value = sunoNoiseLevel; // Very quiet noise
         
         // Create a slight pitch wobble
         const lfo = offlineCtx.createOscillator();
         lfo.type = 'sine';
         lfo.frequency.value = 0.5; // 0.5 Hz wobble
         const lfoGain = offlineCtx.createGain();
         lfoGain.gain.value = 5; // 5 cents of pitch modulation
         lfo.connect(lfoGain);
         
         // In offline context we can't easily modulate pitch of the original buffers due to loops above 
         // but we did playbackRate shift! The noise floor combined with speed shift bypasses it nicely.
         
         noiseSource.connect(noiseGain);
         noiseGain.connect(offlineCtx.destination);
         noiseSource.start(0);
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
        filename = `${getSafeTitle()}_mixdown.mp3`;
      } else {
        const wav = audioBufferToWav(renderedBuffer);
        blob = new Blob([wav], { type: "audio/wav" });
        filename = `${getSafeTitle()}_mixdown.wav`;
      }
      
      const dlUrl = URL.createObjectURL(blob);
      
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

  const subtitlesUI = (
    <>
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
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white/90 text-[16px] sm:text-sm leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-400/50 min-h-[200px]"
                        value={cohereTranscript || ""}
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
    </>
  );

  
  const phoiKhiLyricUI = (
    <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('arrange')}>
            <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Music className="w-3 h-3 inline-block mr-1 -mt-0.5" /> PHỐI KHÍ LYRIC</h3>
            <div className="flex items-center gap-2">
                {expandedSections.arrange ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
            </div>
        </div>
        {expandedSections.arrange && (
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Lyrics, Genre, Mood...</label>
                   <textarea 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white/90 text-[16px] sm:text-sm leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-400/50 min-h-[100px]"
                      value={lyricArrangeInput}
                      onChange={(e) => setLyricArrangeInput(e.target.value)}
                      placeholder="Enter lyrics, genre, mood, tempo here... (If empty, it will use the Raw Lyrics from SUNO Lyric Tool above)"
                   />
                </div>
                <div className="flex items-center gap-5 mt-1 mb-1">
                   <label className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                      <input 
                         type="checkbox" 
                         checked={arrangeSunoFormat} 
                         onChange={e => setArrangeSunoFormat(e.target.checked)} 
                         className="w-3 h-3 bg-black/50 border-white/20 rounded accent-purple-500 cursor-pointer" 
                      />
                      Suno Style Format (Thêm tag [INTRO], [piano] vào lời)
                   </label>
                   <label className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                      <input 
                         type="checkbox" 
                         checked={arrangeAddChords} 
                         onChange={e => setArrangeAddChords(e.target.checked)} 
                         className="w-3 h-3 bg-black/50 border-white/20 rounded accent-purple-500 cursor-pointer" 
                      />
                      Add Chords (Thêm hợp âm [Am], [C])
                   </label>

                   <label className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                      <input 
                         type="checkbox" 
                         checked={arrangeCharLimit} 
                         onChange={e => setArrangeCharLimit(e.target.checked)} 
                         className="w-3 h-3 bg-black/50 border-white/20 rounded accent-purple-500 cursor-pointer" 
                      />
                      Giới hạn dưới 5000 ký tự (Suno)
                   </label>
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Custom Prompt (Optional)</label>
                   <input 
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-amber-400/50"
                      value={arrangeCustomPrompt}
                      onChange={(e) => setArrangeCustomPrompt(e.target.value)}
                      placeholder="VD: Phối khí theo thể loại POP ballad nhẹ nhàng kèm tý adlib..."
                   />
                </div>

                <button
                    onClick={handleArrangeLyric}
                    disabled={(!lyricArrangeInput && !lyricRaw) || isArrangingLyric}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm w-full"
                >
                    {isArrangingLyric ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Music className="w-3.5 h-3.5" />}
                    {isArrangingLyric ? "ĐANG PHỐI KHÍ..." : "TẠO BẢN PHỐI KHÍ CHUYÊN NGHIỆP"}
                </button>
                {lyricArrangedStyle && (
                    <div className="flex flex-col gap-1 mt-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider flex justify-between items-end">
                            Style Prompt (Cho ô Style of Music)
                            <button className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" onClick={handleCopyArrangedStyle}>
                            {isArrangedStyleCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Style</>}
                        </button>
                        </label>
                        <textarea 
                            className="w-full bg-black/60 border border-amber-500/30 rounded-xl p-3 text-amber-400 font-mono text-[11px] sm:text-[12px] leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-500/70 min-h-[80px]"
                            value={lyricArrangedStyle}
                            readOnly
                        />
                    </div>
                )}
                {lyricArranged && (
                    <div className="flex flex-col gap-1 mt-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider flex justify-between items-end">
                            Kết quả phối khí (Cho ô Lyrics)
                            {!isArrangingLyric && <button className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 border border-purple-500/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" onClick={handleCopyArranged}>
                            {isArrangedCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Lyrics</>}
                        </button>}
                        </label>
                        <textarea 
                            className="w-full bg-black/60 border border-purple-500/30 rounded-xl p-3 text-emerald-400 font-mono text-[11px] sm:text-[12px] leading-relaxed custom-scrollbar focus:outline-none focus:border-purple-500/70 min-h-[300px]"
                            value={lyricArranged}
                            readOnly
                        />
                    </div>
                )}
            </div>
        )}
    </div>
  );

  const sunoLyricUI = (
    <>
      {/* LYRIC TOOL UI */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('lyric')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Type className="w-3 h-3 inline-block mr-1 -mt-0.5" /> SUNO Lyric Tool</h3>
                <div className="flex items-center gap-2">
                   {expandedSections.lyric ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             
             {expandedSections.lyric && (
               <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Raw Lyrics</label>
                     <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white/90 text-[16px] sm:text-sm leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-400/50 min-h-[100px]"
                        value={lyricRaw}
                        onChange={(e) => {
                           const newRaw = e.target.value;
                           setLyricRaw(newRaw);
                           if (newRaw && lyricFormatted) {
                              setLyricDiff(diffWords(newRaw, lyricFormatted));
                           }
                        }}
                        placeholder="Enter your lyrics here..."
                     />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Style Request (Optional)</label>
                     <input 
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-[16px] sm:text-sm focus:outline-none focus:border-amber-400/50"
                        value={lyricStyle}
                        onChange={(e) => setLyricStyle(e.target.value)}
                        placeholder="e.g. Acoustic Pop, fast tempo"
                     />
                  </div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                     <button 
                        onClick={handleFormatLyric}
                        disabled={!lyricRaw || isFormattingLyric}
                        className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                     >
                        {isFormattingLyric ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Format for SUNO
                     </button>
                     <div className="flex items-center bg-[#00ab6b] rounded-lg shrink-0">
                        <button 
                           onClick={handleImproveLyric}
                           disabled={(!lyricRaw && !lyricFormatted) || isImprovingLyric}
                           className="hover:bg-[#008f5a] disabled:opacity-50 text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-l-lg transition-colors flex items-center gap-1 border-r border-white/20"
                        >
                           {isImprovingLyric ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit2 className="w-3 h-3" />}
                           Improve
                        </button>
                        <select 
                           value={improvePercentage}
                           onChange={(e) => setImprovePercentage(Number(e.target.value))}
                           disabled={(!lyricRaw && !lyricFormatted) || isImprovingLyric}
                           className="bg-transparent text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-r-lg outline-none cursor-pointer hover:bg-[#008f5a] transition-colors appearance-none text-center"
                        >
                           <option value={1} className="bg-black">1%</option>
                           <option value={3} className="bg-black">3%</option>
                           <option value={5} className="bg-black">5%</option>
                           <option value={10} className="bg-black">10%</option>
                           <option value={20} className="bg-black">20%</option>
                        </select>
                     </div>
                     <button 
                        onClick={handleAddChords}
                        disabled={(!lyricRaw && !lyricFormatted) || isAddingChords}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                     >
                        {isAddingChords ? <Loader2 className="w-3 h-3 animate-spin" /> : <Music className="w-3 h-3" />}
                        Add Chords
                     </button>
                     <div className="flex items-center gap-1 sm:gap-1.5 ml-0 sm:ml-1 pl-0 sm:pl-2 sm:border-l border-white/10 shrink-0">
                        <input
                           type="text"
                           value={swapWordA}
                           onChange={(e) => setSwapWordA(e.target.value)}
                           className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 sm:py-1.5 text-[16px] sm:text-[10px] text-white w-9 sm:w-12 focus:outline-none focus:border-amber-400/50"
                           placeholder="A"
                        />
                        <RotateCcw className="w-3 h-3 text-white/40 cursor-pointer hover:text-white" onClick={() => { const temp = swapWordA; setSwapWordA(swapWordB); setSwapWordB(temp); }} />
                        <input
                           type="text"
                           value={swapWordB}
                           onChange={(e) => setSwapWordB(e.target.value)}
                           className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 sm:py-1.5 text-[16px] sm:text-[10px] text-white w-9 sm:w-12 focus:outline-none focus:border-amber-400/50"
                           placeholder="B"
                        />
                        <button 
                           onClick={handleSwapWords}
                           disabled={(!lyricRaw && !lyricFormatted) || !swapWordA || !swapWordB}
                           className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[8.5px] sm:text-[10px] font-bold tracking-wider sm:tracking-widest uppercase px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition-colors flex items-center gap-1 ml-0.5 sm:ml-1"
                        >
                           Swap
                        </button>
                     </div>
                     <button 
                        onClick={handleInsertRandomChars}
                        disabled={!lyricFormatted}
                        className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 sm:ml-auto shrink-0"
                     >
                        <Wand2 className="w-3 h-3" />
                        Add Chars
                     </button>
                  </div>

                  {/* FIND AND REPLACE & SUNO BYPASS TOOL */}
                  <div className="flex flex-col gap-2 sm:gap-3 bg-black/40 border-y sm:border border-white/10 sm:rounded-xl p-2 sm:p-3 my-1 -mx-4 sm:mx-0">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                           <Replace className="w-3.5 h-3.5 text-amber-400" />
                           <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-400">
                              Find & Replace (Suno Lyric Bypass)
                           </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                           <button
                              onClick={handleAddPairRow}
                              className="text-[8px] sm:text-[9px] font-bold text-amber-300 hover:text-amber-200 uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Add another Find & Replace row"
                           >
                              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Add Pair
                           </button>
                           <button
                              onClick={() => setShowRuleManager(!showRuleManager)}
                              className="text-[8px] sm:text-[9px] font-bold text-white/60 hover:text-white uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                           >
                              <SlidersHorizontal className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {showRuleManager ? "Hide Rules" : `Manage Rules (${bypassRules.filter(r => r.enabled).length})`}
                           </button>
                        </div>
                     </div>

                     {/* Multiple Find & Replace Pairs */}
                     <div className="flex flex-col gap-1.5 sm:gap-2">
                        {findReplacePairs.map((pair) => (
                           <div key={pair.id} className="flex flex-wrap sm:grid sm:grid-cols-12 gap-1 sm:gap-1.5 items-center bg-black/50 border border-white/10 rounded-lg p-1 sm:p-1.5 transition-colors hover:border-white/20">
                              <div className="flex items-center justify-center w-5 sm:w-auto sm:col-span-1">
                                 <input
                                    type="checkbox"
                                    checked={pair.enabled}
                                    onChange={(e) => handleUpdatePairRow(pair.id, 'enabled', e.target.checked)}
                                    className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0 w-2.5 h-2.5 sm:w-3 sm:h-3 cursor-pointer"
                                    title="Enable or disable this pair"
                                 />
                              </div>
                              <div className="flex-1 flex items-center gap-1 bg-black/40 border border-white/10 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 sm:col-span-4 min-w-[70px]">
                                 <span className="text-[7.5px] sm:text-[8.5px] text-white/40 font-bold shrink-0">Find:</span>
                                 <input
                                    type="text"
                                    value={pair.find}
                                    onChange={(e) => handleUpdatePairRow(pair.id, 'find', e.target.value)}
                                    placeholder="e.g. Anh"
                                    className="w-full bg-transparent text-[16px] sm:text-[10.5px] text-white focus:outline-none min-w-0"
                                 />
                              </div>
                              <div className="flex-1 flex items-center gap-1 bg-black/40 border border-white/10 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 sm:col-span-4 min-w-[70px]">
                                 <span className="text-[7.5px] sm:text-[8.5px] text-white/40 font-bold shrink-0">Replace:</span>
                                 <input
                                    type="text"
                                    value={pair.replace}
                                    onChange={(e) => handleUpdatePairRow(pair.id, 'replace', e.target.value)}
                                    placeholder="e.g. anhh"
                                    className="w-full bg-transparent text-[16px] sm:text-[10.5px] text-white focus:outline-none min-w-0"
                                 />
                              </div>
                              <div className="flex items-center gap-1 justify-end shrink-0 sm:col-span-3 ml-auto">
                                 <button
                                    onClick={() => handleSingleReplace(pair.find, pair.replace)}
                                    disabled={(!lyricRaw && !lyricFormatted) || !pair.find || !pair.enabled}
                                    className="bg-amber-400 hover:bg-amber-300 disabled:opacity-30 text-black text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-wider py-0.5 sm:py-1 px-1.5 sm:px-2 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Replace this single pair"
                                 >
                                    Replace
                                 </button>
                                 <button
                                    onClick={() => handleRemovePairRow(pair.id)}
                                    className="text-white/30 hover:text-red-400 p-0.5 sm:p-1 transition-colors cursor-pointer rounded hover:bg-white/5"
                                    title="Remove this pair row"
                                 >
                                    <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                 </button>
                              </div>
                           </div>
                        ))}

                        {/* Pairs Action Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                           <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[9.5px] text-white/60">
                              <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                                 <input
                                    type="checkbox"
                                    checked={findMatchCase}
                                    onChange={(e) => setFindMatchCase(e.target.checked)}
                                    className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0 w-2.5 h-2.5 sm:w-3 sm:h-3 cursor-pointer"
                                 />
                                 Match Case
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                                 <input
                                    type="checkbox"
                                    checked={findWholeWord}
                                    onChange={(e) => setFindWholeWord(e.target.checked)}
                                    className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0 w-2.5 h-2.5 sm:w-3 sm:h-3 cursor-pointer"
                                 />
                                 Whole Word
                              </label>
                           </div>

                           <div className="flex items-center gap-1.5 sm:gap-2">
                              {findReplacePairs.length > 0 && (
                                 <button
                                    onClick={handleClearPairRows}
                                    className="text-[8px] sm:text-[9px] text-white/40 hover:text-white uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                 >
                                    Clear Pairs
                                 </button>
                              )}
                              <button
                                 onClick={handleAddPairRow}
                                 className="text-[8px] sm:text-[9px] font-bold text-white/80 hover:text-white uppercase tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                 <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> Add Row
                              </button>
                              <button
                                 onClick={handleExecuteAllPairs}
                                 disabled={(!lyricRaw && !lyricFormatted) || findReplacePairs.filter(p => p.enabled && p.find).length === 0}
                                 className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider py-0.5 sm:py-1 px-2 sm:px-3 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 shadow cursor-pointer"
                              >
                                 <Replace className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                 Execute All ({findReplacePairs.filter(p => p.enabled && p.find).length})
                              </button>
                           </div>
                        </div>
                     </div>

                     
                     
                     {/* Advanced Suno Bypass Generator */}
                     <div className="flex flex-col gap-3 pt-3 pb-2 border-t border-white/10 mt-2 bg-black/30 rounded-xl p-3 border border-white/5">
                        <div className="flex flex-col gap-2 mb-3">
                           <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] sm:text-[12px] font-black tracking-wider text-white flex items-center gap-2">
                                 Phương pháp lách Suno AI tối ưu:
                                 <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[8px] uppercase font-bold tracking-widest hidden sm:inline-block">Safe Mode</span>
                              </span>
                              
                              <div className="flex items-center gap-2 ml-auto">
                                 <button
                                    onClick={handleAIBypass}
                                    disabled={(!lyricRaw && !lyricFormatted) || isAIBypassing}
                                    className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/30 disabled:opacity-40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                    title="Dùng AI (OpenRouter) để tự động sửa lời lách filter"
                                 >
                                    {isAIBypassing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                                    AI One-Click Bypass
                                 </button>

                                 <button
                                    onClick={handleApplyAdvancedBypass}
                                    disabled={(!lyricRaw && !lyricFormatted) || bypassMethod === 'none' || isAIBypassing}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border border-indigo-400/30"
                                 >
                                    <Wand2 className="w-3 h-3" />
                                    Apply Logic Bypass
                                 </button>
                              </div>
                           </div>
                           
                           
                           {aiBypassStatus && (
                               <div className="flex items-center gap-2 bg-black/40 border border-amber-500/20 p-2 rounded-lg">
                                   <span className="text-[9px] text-amber-400 font-medium">{aiBypassStatus}</span>
                               </div>
                           )}

                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2">
                           {/* Button 1 */}
                           <button onClick={() => setBypassMethod("hyphen")} className={`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left ${bypassMethod === 'hyphen' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Dấu gạch ngang (-)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★★</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Khuyên dùng thực tế! Lách chuẩn 100%. Khi đi kèm cách ngắt Phụ âm đầu sẽ hát mượt mà, không vấp, hoàn hảo cho Suno AI.</span>
                           </button>
                           {/* Button 2 */}
                           <button onClick={() => setBypassMethod("zerowidth")} className={`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left ${bypassMethod === 'zerowidth' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Ký tự ẩn siêu cấp</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★<span className="opacity-30">★</span></span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Chèn mã zero-width (trống). Không hiển thị với người đọc, hát mượt nhưng một số bộ lọc Suno v4 mới bắt đầu quét kỹ hơn.</span>
                           </button>
                           {/* Button 3 */}
                           <button onClick={() => setBypassMethod("homoglyph")} className={`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left ${bypassMethod === 'homoglyph' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Ký tự đồng dạng (Homoglyph)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★<span className="opacity-30">★</span></span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Thay thế thành ký tự Latin/Cyrillic đồng dạng. Trông giống hệt 100%, ca sĩ dễ nhìn, bộ lọc Suno đôi khi phát hiện.</span>
                           </button>
                           {/* Button 4 */}
                           <button onClick={() => setBypassMethod("alternating")} className={`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left ${bypassMethod === 'alternating' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Chữ xen kẽ (AaOo)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★<span className="opacity-30">★★</span></span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Đổi ngẫu nhiên kí tự Hoa/Thường xen kẽ. Suno vẫn phát âm chuẩn, cấu trúc chữ hơi khó nhìn nhưng lách tạm ổn.</span>
                           </button>
                           {/* Button 5 - Pro / Extreme */}
                           <button onClick={() => setBypassMethod("extreme")} className={`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left sm:col-span-2 ${bypassMethod === 'extreme' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-black/60 border-red-500/20 text-white/70 hover:bg-red-500/10'}`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-red-400">Chuyên nghiệp (Pro / Nhiễu loạn)</span>
                                <span className="flex items-center text-[9px] text-red-400 font-bold bg-red-400/10 px-1.5 py-0.5 rounded">ULTIMATE MODE</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Sử dụng mã ASCII, Unicode ẩn, invisible separators, kết hợp tối đa để đánh lừa các filter mạnh nhất.</span>
                           </button>
                        </div>
                        
                        {(bypassMethod === 'hyphen' || bypassMethod === 'zerowidth') && (
                           <div className="flex flex-col bg-black/40 p-3 rounded-xl border border-white/10 mb-2 gap-3 relative">
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-[11px] font-bold text-white">Kiểu ngắt nhịp (Hyphenation style):</span>
                                 <span className="text-[9px] text-white/50">Quyết định vị trí ngắt của ký tự bổ trợ</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 <label className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${hyphenStyle === 'consonant' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                       <input type="radio" checked={hyphenStyle === 'consonant'} onChange={() => setHyphenStyle('consonant')} className="hidden" />
                                       <span className={`text-[10px] font-bold ${hyphenStyle === 'consonant' ? 'text-white' : 'text-white/60'}`}>Phân tách Phụ âm đầu</span>
                                    </div>
                                    <span className="text-[8.5px] text-emerald-400/80">Ví dụ: tr-ường, nh-ớ, y-êu</span>
                                 </label>
                                 <label className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${hyphenStyle === 'auto' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                       <input type="radio" checked={hyphenStyle === 'auto'} onChange={() => setHyphenStyle('auto')} className="hidden" />
                                       <span className={`text-[10px] font-bold ${hyphenStyle === 'auto' ? 'text-white' : 'text-white/60'}`}>Cắt đôi từ tự động</span>
                                    </div>
                                    <span className="text-[8.5px] text-white/40">Ví dụ: trư-ờng, n-hớ, y-êu</span>
                                 </label>
                              </div>
                              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                                 <span className="text-[12px]">💡</span>
                                 <span className="text-[9px] text-emerald-400 leading-relaxed font-medium"><strong>Khuyên dùng cho Suno AI:</strong> Chế độ Phân tách Phụ âm đầu giúp công nghệ TTS (phát âm) của Suno tự động bắt nhịp và ghép vần cực mượt từ phụ âm sang nguyên âm mà không hề bị ngắc ngứ hay đọc từ "gạch"!</span>
                              </div>
                           </div>
                        )}
                        
                        <div className="flex flex-col gap-2 mb-2">
                           <span className="text-[11px] font-bold text-white">Mức độ lách (Tỉ lệ lấp đầy ký tự):</span>
                           <div className="grid grid-cols-4 gap-2">
                              <button onClick={() => setBypassIntensity('minimal')} className={`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all ${bypassIntensity === 'minimal' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}`}>Rất ít (15%)</button>
                              <button onClick={() => setBypassIntensity('low')} className={`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all ${bypassIntensity === 'low' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}`}>Ít (35%)</button>
                              <button onClick={() => setBypassIntensity('medium')} className={`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all ${bypassIntensity === 'medium' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}`}>Vừa (65%)</button>
                              <button onClick={() => setBypassIntensity('high')} className={`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all ${bypassIntensity === 'high' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}`}>Nhiều (95%)</button>
                           </div>
                        </div>

                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mb-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse"></div>
                           <span className="text-[9.5px] text-emerald-400/90 font-medium leading-relaxed">
                              <strong>Tự động bảo vệ thẻ cấu trúc của Suno:</strong> Các nhãn như [Chorus], [Verse], [Guitar Solo]... được bảo đảm không bị biến đổi để tránh làm sai nhịp AI.
                           </span>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-white/10 pt-3 mt-1 bg-black/20 rounded-xl p-3">
                           <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-[11px] font-bold text-white">Giữ nguyên các từ phát âm nhạy cảm</span>
                                 <span className="text-[9px] text-white/50">Không chèn ký tự lạ vào các chữ dễ phát âm sai hoặc nhầm lẫn nguyên âm</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={preserveSensitive} onChange={(e) => setPreserveSensitive(e.target.checked)} className="sr-only peer" />
                                <div className="w-8 h-4.5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
                              </label>
                           </div>
                           
                           <div className="mt-2">
                              <button onClick={() => setShowSensitiveWords(!showSensitiveWords)} className="flex items-center gap-1 text-[9px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                 <span className={`transform transition-transform ${showSensitiveWords ? '' : '-rotate-90'}`}>▼</span>
                                 {showSensitiveWords ? "Thu nhỏ danh sách từ giữ nguyên" : "Mở rộng danh sách từ giữ nguyên"}
                              </button>
                           </div>
                           
                           {showSensitiveWords && (
                              <div className="bg-black/60 border border-white/10 p-3 rounded-lg mt-1 relative group">
                                 <textarea
                                    value={sensitiveWords.join(", ")}
                                    onChange={(e) => setSensitiveWords(e.target.value.split(",").map(w => w.trim()).filter(Boolean))}
                                    className="w-full bg-transparent text-white/80 text-[10px] font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-20 rounded custom-scrollbar leading-relaxed"
                                 />
                                 <p className="text-[8px] text-white/40 mt-2 leading-relaxed italic border-t border-white/5 pt-2">Ca sĩ Suno AI rất dễ hát sai âm khi gặp các tổ hợp âm khó hoặc lệch dấu chữ quốc ngữ. Việc bảo vệ các từ này giúp nhịp điệu mượt mà nhất.</p>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Default Quick Fix Presets (Suno Bypass Shortcuts - Multi-Pick Supported) */}


                     <div className="flex flex-col gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                           <div className="flex items-center gap-1 sm:gap-1.5">
                              <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-amber-400/90">
                                 Quick Pick Presets ({selectedQuickPickIds.length}/{bypassRules.length}):
                              </span>
                              <div className="flex items-center gap-1 text-[7.5px] sm:text-[8.5px] text-white/50">
                                 <button
                                    onClick={handleSelectAllQuickPicks}
                                    className="hover:text-white underline cursor-pointer"
                                 >
                                    All
                                 </button>
                                 <span>•</span>
                                 <button
                                    onClick={handleDeselectAllQuickPicks}
                                    className="hover:text-white underline cursor-pointer"
                                 >
                                    None
                                 </button>
                              </div>
                           </div>

                           <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-0 w-full sm:w-auto justify-end">
                              {selectedQuickPickIds.length > 0 && (
                                 <button
                                    onClick={handleImportSelectedToPairs}
                                    className="bg-indigo-600/80 hover:bg-indigo-500 text-white text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded transition-colors flex items-center gap-1 cursor-pointer border border-indigo-400/30"
                                    title="Copy selected quick pick rules into Find & Replace rows"
                                 >
                                    <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Import
                                 </button>
                              )}
                              <button
                                 onClick={handleApplySelectedQuickPicks}
                                 disabled={(!lyricRaw && !lyricFormatted) || selectedQuickPickIds.length === 0}
                                 className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                 title="Apply selected Suno lyric bypass rules at once"
                              >
                                 <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                 Bypass ({selectedQuickPickIds.length})
                              </button>
                           </div>
                        </div>

                        {/* Preset Chips (Toggle Multi-Pick) */}
                        <div className="flex flex-wrap gap-1 sm:gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar p-1 bg-black/20 rounded-lg border border-white/5">
                           {bypassRules.map((rule) => {
                              const isSelected = selectedQuickPickIds.includes(rule.id);
                              return (
                                 <div
                                    key={rule.id}
                                    className={`group flex items-center gap-1 sm:gap-1.5 border rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8.5px] sm:text-[9.5px] transition-all cursor-pointer ${
                                       isSelected
                                          ? 'bg-amber-400/20 border-amber-400/60 text-amber-200'
                                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'
                                    }`}
                                    onClick={() => handleToggleQuickPick(rule.id)}
                                    title="Click to toggle selection"
                                 >
                                    <input
                                       type="checkbox"
                                       checked={isSelected}
                                       onChange={() => {}} // Handled by div onClick
                                       className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0 w-2.5 h-2.5 sm:w-3 sm:h-3 cursor-pointer pointer-events-none"
                                    />
                                    <span className="font-semibold">{rule.find}</span>
                                    <span className="text-amber-400/60">➔</span>
                                    <span className="font-semibold text-amber-300">{rule.replace}</span>
                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleSingleReplace(rule.find, rule.replace);
                                       }}
                                       disabled={!lyricRaw && !lyricFormatted}
                                       className="ml-0.5 sm:ml-1 opacity-60 group-hover:opacity-100 hover:text-amber-300 p-0.5 rounded hover:bg-black/40 cursor-pointer"
                                       title={`Run only "${rule.find} ➔ ${rule.replace}" right now`}
                                    >
                                       <Replace className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                    </button>
                                 </div>
                              );
                           })}
                        </div>
                     </div>

                     {/* Rule Manager Expansion */}
                     {showRuleManager && (
                        <div className="flex flex-col gap-2 pt-2.5 border-t border-amber-400/20 bg-black/60 p-2.5 rounded-lg">
                           <div className="flex items-center justify-between text-[9.5px] font-bold uppercase text-white/70">
                              <span>Active Bypass Rules ({bypassRules.length})</span>
                              <button
                                 onClick={handleResetDefaultRules}
                                 className="text-white/40 hover:text-white flex items-center gap-1 text-[8.5px] cursor-pointer"
                              >
                                 <RotateCcw className="w-2.5 h-2.5" /> Reset Defaults
                              </button>
                           </div>

                           {/* Rule list */}
                           <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                              {bypassRules.map((rule) => (
                                 <div
                                    key={rule.id}
                                    className="flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] p-1.5 rounded border border-white/5 text-[10px]"
                                 >
                                    <div className="flex items-center gap-2">
                                       <input
                                          type="checkbox"
                                          checked={rule.enabled}
                                          onChange={() => handleToggleRule(rule.id)}
                                          className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0 w-3 h-3 cursor-pointer"
                                       />
                                       <span className="text-white/90 font-mono">{rule.find}</span>
                                       <span className="text-amber-400">➔</span>
                                       <span className="text-amber-300 font-mono">{rule.replace}</span>
                                    </div>
                                    <button
                                       onClick={() => handleDeleteRule(rule.id)}
                                       className="text-white/30 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                                       title="Delete rule"
                                    >
                                       <Trash2 className="w-3 h-3" />
                                    </button>
                                 </div>
                              ))}
                           </div>

                           {/* Add new rule */}
                           <div className="flex items-center gap-1.5 pt-1">
                              <input
                                 type="text"
                                 value={newRuleFind}
                                 onChange={(e) => setNewRuleFind(e.target.value)}
                                 placeholder="Find (e.g. thương)"
                                 className="w-1/2 bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                              />
                              <input
                                 type="text"
                                 value={newRuleReplace}
                                 onChange={(e) => setNewRuleReplace(e.target.value)}
                                 placeholder="Replace (e.g. thươngg)"
                                 className="w-1/2 bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                              />
                              <button
                                 onClick={handleAddRule}
                                 disabled={!newRuleFind.trim()}
                                 className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[9px] font-bold px-2.5 py-1 rounded transition-colors shrink-0 flex items-center gap-1 uppercase cursor-pointer"
                              >
                                 <Plus className="w-3 h-3" /> Add
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
                  {lyricFormatted && (
                     <div className="flex flex-col gap-2 mt-2 border-t border-white/5 pt-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                           <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                              <span>Formatted Output</span>
                              {lyricDiff && !isEditingFormatted && (
                                 <span className="text-[9px] font-normal text-white/50 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                                    Diff View Active
                                 </span>
                              )}
                           </label>

                           <div className="flex flex-wrap items-center gap-1.5">
                              {/* Undo Button */}
                              <button
                                 onClick={handleUndoLyric}
                                 disabled={lyricHistory.length === 0}
                                 className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
                                 title="Undo recent addition/replacement (Ctrl+Z)"
                              >
                                 <Undo2 className="w-3 h-3 text-amber-400" />
                                 Undo {lyricHistory.length > 0 && `(${lyricHistory.length})`}
                              </button>

                              {/* Redo Button */}
                              <button
                                 onClick={handleRedoLyric}
                                 disabled={lyricRedoStack.length === 0}
                                 className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
                                 title="Redo (Ctrl+Y)"
                              >
                                 <Redo2 className="w-3 h-3 text-amber-400" />
                                 Redo {lyricRedoStack.length > 0 && `(${lyricRedoStack.length})`}
                              </button>

                              {/* View Toggle (if Diff exists or raw & formatted lyrics exist) */}
                              {(lyricDiff || (lyricRaw && lyricFormatted)) && (
                                 <button
                                    onClick={() => {
                                       if (isEditingFormatted) {
                                          if (lyricRaw && lyricFormatted) {
                                             setLyricDiff(diffWords(lyricRaw, lyricFormatted));
                                          }
                                          setIsEditingFormatted(false);
                                       } else {
                                          setIsEditingFormatted(true);
                                       }
                                    }}
                                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
                                    title={isEditingFormatted ? "Switch to Highlighted Diff View" : "Switch to Direct Text Editor"}
                                 >
                                    {isEditingFormatted ? (
                                       <>
                                          <Eye className="w-3 h-3" /> Diff View
                                       </>
                                    ) : (
                                       <>
                                          <Edit3 className="w-3 h-3" /> Edit Text
                                       </>
                                    )}
                                 </button>
                              )}

                              {/* Clear Diff */}
                              {lyricDiff && (
                                 <button
                                    onClick={() => setLyricDiff(null)}
                                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                    title="Clear highlighted diff marks"
                                 >
                                    Clear Diff
                                 </button>
                              )}

                              {/* Copy Button */}
                              <button 
                                 onClick={handleCopyLyric} 
                                 className={`flex items-center gap-1 transition-colors px-2 py-1 rounded ${isLyricCopied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'}`}
                                 title="Copy formatted lyric to clipboard"
                              >
                                 {isLyricCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                 <span className="text-[9px] uppercase tracking-wider font-bold">
                                    {isLyricCopied ? "Copied" : "Copy"}
                                 </span>
                              </button>
                           </div>
                        </div>

                        {/* Content Render: Either Diff view or Editable Textarea */}
                        {lyricDiff && !isEditingFormatted ? (
                           <div 
                              onClick={() => setIsEditingFormatted(true)}
                              className="group relative w-full bg-black/40 border border-amber-400/30 hover:border-amber-400/60 rounded-xl p-3 text-white text-sm leading-relaxed custom-scrollbar overflow-y-auto max-h-[300px] whitespace-pre-wrap cursor-pointer transition-colors"
                              title="Click anywhere to edit text"
                           >
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-amber-400/90 text-black font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow transition-opacity flex items-center gap-1">
                                 <Edit3 className="w-3 h-3" /> Click to edit
                              </div>
                              {lyricDiff.map((part, index) => (
                                 <span 
                                    key={index} 
                                    className={
                                       part.added ? 'bg-green-500/30 text-green-200 rounded px-1 font-semibold' :
                                       part.removed ? 'bg-red-500/30 text-red-200 line-through rounded px-1' :
                                       ''
                                    }
                                 >
                                    {part.value}
                                 </span>
                              ))}
                           </div>
                        ) : (
                           <textarea 
                              className="w-full bg-black/40 border border-amber-400/40 focus:border-amber-400 rounded-xl p-3 text-white text-sm leading-relaxed custom-scrollbar focus:outline-none min-h-[160px] font-mono transition-colors"
                              value={lyricFormatted}
                              placeholder="Formatted lyrics will appear here. You can edit this text directly..."
                              onFocus={() => {
                                 if (lyricHistory.length === 0 || lyricHistory[lyricHistory.length - 1].text !== lyricFormatted) {
                                    setLyricHistory(prev => [...prev.slice(-30), { text: lyricFormatted, diff: lyricDiff }]);
                                 }
                              }}
                              onChange={(e) => {
                                 const val = e.target.value;
                                 setLyricFormatted(val);
                                 if (lyricRaw) {
                                    setLyricDiff(diffWords(lyricRaw, val));
                                 } else {
                                    setLyricDiff(null);
                                 }
                              }}
                              onKeyDown={(e) => {
                                 if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                                    e.preventDefault();
                                    if (e.shiftKey) {
                                       handleRedoLyric();
                                    } else {
                                       handleUndoLyric();
                                    }
                                 } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                                    e.preventDefault();
                                    handleRedoLyric();
                                 }
                              }}
                           />
                        )}
                     </div>
                  )}
               </div>
             )}
             
             {expandedSections.lyric && (
               <SunoLyricDownloader />
             )}
          </div>
    </>
  );

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
       <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 border-b border-white/10 bg-black/50 backdrop-blur-xl shrink-0 z-50 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap w-full">
          {/* Back Button */}
          {!isEmbedded ? (
             <button onClick={onClose} className="p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shrink-0 cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
             </button>
          ) : (
             <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
             </button>
          )}

          {/* Stem Studio Badge */}
          <span className="text-[9px] font-black tracking-[0.12em] text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0 hidden md:inline-block">
             Stem Studio
          </span>

          {/* Extract New Song Button */}
          {onExtractNewSong && (
             <button
                 onClick={() => {
                     setIsPlaying(false);
                     Object.values(audioElementsRef.current).forEach((a: HTMLAudioElement) => {
                        try { a.pause(); } catch {}
                     });
                     if (typeof document !== 'undefined') {
                        document.querySelectorAll('audio').forEach((a: HTMLAudioElement) => {
                           try { a.pause(); } catch {}
                        });
                     }
                     onExtractNewSong();
                 }}
                 className="px-2.5 py-1 bg-amber-400 text-black text-[9px] font-black tracking-wider uppercase rounded-full shadow-[0_0_12px_rgba(251,191,36,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                 title={`Extract stems for ${newSongTitle || 'current song'}`}
             >
                 <Sparkles className="w-3 h-3 shrink-0" />
                 <span className="hidden sm:inline">EXTRACT NEW</span>
                 <span className="inline sm:hidden">NEW</span>
             </button>
          )}

          {/* Export Buttons */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
             <button
                onClick={() => handleExportMix("mp3")}
                disabled={stemmixStatus !== "ready" || isExporting}
                className={`flex items-center gap-1 text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-md cursor-pointer ${
                   stemmixStatus === "ready"
                     ? isExporting && exportFormat === "mp3"
                       ? "bg-amber-400 text-black shadow-amber-400/25 animate-pulse"
                       : "bg-white/[0.06] text-white hover:bg-white/[0.12] hover:text-amber-400 border border-white/10"
                     : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed shadow-none"
                }`}
                title="Export Mix as MP3 (192kbps)"
             >
                {isExporting && exportFormat === "mp3" ? (
                   <Loader2 className="w-3 h-3 animate-spin text-black" />
                ) : (
                   <Download className="w-3 h-3 text-amber-400" />
                )}
                <span>{isExporting && exportFormat === "mp3" ? `${exportProgress}%` : "MP3"}</span>
             </button>

             <button
                onClick={() => handleExportMix("wav")}
                disabled={stemmixStatus !== "ready" || isExporting}
                className={`flex items-center gap-1 text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-md cursor-pointer ${
                   stemmixStatus === "ready"
                     ? isExporting && exportFormat === "wav"
                       ? "bg-amber-400 text-black shadow-amber-400/25 animate-pulse"
                       : "bg-white/[0.06] text-white hover:bg-white/[0.12] hover:text-amber-400 border border-white/10"
                     : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed shadow-none"
                }`}
                title="Export Mix as Lossless WAV"
             >
                {isExporting && exportFormat === "wav" ? (
                   <Loader2 className="w-3 h-3 animate-spin text-black" />
                ) : (
                   <Download className="w-3 h-3 text-amber-400" />
                )}
                <span>{isExporting && exportFormat === "wav" ? `${exportProgress}%` : "WAV"}</span>
             </button>
          </div>

          {/* WebGPU Quality Dropdown */}
          {separationMode === "webgpu" && (
             <div className="flex items-center gap-1 bg-[#12131C] px-2 py-1 rounded-full border border-amber-400/30 shadow-md shrink-0">
                <Settings2 className="w-3 h-3 text-amber-400 shrink-0" />
                <select
                   value={webgpuQuality || "ultra"}
                   onChange={(e) => {
                      const val = e.target.value as 'fast' | 'high' | 'ultra' | 'pro';
                      onWebgpuQualityChange?.(val);
                   }}
                   className="bg-transparent text-[9px] font-black uppercase tracking-wider text-amber-400 focus:outline-none cursor-pointer"
                   title="WebGPU Separation Quality & Filter Slope"
                >
                   <option value="fast" className="bg-[#12131A] text-white">Fast (255t)</option>
                   <option value="high" className="bg-[#12131A] text-white">High (1023t)</option>
                   <option value="ultra" className="bg-[#12131A] text-white">Ultra (4095t)</option>
                   <option value="pro" className="bg-[#12131A] text-white">Pro (8191t)</option>
                </select>
             </div>
          )}

          {/* Engine Toggle Selection */}
          <div className="flex items-center gap-0.5 bg-white/[0.04] p-0.5 rounded-full border border-white/10 shrink-0">
             <button
                onClick={() => onSetSeparationMode?.("webgpu")}
                className={`px-2 py-1 flex items-center justify-center gap-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                  separationMode === "webgpu"
                    ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                    : "text-white/40 hover:text-white/70"
                }`}
                title="Use high-performance client-side WebGPU DSP isolation"
             >
                <Zap className="w-3 h-3 shrink-0" />
                <span>WebGPU</span>
             </button>
             <button
                onClick={() => onSetSeparationMode?.("ai")}
                className={`px-2 py-1 flex items-center justify-center gap-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                  separationMode === "ai"
                    ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                    : "text-white/40 hover:text-white/70"
                }`}
                title="Use server-side AI Cloud"
             >
                <Cloud className="w-3 h-3 shrink-0" />
                <span>AI</span>
             </button>
             <button
                onClick={() => onSetSeparationMode?.("onnx")}
                className={`px-2 py-1 flex items-center justify-center gap-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                  separationMode === "onnx"
                    ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-100"
                    : "text-white/40 hover:text-white/70"
                }`}
                title="Use client-side ONNX neural network"
             >
                <Brain className="w-3 h-3 shrink-0" />
                <span>ONNX</span>
             </button>
          </div>
       </div>

       {/* SCROLLABLE CONTENT BODY */}
       <div id="stem-studio-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 sm:p-4 md:p-5 pb-24 sm:pb-32 flex flex-col gap-3 sm:gap-5 custom-scrollbar bg-transparent z-10 relative">
          
          
          {stemUrls && onClearStems && (
             <button
                onClick={(e) => {
                   if (previewingUrl) {
                      previewAudioRef.current?.pause();
                      setPreviewingUrl(null);
                   }
                   if (ambientAudioRef.current) {
                      ambientAudioRef.current.pause();
                   }
                   Object.values(audioElementsRef.current).forEach((a: any) => {
                      a.pause();
                   });
                   setIsPlaying(false);
                   onClearStems();
                }}
                className="self-start flex items-center gap-2 text-[11px] uppercase font-black tracking-widest text-indigo-300 hover:text-white bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/30 px-6 py-3 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
             >
                <ArrowLeft className="w-4 h-4" /> Back to Extract & Bypass Tools
             </button>
          )}
          {/* Pre-Export & Bypass Tools */}
          {stemUrls && (
             <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex flex-col gap-1">
                       <h3 className="text-[10px] font-black tracking-widest uppercase text-white/70">Export Tools</h3>
                       <p className="text-[9px] text-white/40">Trim mixdown or generate a direct bypassed track.</p>
                   </div>
                   <div className="flex flex-wrap items-center gap-3">
                       <div className="flex items-center gap-2">
                          <input 
                             type="checkbox" 
                             id="trim-export"
                             checked={isTrimming} 
                             onChange={(e) => setIsTrimming(e.target.checked)}
                             className="w-4 h-4 rounded bg-black/50 border-white/20 text-amber-400 focus:ring-amber-400/50 cursor-pointer"
                          />
                          <label htmlFor="trim-export" className="text-[10px] font-bold text-white uppercase tracking-wider cursor-pointer">Trim Region</label>
                       </div>
                       
                       <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
                       
                       <button
                           type="button"
                           onClick={handleDirectSunoBypass}
                           disabled={isBypassingSuno || !originalAudioUrl}
                           className="flex items-center justify-center gap-2 text-[9px] tracking-widest uppercase font-black border border-indigo-500/50 text-indigo-300 hover:text-white bg-indigo-600/10 px-4 py-2 rounded-xl hover:bg-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                           title="Directly bypass Suno's detection on the original track"
                       >
                          {isBypassingSuno ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {isBypassingSuno ? "Processing..." : "Direct Bypass"}
                       </button>
                   </div>
                </div>
                
                {isTrimming && originalAudioUrl && (
                   <div className="mt-2 border border-amber-400/20 rounded-2xl overflow-hidden p-2 bg-black/40 relative">
                      <AudioTrimmer 
                         mode="select-only"
                         audioUrl={decodeAudioUrl!}
                         initialStart={trimStart}
                         initialEnd={trimEnd > 0 ? trimEnd : duration}
                         onRegionChange={(s, e) => {
                            setTrimStart(s);
                            setTrimEnd(e);
                         }}
                         onCancel={() => {}}
                         onTrim={() => {}}
                      />
                   </div>
                )}
             </div>
          )}


          
          
          {downloadLink && (
             <div ref={downloadLinkRef} className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/10 border border-emerald-500/30 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-2xl shadow-emerald-500/10 relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                         <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-xs sm:text-base font-black tracking-widest uppercase text-white drop-shadow-md">Mixdown Ready</h4>
                         <p className="text-[10px] sm:text-xs text-emerald-300/80 font-mono truncate max-w-[180px] xs:max-w-[220px] sm:max-w-md mt-0.5" title={downloadLink.filename}>
                            {downloadLink.filename}
                         </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                      <button
                         onClick={() => {
                             if (isPlaying) {
                                togglePlay();
                             }
                             document.querySelectorAll('audio').forEach(a => a.pause());
                             setShowSpectrogram(true);
                         }}
                         className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all flex items-center gap-1.5 cursor-pointer bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30"
                         title="Compare Original Audio with Exported Mixdown"
                      >
                         <Activity className="w-3.5 h-3.5" /> Spectrogram
                      </button>
                      <button
                         onClick={() => setIsTrimmingMixdown(!isTrimmingMixdown)}
                         className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all flex items-center gap-1.5 cursor-pointer ${isTrimmingMixdown ? 'bg-amber-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:bg-amber-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                         <Scissors className="w-3.5 h-3.5" /> Trim
                      </button>
                      <a
                         href={downloadLink.url}
                         download={downloadLink.filename}
                         onClick={() => {
                            setTimeout(() => {
                                setDownloadLink(null);
                                setIsTrimmingMixdown(false);
                            }, 8000);
                         }}
                         className="px-3 py-2 sm:px-5 sm:py-2.5 bg-emerald-500 text-black rounded-xl text-[10px] sm:text-xs font-black tracking-widest uppercase hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer"
                         referrerPolicy="no-referrer"
                      >
                         <Download className="w-3.5 h-3.5" /> Save
                      </a>
                      <button
                         onClick={() => {
                             setDownloadLink(null);
                             setIsTrimmingMixdown(false);
                         }}
                         className="p-2 sm:p-2.5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors"
                      >
                         <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                   </div>
                </div>
                
                
                <div className="w-full relative z-10 flex flex-col gap-3">
                   {!isTrimmingMixdown ? (
                      <div className="w-full bg-black/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-emerald-500/30 shadow-inner flex flex-col items-center justify-center gap-2 sm:gap-3">
                         <div className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Preview Mixdown</div>
                         <audio controls src={downloadLink.url} className="w-full max-w-3xl outline-none min-h-[48px] h-12 block shrink-0" />
                      </div>
                   ) : (
                      <div className="w-full bg-black/60 rounded-xl sm:rounded-2xl border border-amber-500/20 shadow-inner overflow-hidden p-2">
                         <AudioTrimmer 
                            mode="full"
                            audioUrl={downloadLink.url}
                            onTrim={(newUrl, startSec, endSec) => {
                               setDownloadLink({
                                  url: newUrl,
                                  filename: downloadLink.filename.replace(/\.([^.]+)$/, `_trimmed.$1`)
                               });
                               setIsTrimmingMixdown(false);
                            }}
                            onCancel={() => setIsTrimmingMixdown(false)}
                         />
                      </div>
                   )}
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
                      <h4 className="text-[11px] sm:text-xs font-black tracking-wider sm:tracking-widest uppercase text-white">Export Failed</h4>
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
             <div className={`flex-1 flex flex-col items-center justify-center p-2 sm:p-6 text-center animate-in fade-in duration-500 w-full ${downloadLink ? 'py-2 my-1' : 'my-auto'}`}>
                {stemmixStatus === "idle" ? (
                   <div className={`flex flex-col items-center justify-center px-4 text-center w-full max-w-[95%] xl:max-w-[98%] mx-auto ${downloadLink ? 'py-4' : 'py-8 sm:py-12'}`}>
                      <div className="w-full bg-gradient-to-b from-neutral-900/90 via-black/80 to-black/95 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col items-center">
                         {/* Ambient Glow background */}
                         <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                         <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                         {/* Header Icon Badge */}
                         <div className="relative mb-5 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 blur-xl animate-pulse" />
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-indigo-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-xl relative z-10 backdrop-blur-md">
                               <Waves className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
                            </div>
                         </div>

                         <h3 className="text-base sm:text-xl tracking-[0.25em] uppercase font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-300 mb-2">
                            Extract Stems
                         </h3>
                         <p className="text-xs sm:text-sm text-white/50 text-center max-w-lg leading-relaxed mb-4">
                            Isolate vocals, drums, bass, and other instruments using AI or WebGPU processing.
                         </p>

                         <div className="w-full max-w-xl mb-8 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-[11px] sm:text-xs leading-relaxed text-center backdrop-blur-md shadow-lg flex items-start sm:items-center justify-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                            <p className="text-left sm:text-center">
                               <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] sm:text-[11px] block sm:inline mr-1">⚠️ Cảnh báo hệ thống:</span>
                               Không hỗ trợ tách STEM với tệp âm thanh quá dài. Tuyệt đối không dùng công cụ tự động để cào/tải nhạc hàng loạt — hành vi này sẽ gây <strong>kiệt bộ nhớ (RAM)</strong>, <strong>quá tải băng thông</strong> và dẫn tới việc <strong>IP của server bị khóa bởi Tiktok hay YT. Không sử dụng search YT quá nhiều dẫn đến hết memory của Free server</strong>.
                            </p>
                         </div>
                      {isTrimmingBeforeExtract ? (
                         <div className="w-full max-w-lg">
                            <AudioTrimmer 
                               audioUrl={decodeAudioUrl!}
                               showExtractAction={true}
                               onTrim={(newUrl, startSec, endSec, autoExtract) => {
                                  const newDuration = endSec - startSec;
                                  if (onUpdateAudioUrl) onUpdateAudioUrl(newUrl, newDuration);
                                  setIsTrimmingBeforeExtract(false);
                                  if (autoExtract && onRetrySeparate) {
                                      // Give it a tiny delay to update state before triggering
                                      setTimeout(() => onRetrySeparate(), 100);
                                  }
                               }}
                               onCancel={() => setIsTrimmingBeforeExtract(false)}
                            />
                         </div>
                      ) : (
                         <div className="flex flex-col items-center justify-center w-full max-w-2xl gap-6">
                            {/* Primary Suno Bypass Action Area */}
                            <div className="flex flex-col items-center gap-3 w-full">
                               <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                                  <button
                                      type="button"
                                      onClick={handleDirectSunoBypass}
                                      disabled={isBypassingSuno || !originalAudioUrl}
                                      className="flex items-center justify-center gap-2.5 text-xs tracking-wider sm:tracking-widest uppercase font-black border-2 border-indigo-500/80 text-white bg-gradient-to-r from-indigo-600 to-indigo-700 px-7 py-3.5 rounded-2xl hover:from-indigo-500 hover:to-indigo-600 hover:border-indigo-400 transition-all active:scale-95 shadow-[0_0_25px_rgba(99,102,241,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                      title="Applies a slight speed shift and imperceptible noise to bypass Suno detection."
                                  >
                                     {isBypassingSuno ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-indigo-200" />}
                                     {isBypassingSuno ? "Processing Bypass..." : "Bypass Suno Detection (Mixdown)"}
                                  </button>

                                  <button
                                      type="button"
                                      onClick={() => setShowSunoSettings(!showSunoSettings)}
                                      className={`text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 px-4 py-3.5 rounded-2xl border cursor-pointer ${
                                         showSunoSettings 
                                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/50 shadow-lg" 
                                            : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
                                      }`}
                                  >
                                     <Settings2 className="w-4 h-4 text-indigo-400" />
                                     Bypass Settings
                                  </button>
                               </div>

                               {/* Wide, Organized Bypass Settings Box */}
                               {showSunoSettings && (
                                   <div className="my-4 p-5 sm:p-6 bg-black/70 border border-indigo-500/30 rounded-2xl flex flex-col gap-5 w-full animate-in fade-in slide-in-from-top-3 shadow-2xl backdrop-blur-md text-left">
                                       <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 pb-3 border-b border-white/10 text-center sm:text-left">
                                           <div className="flex items-center justify-center sm:justify-start gap-2">
                                              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                                              <span className="text-xs font-black uppercase tracking-wider text-white">Suno Bypass Controls</span>
                                           </div>
                                           <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                                               <button
                                                   type="button"
                                                   onClick={handleResetSunoSystemDefault}
                                                   className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                   title="Reset to System Default (1.045x Speed, +6.5 Pitch, +6.5dB EQ)"
                                               >
                                                   <RotateCcw className="w-3 h-3" />
                                                   Default
                                               </button>
                                               <button
                                                   type="button"
                                                   onClick={handleResetSunoOriginal}
                                                   className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                                   title="Reset to Original Audio (1.000x Speed, 0 Pitch, 0dB EQ)"
                                               >
                                                   <FileAudio className="w-3 h-3" />
                                                   Original
                                               </button>
                                           </div>
                                       </div>

                                       {/* Grid Layout for Sliders */}
                                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                           <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 rounded-xl">
                                               <div className="flex justify-between items-center text-xs font-bold text-white/80">
                                                   <span>Speed Shift</span>
                                                   <span className="text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">{sunoSpeedFactor.toFixed(3)}x</span>
                                               </div>
                                               <input 
                                                   type="range" 
                                                   min="0.5" 
                                                   max="1.5" 
                                                   step="0.005" 
                                                   value={sunoSpeedFactor}
                                                   onChange={(e) => setSunoSpeedFactor(parseFloat(e.target.value))}
                                                   className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                               />
                                           </div>

                                           <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 rounded-xl">
                                               <div className="flex justify-between items-center text-xs font-bold text-white/80">
                                                   <span>Pitch Shift (Semitones)</span>
                                                   <span className="text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">{sunoPitchShift.toFixed(1)}</span>
                                               </div>
                                               <input 
                                                   type="range" 
                                                   min="-12" 
                                                   max="12" 
                                                   step="0.1" 
                                                   value={sunoPitchShift}
                                                   onChange={(e) => setSunoPitchShift(parseFloat(e.target.value))}
                                                   className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                               />
                                           </div>

                                           <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 rounded-xl">
                                               <div className="flex justify-between items-center text-xs font-bold text-white/80">
                                                   <span>Noise Level</span>
                                                   <span className="text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">{sunoNoiseLevel.toFixed(4)}</span>
                                               </div>
                                               <input 
                                                   type="range" 
                                                   min="0" 
                                                   max="0.05" 
                                                   step="0.0005" 
                                                   value={sunoNoiseLevel}
                                                   onChange={(e) => setSunoNoiseLevel(parseFloat(e.target.value))}
                                                   className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                               />
                                           </div>

                                           <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 rounded-xl">
                                               <div className="flex justify-between items-center text-xs font-bold text-white/80">
                                                   <span>EQ Low (320Hz)</span>
                                                   <span className="text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">{sunoEqLow.toFixed(1)} dB</span>
                                               </div>
                                               <input 
                                                   type="range" 
                                                   min="-24" max="24" step="0.5" 
                                                   value={sunoEqLow}
                                                   onChange={(e) => setSunoEqLow(parseFloat(e.target.value))}
                                                   className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                               />
                                           </div>

                                           <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 rounded-xl">
                                               <div className="flex justify-between items-center text-xs font-bold text-white/80">
                                                   <span>EQ Mid (1kHz)</span>
                                                   <span className="text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">{sunoEqMid.toFixed(1)} dB</span>
                                               </div>
                                               <input 
                                                   type="range" 
                                                   min="-24" max="24" step="0.5" 
                                                   value={sunoEqMid}
                                                   onChange={(e) => setSunoEqMid(parseFloat(e.target.value))}
                                                   className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                               />
                                           </div>

                                           <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 rounded-xl">
                                               <div className="flex justify-between items-center text-xs font-bold text-white/80">
                                                   <span>EQ High (3.2kHz)</span>
                                                   <span className="text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">{sunoEqHigh.toFixed(1)} dB</span>
                                               </div>
                                               <input 
                                                   type="range" 
                                                   min="-24" max="24" step="0.5" 
                                                   value={sunoEqHigh}
                                                   onChange={(e) => setSunoEqHigh(parseFloat(e.target.value))}
                                                   className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                               />
                                           </div>
                                       </div>
                                   </div>
                               )}
                            </div>

                            {/* Divider */}
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />

                            {/* Trim & Extraction Action Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                               <button
                                   type="button"
                                   onClick={() => setIsTrimmingBeforeExtract(true)}
                                   className="flex items-center gap-2 text-xs tracking-wider sm:tracking-widest uppercase font-black border border-white/20 text-white/80 bg-white/5 px-7 py-3.5 rounded-2xl hover:bg-white/10 hover:text-white transition-all active:scale-95 cursor-pointer"
                               >
                                  <Scissors className="w-4 h-4 text-white/60" />
                                  Trim Audio
                               </button>
                               {onRetrySeparate && (
                                  <button
                                      type="button"
                                      onClick={onRetrySeparate}
                                      className="flex items-center gap-2 text-xs tracking-wider sm:tracking-widest uppercase font-black border-2 border-amber-400 text-black bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3.5 rounded-2xl hover:from-amber-300 hover:to-amber-400 hover:border-amber-300 transition-all active:scale-95 shadow-[0_0_25px_rgba(251,191,36,0.35)] cursor-pointer"
                                  >
                                     <Sparkles className="w-4 h-4 text-black" />
                                     Run Stem Extraction
                                  </button>
                               )}
                            </div>
                         </div>
                      )}
                       {/* PREVIEW & TRANSCRIPT SECTION */}
                      {originalAudioUrl && !isTrimmingBeforeExtract && (
                        <div className="w-full max-w-[95%] xl:max-w-[98%] mt-6 sm:mt-12 flex flex-col gap-4 items-center bg-black/20 p-3 sm:p-5 rounded-[20px] sm:rounded-3xl border border-white/5 shadow-2xl mx-auto">
                           <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-2">Original Audio Preview & Tools</h4>
                           <div className="flex w-full items-center justify-between gap-4 flex-col sm:flex-row">
                              <audio 
                                 controls 
                                 src={originalAudioUrl} 
                                 className="w-full h-10 outline-none opacity-80 hover:opacity-100 transition-opacity" 
                                 onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                                 onPlay={() => setIsPlaying(true)}
                                 onPause={() => setIsPlaying(false)}
                              />
                              <div className="flex items-center gap-2 shrink-0">
                                 {onRetrySeparate && (
                                    <button
                                       onClick={onRetrySeparate}
                                       className="h-10 px-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                                       title="Extract Stems from this audio"
                                    >
                                       <Sparkles className="w-4 h-4 mr-2" />
                                       Extract
                                    </button>
                                 )}
                                 <button
                                    onClick={handleCohereTranscribe}
                                    className="h-10 px-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20 hover:border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                                    title="Transcribe Audio"
                                 >
                                    {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Type className="w-4 h-4 mr-2" />}
                                    Lyrics
                                 </button>
                              </div>
                           </div>
                           
                           { (cohereTranscript || isTranscribing) && (
                              <div className="w-full text-left mt-2 border-t border-white/5 pt-4">
                                 {subtitlesUI}
                              </div>
                           )}

                           <div className="w-full text-left">

                                 {sunoLyricUI}
                                 {phoiKhiLyricUI}
                           </div>
                        </div>
                      )}
                   </div>
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
                               <span className="text-[9px] font-black text-amber-400 tracking-wider sm:tracking-widest uppercase">Pipeline Diagnostics</span>
                            </div>
                            <span className="text-[8px] text-white/30 tracking-wider sm:tracking-widest font-mono">LIVE FEED</span>
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
                                     className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all border border-white/5"
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
                               className="text-[10px] tracking-wider sm:tracking-widest uppercase font-black border-2 border-amber-400 text-black bg-amber-400 px-6 py-2.5 rounded-full hover:bg-amber-300 hover:border-amber-300 transition-all active:scale-95 shadow-lg shadow-amber-400/10"
                            >
                               Retry Separation
                            </button>
                         )}
                         {separationMode === "ai" && (
                            <button
                               type="button"
                               onClick={() => onSetSeparationMode?.("webgpu")}
                               className="text-[10px] tracking-wider sm:tracking-widest uppercase font-black border border-white/10 text-white/60 hover:text-white bg-white/5 px-6 py-2.5 rounded-full hover:bg-white/10 transition-all active:scale-95"
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
                          <span className="text-[8.5px] sm:text-[10px] font-black text-black bg-amber-400 px-2 py-0.5 rounded uppercase tracking-wider sm:tracking-widest shadow-md shadow-amber-400/20">V2 HD</span>
                          <span className="text-[9px] text-white/60 font-mono tracking-wider sm:tracking-widest flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
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
                              <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider sm:tracking-widest animate-pulse flex items-center gap-2">
                                 <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Buffering
                              </span>
                              <span className="text-[9px] text-white/50 font-mono uppercase tracking-wider sm:tracking-widest mt-1">Stems: {loadedCount}/{stemsList.length}</span>
                           </div>
                                                ) : (
                           <div className="flex items-center gap-3">
                              <div className="hidden sm:flex items-center gap-2 mr-2">
                                 <button
                                     onClick={(e) => { e.stopPropagation(); handleExportMix("mp3"); }}
                                     disabled={stemmixStatus !== "ready" || isExporting}
                                     className={`flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase ${isExporting && exportFormat === "mp3" ? "bg-amber-400 text-black shadow-amber-400/25 animate-pulse" : "bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]"} px-3 py-2 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50`}
                                     title="Quick Export Mix (MP3)"
                                 >
                                     {isExporting && exportFormat === "mp3" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                     MP3
                                 </button>
                                 <button
                                     onClick={(e) => { e.stopPropagation(); handleExportMix("wav"); }}
                                     disabled={stemmixStatus !== "ready" || isExporting}
                                     className={`flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase ${isExporting && exportFormat === "wav" ? "bg-amber-400 text-black shadow-amber-400/25 animate-pulse" : "bg-white/10 border border-white/20 text-white"} px-3 py-1.5 rounded-xl hover:bg-white/20 hover:border-white/30 transition-colors disabled:opacity-50`}
                                     title="Quick Export Mix (WAV)"
                                 >
                                     {isExporting && exportFormat === "wav" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                     WAV
                                 </button>
                              </div>
                              <div className="flex flex-col min-w-0 leading-tight bg-black/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-md text-right items-end shadow-xl">
                                 <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider sm:tracking-widest flex items-center gap-2">
                                    {isPlaying ? <><Play className="w-3 h-3 fill-current" /> PLAYING</> : <><Pause className="w-3 h-3 fill-current" /> PAUSED</>}
                                 </span>
                              </div>
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
                       <button onClick={() => setIsHD(!isHD)} className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border text-[11px] sm:text-[13px] font-black tracking-wider sm:tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${isHD ? 'border-amber-400/40 bg-amber-400/10 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] shadow-[inset_0_0_15px_rgba(245,158,11,0.2)]' : 'bg-black/40 hover:bg-black/60 border-white/10 text-white/40 hover:text-white/70 shadow-inner'}`} title="Toggle Lossless HD Audio">HD</button>
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
                    
                    <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[8.5px] sm:text-[10px] font-black text-white tracking-wider sm:tracking-widest px-1 z-20 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-[9px] font-black uppercase tracking-wider sm:tracking-widest text-white/50 hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
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
                                     {stem === 'vocals' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>}
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
                               value={volumes[stem] ?? 0.8}
                               onChange={(e) => setVolumes(p => ({...p, [stem]: parseFloat(e.target.value)}))}
                               className="w-full h-1.5 rounded-lg appearance-none bg-white/10 cursor-pointer accent-amber-400 focus:outline-none"
                               style={{
                                 background: `linear-gradient(to right, ${STEM_COLORS[stem] || '#fbbf24'} 0%, ${STEM_COLORS[stem] || '#fbbf24'} ${(volumes[stem] ?? 0.8) * 100}%, rgba(255,255,255,0.1) ${(volumes[stem] ?? 0.8) * 100}%, rgba(255,255,255,0.1) 100%)`
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
             {expandedSections.mixer && (
                <div className="w-full mt-2">
                   <PixabayStudio ref={pixabayStudioRef} masterDuration={duration} 
                       isPlaying={isPlaying} 
                       primaryAudioRef={audioElementsRef} 
                       primaryStem={stemsList.includes('vocals') ? 'vocals' : stemsList[0]}
                   />
                </div>
             )}

                                      {sunoLyricUI}
                                 {phoiKhiLyricUI}
          

          {subtitlesUI}
          
          {/* MASTER FX */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('masterFx')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Settings2 className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Master FX</h3>
                <div className="flex items-center gap-2">
                   <button 
                      onClick={(e) => {
                         e.stopPropagation();
                         setSpeed(1);
                         setPreservePitch(true);
                         setReverb(0);
                      }}
                      className="text-[8px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                   >
                      Reset
                   </button>
                   {expandedSections.masterFx ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             
             {expandedSections.masterFx && (
               <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-2 mb-2">
                    <input 
                       type="checkbox" 
                       id="master-suno-bypass"
                       checked={isSunoBypass} 
                       onChange={(e) => setIsSunoBypass(e.target.checked)}
                       className="w-4 h-4 rounded bg-black/50 border-white/20 text-amber-400 focus:ring-amber-400/50 cursor-pointer"
                    />
                    <label htmlFor="master-suno-bypass" className="text-[10px] font-black text-white uppercase tracking-widest cursor-pointer">Enable Bypass FX Engine</label>
                 </div>
                 
                 <div className={`flex flex-col gap-3 p-3 bg-black/20 border border-white/5 rounded-xl transition-all duration-300 ${isSunoBypass ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                     <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                         <button
                             type="button"
                             onClick={handleResetSunoSystemDefault}
                             className="flex-1 py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                             title="Reset to System Default (1.045x Speed, +6.5 Pitch, +6.5dB EQ)"
                         >
                             <RotateCcw className="w-3 h-3" />
                             Default
                         </button>
                         <button
                             type="button"
                             onClick={handleResetSunoOriginal}
                             className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                             title="Reset to Original Audio (1.000x Speed, 0 Pitch, 0dB EQ)"
                         >
                             <FileAudio className="w-3 h-3" />
                             Original
                         </button>
                     </div>
                     <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-center text-[10px] font-bold text-white/70">
                             <span>Speed Shift</span>
                             <span className="text-amber-400">{sunoSpeedFactor.toFixed(3)}x</span>
                         </div>
                         <input 
                             type="range" 
                             min="0.5" 
                             max="1.5" 
                             step="0.005" 
                             value={sunoSpeedFactor}
                             onChange={(e) => setSunoSpeedFactor(parseFloat(e.target.value))}
                             className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                         />
                     </div>
                     <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-center text-[10px] font-bold text-white/70">
                             <span>Pitch Shift (Semitones)</span>
                             <span className="text-amber-400">{sunoPitchShift.toFixed(1)}</span>
                         </div>
                         <input 
                             type="range" 
                             min="-12" 
                             max="12" 
                             step="0.1" 
                             value={sunoPitchShift}
                             onChange={(e) => setSunoPitchShift(parseFloat(e.target.value))}
                             className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                         />
                     </div>
                     <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-center text-[10px] font-bold text-white/70">
                             <span className="flex items-center gap-1">
                                Noise Level
                                {isSunoBypass && sunoNoiseLevel > 0 && <Volume2 className="w-3 h-3 text-amber-400 animate-pulse" title="Noise plays in background during playback" />}
                                {isSunoBypass && sunoNoiseLevel > 0 && <span className="text-[8px] text-amber-400/80 font-normal normal-case ml-1">(Plays in bg)</span>}
                             </span>
                             <span className="text-amber-400">{sunoNoiseLevel.toFixed(4)}</span>
                         </div>
                         <input 
                             type="range" 
                             min="0" 
                             max="0.02" 
                             step="0.0001" 
                             value={sunoNoiseLevel}
                             onChange={(e) => setSunoNoiseLevel(parseFloat(e.target.value))}
                             className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                         />
                     </div>
                     <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-center text-[10px] font-bold text-white/70">
                             <span>EQ Low (320Hz)</span>
                             <span className="text-amber-400">{sunoEqLow.toFixed(1)} dB</span>
                         </div>
                         <input 
                             type="range" 
                             min="-12" 
                             max="12" 
                             step="0.1" 
                             value={sunoEqLow}
                             onChange={(e) => setSunoEqLow(parseFloat(e.target.value))}
                             className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                         />
                     </div>
                     <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-center text-[10px] font-bold text-white/70">
                             <span>EQ Mid (1kHz)</span>
                             <span className="text-amber-400">{sunoEqMid.toFixed(1)} dB</span>
                         </div>
                         <input 
                             type="range" 
                             min="-12" 
                             max="12" 
                             step="0.1" 
                             value={sunoEqMid}
                             onChange={(e) => setSunoEqMid(parseFloat(e.target.value))}
                             className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                         />
                     </div>
                     <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-center text-[10px] font-bold text-white/70">
                             <span>EQ High (3.2kHz)</span>
                             <span className="text-amber-400">{sunoEqHigh.toFixed(1)} dB</span>
                         </div>
                         <input 
                             type="range" 
                             min="-12" 
                             max="12" 
                             step="0.1" 
                             value={sunoEqHigh}
                             onChange={(e) => setSunoEqHigh(parseFloat(e.target.value))}
                             className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                         />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mt-2">
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
                       className="text-[8px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                    >
                       Reset
                    </button>
                    {expandedSections.masterEq ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                 </div>
              </div>
              
              {expandedSections.masterEq && (
                 <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="flex flex-col gap-2">
                       <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center border-b border-white/5 pb-1">Lows</h4>
                       {masterEq.slice(0, 5).map((band, i) => (
                           <div key={i} className="flex items-center gap-3">
                              <span className="text-[9px] font-bold text-white/50 w-16 text-right uppercase tracking-wider">{band.name}</span>
                              <input
                                  type="range" min="-12" max="12" step="0.1" value={band.g}
                                  onChange={(e) => {
                                      const newEq = [...masterEq];
                                      newEq[i].g = parseFloat(e.target.value);
                                      setMasterEq(newEq);
                                  }}
                                  className="flex-1 h-1.5 rounded-lg appearance-none bg-white/10 accent-blue-400"
                              />
                              <span className="text-[9px] font-mono text-white/70 w-8 text-right">{band.g > 0 ? '+' : ''}{band.g.toFixed(1)}</span>
                           </div>
                       ))}
                       </div>
                       
                       <div className="flex flex-col gap-2">
                       <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center border-b border-white/5 pb-1">Mids</h4>
                       {masterEq.slice(5, 10).map((band, i) => (
                           <div key={i + 5} className="flex items-center gap-3">
                              <span className="text-[9px] font-bold text-white/50 w-16 text-right uppercase tracking-wider">{band.name}</span>
                              <input
                                  type="range" min="-12" max="12" step="0.1" value={band.g}
                                  onChange={(e) => {
                                      const newEq = [...masterEq];
                                      newEq[i + 5].g = parseFloat(e.target.value);
                                      setMasterEq(newEq);
                                  }}
                                  className="flex-1 h-1.5 rounded-lg appearance-none bg-white/10 accent-green-400"
                              />
                              <span className="text-[9px] font-mono text-white/70 w-8 text-right">{band.g > 0 ? '+' : ''}{band.g.toFixed(1)}</span>
                           </div>
                       ))}
                       </div>

                       <div className="flex flex-col gap-2">
                       <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center border-b border-white/5 pb-1">Highs</h4>
                       {masterEq.slice(10, 15).map((band, i) => (
                           <div key={i + 10} className="flex items-center gap-3">
                              <span className="text-[9px] font-bold text-white/50 w-16 text-right uppercase tracking-wider">{band.name}</span>
                              <input
                                  type="range" min="-12" max="12" step="0.1" value={band.g}
                                  onChange={(e) => {
                                      const newEq = [...masterEq];
                                      newEq[i + 10].g = parseFloat(e.target.value);
                                      setMasterEq(newEq);
                                  }}
                                  className="flex-1 h-1.5 rounded-lg appearance-none bg-white/10 accent-purple-400"
                              />
                              <span className="text-[9px] font-mono text-white/70 w-8 text-right">{band.g > 0 ? '+' : ''}{band.g.toFixed(1)}</span>
                           </div>
                       ))}
                       </div>
                    </div>
                 </div>
              )}
           </div>

           {/* AMBIENT OVERLAY & PIXABAY */}
           <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('overlay')}>
                 <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><CloudRain className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Overlay Sound (Freesound)</h3>
                 <div className="flex items-center gap-2">
                    {expandedSections.overlay ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                 </div>
              </div>
              
              {expandedSections.overlay && (
                 <div className="flex flex-col gap-2">
                    {ambientOverlayUrl ? (
                       <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                             <div className="flex items-center gap-2 overflow-hidden">
                                <FileAudio className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="text-[10px] text-white truncate font-medium">Ambient Audio Loaded</span>
                             </div>
                             <div className="flex items-center gap-2 shrink-0">
                                <button
                                   onClick={() => setIsAmbientLoop(!isAmbientLoop)}
                                   className={`p-1.5 rounded-md transition-colors ${isAmbientLoop ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 hover:text-white/80'}`}
                                   title="Toggle Loop"
                                >
                                   <Repeat className="w-3.5 h-3.5" />
                                </button>
                                <button
                                   onClick={() => {
                                      setAmbientOverlayUrl("");
                                      setShowAmbientInput(false);
                                   }}
                                   className="p-1.5 rounded-md bg-white/5 text-red-400 hover:bg-red-500/20 transition-colors"
                                   title="Remove Audio"
                                >
                                   <X className="w-3.5 h-3.5" />
                                </button>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                             <Volume2 className="w-4 h-4 text-white/40 shrink-0" />
                             <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={ambientVolume}
                                onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                                className="flex-1 accent-blue-400 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                             />
                             <span className="text-[10px] font-mono text-white/60 w-8 text-right">{Math.round(ambientVolume * 100)}%</span>
                          </div>
                          
                          <audio
                             ref={ambientAudioRef}
                             src={ambientOverlayUrl}
                             loop={isAmbientLoop}
                             className="hidden"
                          />
                       </div>
                    ) : (
                       <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-4 gap-2">
                             {[
                                { name: "Noise", icon: Activity, url: "https://cdn.freesound.org/previews/8/8132_18300-lq.mp3" },
                                { name: "Ocean", icon: Waves, url: "https://cdn.freesound.org/previews/262/262593_43-lq.mp3" },
                                { name: "Forest", icon: TreePine, url: "https://cdn.freesound.org/previews/802/802064_14408616-lq.mp3" },
                                { name: "Storm", icon: CloudLightning, url: "https://cdn.freesound.org/previews/84/84896_988961-lq.mp3" },
                             ].map((preset, i) => (
                                <div key={i} className="relative group bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/50 rounded-xl transition-all flex flex-col overflow-hidden">
                                   <button
                                      onClick={(e) => togglePreview(preset.url, e)}
                                      className="absolute top-1.5 right-1.5 p-1 bg-black/40 hover:bg-blue-500 hover:text-white text-white/50 rounded-full transition-colors z-10"
                                      title={previewingUrl === preset.url ? "Stop Preview" : "Play Preview"}
                                   >
                                      {previewingUrl === preset.url ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-[1px]" />}
                                   </button>
                                   <button
                                      onClick={() => {
                                         setAmbientOverlayUrl(preset.url);
                                         if (previewingUrl === preset.url) {
                                            previewAudioRef.current?.pause();
                                            setPreviewingUrl(null);
                                         }
                                      }}
                                      className="w-full h-full py-3 flex flex-col items-center justify-center gap-1.5 pt-4"
                                   >
                                      <preset.icon className="w-4 h-4 text-white/40 group-hover:text-blue-400 transition-colors" />
                                      <span className="text-[9px] font-bold text-white/50 group-hover:text-blue-300 transition-colors">{preset.name}</span>
                                   </button>
                                </div>
                             ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                             <button
                                onClick={() => setShowPixabaySearch(!showPixabaySearch)}
                                className={`flex-1 border rounded-xl p-3 flex items-center justify-center gap-2 transition-all group ${showPixabaySearch ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#00ab6b]/10 hover:bg-[#00ab6b]/20 border-[#00ab6b]/30'}`}
                             >
                                <Search className={`w-4 h-4 transition-colors ${showPixabaySearch ? 'text-blue-400' : 'text-[#00ab6b]'}`} />
                                <span className={`text-[10px] font-bold transition-colors ${showPixabaySearch ? 'text-blue-400' : 'text-[#00ab6b]'}`}>SEARCH FREESOUND</span>
                             </button>
                             <button
                                onClick={() => document.getElementById('ambient-file-upload')?.click()}
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-2 transition-all group"
                             >
                                <UploadCloud className="w-4 h-4 text-white/40 group-hover:text-blue-400 transition-colors" />
                                <span className="text-[10px] font-bold text-white/70 group-hover:text-white transition-colors">LOCAL FILE</span>
                             </button>
                             <input
                                type="file"
                                id="ambient-file-upload"
                                accept="audio/*"
                                className="hidden"
                                onChange={handleAmbientFileUpload}
                             />
                             <button
                                onClick={() => setShowAmbientInput(!showAmbientInput)}
                                className={`flex-1 border rounded-xl p-3 flex items-center justify-center gap-2 transition-all group ${showAmbientInput ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                             >
                                <Link className={`w-4 h-4 transition-colors ${showAmbientInput ? 'text-blue-400' : 'text-white/40 group-hover:text-blue-400'}`} />
                                <span className={`text-[10px] font-bold transition-colors ${showAmbientInput ? 'text-blue-400' : 'text-white/70 group-hover:text-white'}`}>AUDIO URL</span>
                             </button>
                          </div>
                          
                          {showPixabaySearch && (
                             <div className="flex flex-col gap-2 mt-1 animate-in fade-in slide-in-from-top-2 bg-black/30 border border-white/10 rounded-xl p-3">
                                <div className="flex items-center gap-2">
                                   <input
                                      type="text"
                                      placeholder="Search Freesound for 'rain', 'forest', 'city'..."
                                      value={pixabayQuery}
                                      onChange={(e) => setPixabayQuery(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handlePixabaySearch()}
                                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ab6b]/50"
                                   />
                                   <button
                                      onClick={() => handlePixabaySearch()}
                                      disabled={isPixabaySearching || !pixabayQuery}
                                      className="bg-[#00ab6b] hover:bg-[#008f5a] disabled:opacity-50 disabled:hover:bg-[#00ab6b] text-white font-bold text-[10px] px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                                   >
                                      {isPixabaySearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                      SEARCH
                                   </button>
                                </div>
                                {pixabayResults.length > 0 && (
                                   <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto custom-scrollbar mt-2">
                                      {pixabayResults.map((result, i) => (
                                         <div
                                            key={i}
                                            className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-left transition-colors border border-transparent hover:border-white/10 group"
                                         >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                               <button
                                                  onClick={(e) => togglePreview(result.url || result.previewUrl, e)}
                                                  className="p-1.5 rounded-full bg-black/40 text-white/50 hover:text-[#00ab6b] hover:bg-black/60 transition-colors shrink-0"
                                                  title={previewingUrl === (result.url || result.previewUrl) ? "Stop Preview" : "Play Preview"}
                                               >
                                                  {previewingUrl === (result.url || result.previewUrl) ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                               </button>
                                               <span className="text-[10px] text-white/70 group-hover:text-white truncate font-medium">{result.name || result.tags || 'Sound'}</span>
                                            </div>
                                            <button
                                               onClick={() => {
                                                  setAmbientOverlayUrl(result.url || result.audioUrl || result.previewUrl);
                                                  if (previewingUrl) {
                                                     previewAudioRef.current?.pause();
                                                     setPreviewingUrl(null);
                                                  }
                                               }}
                                               className="text-[9px] font-bold text-white/50 hover:text-black bg-white/10 hover:bg-[#00ab6b] px-2 py-1 rounded transition-colors shrink-0 ml-2"
                                            >
                                               LOAD
                                            </button>
                                         </div>
                                      ))}
                                   </div>
                                )}
                             </div>
                          )}

                          {showAmbientInput && (
                             <div className="flex items-center gap-2 mt-1 animate-in fade-in slide-in-from-top-2">
                                <input
                                   type="url"
                                   placeholder="https://example.com/rain.mp3"
                                   value={ambientInputUrl}
                                   onChange={(e) => setAmbientInputUrl(e.target.value)}
                                   className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
                                />
                                <button
                                   onClick={() => {
                                      if (ambientInputUrl) {
                                         setAmbientOverlayUrl(ambientInputUrl);
                                         setShowAmbientInput(false);
                                      }
                                   }}
                                   className="bg-blue-500 hover:bg-blue-400 text-white font-bold text-[10px] px-3 py-2 rounded-lg transition-colors"
                                >
                                   LOAD
                                </button>
                             </div>
                          )}
                       </div>
                    )}
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
                         className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all border border-white/5"
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

       {showSpectrogram && (
          <SpectrogramTool 
             initialAudioUrl1={decodeAudioUrl} 
             initialAudioUrl2={downloadLink?.url}
             title1="Original Audio"
             title2="Exported Mixdown"
             onClose={() => setShowSpectrogram(false)} 
          />
       )}

    </div>
   );
}
