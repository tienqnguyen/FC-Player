import React, { useState, useRef, useEffect } from "react";
import {
  Upload, Play, Pause, VolumeX, SlidersHorizontal, Power, Info, Speaker, Wand2, AudioWaveform, AudioLines, Waves, Maximize2, Minimize2, Zap, Mic2, Download, Sparkles, Film, MonitorPlay, Wind, Headset, Disc3, Radio, Coffee, Crosshair, Podcast, Guitar, Dumbbell, Clock, Cpu, Trash2, History, Music, ChevronDown, Home, Library, Search, Heart, SkipBack, SkipForward, MoreHorizontal, ListMusic, Shuffle, Repeat, Menu, User, Plus, RefreshCw, Check, Share2, Smartphone, Settings, Key, ShieldCheck, CheckCircle, ExternalLink, Lock, Eye, EyeOff, Clipboard, LayoutGrid, List, X, Volume2,
  PictureInPicture, Lightbulb, Rocket
} from "lucide-react";
import { buildHDPipeline, exportOfflineHD } from "./audioPipeline";
import StemStudio from "./components/StemStudio";
import { separateStemsWithWebGpu, isWebGpuSupported } from "./utils/webgpuDsp";
import { separateStemsWithONNX } from "./utils/onnxSeparation";
import audioBufferToWav from "audiobuffer-to-wav";
import { db, auth, initAuth, handleFirestoreError, OperationType } from "./firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";


function safeDecodeAudioData(ctx: AudioContext, audioData: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const promise = ctx.decodeAudioData(
        audioData,
        (buffer) => resolve(buffer),
        (err) => reject(err || new Error("decodeAudioData callback error"))
      );
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => reject(err || new Error("decodeAudioData promise error")));
      }
    } catch (err) {
      reject(err);
    }
  });
}

const VISUALIZER_PALETTES = {
  gold: {
    center: { r: 199, g: 161, b: 122 },
    peak: { r: 255, g: 255, b: 255 },
    shadow: "rgba(212, 175, 55, ",
  },
  cyberpunk: {
    center: { r: 255, g: 0, b: 255 },
    peak: { r: 0, g: 255, b: 255 },
    shadow: "rgba(255, 0, 255, ",
  },
  ocean: {
    center: { r: 0, g: 153, b: 255 },
    peak: { r: 0, g: 255, b: 153 },
    shadow: "rgba(0, 153, 255, ",
  },
  monochrome: {
    center: { r: 150, g: 150, b: 150 },
    peak: { r: 255, g: 255, b: 255 },
    shadow: "rgba(255, 255, 255, ",
  },
};

const FallbackImage = ({ src, alt, className, title }: any) => {
  const [error, setError] = useState(false);
  
  if (!src || error) {
    // Determine initials
    let initials = "♫";
    if (alt && alt !== "cov") {
      const cleanTitle = alt.replace(/\[.*\]/g, '').replace(/\(.*\)/g, '').trim();
      const words = cleanTitle.split(' ').filter(Boolean);
      if (words.length > 1) {
          initials = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words.length === 1) {
          initials = words[0].substring(0, 2).toUpperCase();
      }
    }

    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-white/10 to-transparent border border-white/5 shadow-inner ${className}`} title={title || alt}>
        <span className={`font-black text-white/40 tracking-widest uppercase drop-shadow-md ${className && className.includes('w-8') ? 'text-[10px]' : 'text-xl md:text-3xl'}`}>
          {initials}
        </span>
      </div>
    );
  }
  
  return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" onError={() => setError(true)} title={title} />;
};

const Visualizer = ({
  analyser,
  isPlaying,
  settings,
  className,
  coverUrl,
  onContainerClick,
  isExpanded = false,
  onToggleExpand,
  isSignatureSound = false,
  isCompact = false,
}: {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  settings: {
    barWidthMultiplier: number;
    barSpacing: number;
    colorIntensity: number;
    glowStrength: number;
    type: string;
    palette: string;
  };
  className?: string;
  coverUrl?: string | null;
  onContainerClick?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isSignatureSound?: boolean;
  isCompact?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<any[]>([]);
  const rotationAngleRef = useRef<number>(0);
  const peaksRef = useRef<number[]>([]);
  const peakVelsRef = useRef<number[]>([]);
  
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [showHUD, setShowHUD] = useState(true);

  // Elite Auto-hide HUD and controllers after 3 seconds of inactivity
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetHUDTimer = () => {
    setShowHUD(true);
    if (hudTimerRef.current) {
      clearTimeout(hudTimerRef.current);
    }
    hudTimerRef.current = setTimeout(() => {
      setShowHUD(false);
    }, 3000);
  };

  // Elite Zoom and Drag-pan refs and state
  const zoomRef = useRef<number>(1.0);
  const offsetXRef = useRef<number>(0);
  const offsetYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [currentZoom, setCurrentZoom] = useState<number>(1.0);
  const [currentOffsetX, setCurrentOffsetX] = useState<number>(0);
  const [currentOffsetY, setCurrentOffsetY] = useState<number>(0);

  // Wheel zoom effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      resetHUDTimer();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      const proposedZoom = zoomRef.current * factor;
      zoomRef.current = Math.max(0.3, Math.min(proposedZoom, 6.0));
      setCurrentZoom(zoomRef.current);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Pointer event handlers for silky freestyle drag/pan moves
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    resetHUDTimer();
    isDraggingRef.current = true;
    startXRef.current = e.clientX - offsetXRef.current;
    startYRef.current = e.clientY - offsetYRef.current;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    resetHUDTimer();
    offsetXRef.current = e.clientX - startXRef.current;
    offsetYRef.current = e.clientY - startYRef.current;
    
    // Smooth responsive rendering values
    setCurrentOffsetX(offsetXRef.current);
    setCurrentOffsetY(offsetYRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    resetHUDTimer();

    // If it was barely panned, treat as a single click
    const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
    if (dist < 6) {
      if (!showHUD) {
        // Just show the controls and HUD again, don't cycle yet to prevent accidental mode switches
        resetHUDTimer();
      } else {
        if (onContainerClick) {
          onContainerClick();
        }
      }
    }
  };

  // Cross-origin safe loading of album covers for canvas rendering
  useEffect(() => {
    if (!coverUrl) {
      setLoadedImage(null);
      return;
    }
    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = coverUrl;
    img.onload = () => {
      if (active) setLoadedImage(img);
    };
    img.onerror = () => {
      if (active) setLoadedImage(null);
    };
    return () => {
      active = false;
    };
  }, [coverUrl]);

  // Flash HUD whenever style type changes
  useEffect(() => {
    resetHUDTimer();
    return () => {
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [settings.type]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    // Set responsive FFT size based on visualizer style if active
    if (analyser) {
      analyser.fftSize = 256;
    }
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    // Damped smoothing states
    let smoothedVolume = 0;
    let smoothedBass = 0;
    let smoothedMid = 0;
    let smoothedHigh = 0;

    const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
      const imgRatio = img.width / img.height;
      const canvasRatio = dw / dh;
      let sWidth = img.width;
      let sHeight = img.height;
      let sx = 0;
      let sy = 0;
      
      if (imgRatio > canvasRatio) {
        sWidth = img.height * canvasRatio;
        sx = (img.width - sWidth) / 2;
      } else {
        sHeight = img.width / canvasRatio;
        sy = (img.height - sHeight) / 2;
      }
      
      ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
    };

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);
      
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;

      
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Procedural generator for iOS Background Bypassed Mode (or when Web Audio is inactive)
        const time = Date.now() * 0.0025;
        const presenceFactor = isSignatureSound ? 1.45 : 1.0;
        for (let i = 0; i < bufferLength; i++) {
          if (isPlaying) {
            const baseFreq = Math.sin(time + i * 0.08) * 35 * presenceFactor;
            const subBass = Math.cos(time * 0.45) * 55 * presenceFactor;
            const harmonics = Math.sin(time * 2.15 + i * 0.35) * 20 * presenceFactor;
            const highFreq = Math.sin(time * 4.2 + i * 0.8) * 10 * presenceFactor;
            
            let val = 60 + baseFreq;
            if (i < bufferLength * 0.15) {
              val += Math.max(0, subBass) * 1.6 + Math.random() * 8;
            } else if (i < bufferLength * 0.65) {
              val += harmonics * 1.3 + Math.random() * 5;
            } else {
              val += highFreq * 1.1 + Math.random() * 3;
            }
            dataArray[i] = Math.max(10, Math.min(255, val));
          } else {
            // Calm, elegant resting breath pulse when paused
            const pulse = (Math.sin(time * 0.5 + i * 0.05) * 8 + 12);
            dataArray[i] = Math.max(4, pulse);
          }
        }
      }
      
      // Reset styles to prevent GPU lag during clear/draw sweeps
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // Clean viewport
      ctx.clearRect(0, 0, width, height);

      // Save complete canvas state before any transformation
      ctx.save();

      // Implement premium zoom and drag offset positioning
      ctx.translate(centerX + offsetXRef.current, centerY + offsetYRef.current);
      ctx.scale(zoomRef.current, zoomRef.current);
      ctx.translate(-centerX, -centerY);

      // Calculations and groupings
      let totalSum = 0;
      let bassSum = 0;
      let midSum = 0;
      let highSum = 0;

      const bassCutoff = Math.floor(bufferLength * 0.15); // Low frequencies (Sub-bass and Bass)
      const midCutoff = Math.floor(bufferLength * 0.65);  // Core mid vocals

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        totalSum += val;
        if (i < bassCutoff) {
          bassSum += val;
        } else if (i < midCutoff) {
          midSum += val;
        } else {
          highSum += val;
        }
      }

      const totalVol = totalSum / bufferLength / 255;
      const bassVol = bassSum / (bassCutoff || 1) / 255;
      const midVol = midSum / (midCutoff - bassCutoff || 1) / 255;
      const highVol = highSum / (bufferLength - midCutoff || 1) / 255;

      // Soft damping to make transitions silk-smooth (luxury studio standard)
      smoothedVolume = smoothedVolume * 0.82 + totalVol * 0.18;
      smoothedBass = smoothedBass * 0.82 + bassVol * 0.18;
      smoothedMid = smoothedMid * 0.82 + midVol * 0.18;
      smoothedHigh = smoothedHigh * 0.82 + highVol * 0.18;

      // Ensure stable peaks buffers
      if (peaksRef.current.length !== 16) {
        peaksRef.current = Array(16).fill(0);
        peakVelsRef.current = Array(16).fill(0);
      }

      // Render mode switcher
      if (settings.type === "liquid_gold") {
        // --- 1. GOLDEN NEBULA LIQUID WAVE ---
        // Beautiful organic bezier curves wrapping dynamically like liquid silk
        const gradientBg = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, Math.max(width, height) / 2);
        gradientBg.addColorStop(0, "rgba(22, 17, 12, 0.6)");
        gradientBg.addColorStop(1, "rgba(5, 5, 8, 0.9)");
        ctx.fillStyle = gradientBg;
        ctx.fillRect(0, 0, width, height);

        const wavesCount = 3;
        const waveHeightMax = 95 * settings.colorIntensity;
        const ptsCount = 8;
        const segment = width / (ptsCount - 1);

        for (let w = 0; w < wavesCount; w++) {
          const speedFactor = 0.0018 + w * 0.0009;
          const waveOpacity = 0.18 + (1.0 - w * 0.3) * 0.45;
          const shiftPhase = w * (Math.PI / 2.5);

          const gradLine = ctx.createLinearGradient(0, 0, width, 0);
          gradLine.addColorStop(0, `rgba(180, 130, 80, ${waveOpacity * 0.2})`); // Darker bronze
          gradLine.addColorStop(0.5, `rgba(251, 191, 36, ${waveOpacity * 1.5})`); // Rich Amber Gold
          gradLine.addColorStop(1, `rgba(255, 230, 180, ${waveOpacity * 0.1})`); // Pale gold fade

          ctx.strokeStyle = gradLine;
          ctx.lineWidth = (4.5 - w) * settings.barWidthMultiplier * 0.8;
          ctx.shadowBlur = 20 * settings.glowStrength;
          ctx.shadowColor = `rgba(245, 158, 11, ${0.4 * settings.glowStrength})`;

          ctx.beginPath();
          for (let i = 0; i < ptsCount; i++) {
            const px = i * segment;
            // sound amplitude index mapping
            const soundIndex = Math.floor((i / ptsCount) * bufferLength * 0.5);
            const frequencyVal = dataArray[soundIndex] / 255;
            const reactiveHeight = frequencyVal * waveHeightMax * (1.1 - w * 0.22);

            const osc = Math.sin(Date.now() * speedFactor + i * 0.52 + shiftPhase);
            // Center wave vertically, bouncing upwards with bass weight
            const py = centerY + osc * reactiveHeight - (smoothedBass * 35);

            if (i === 0) {
              ctx.moveTo(px, py);
            } else {
              const prevX = (i - 1) * segment;
              const prevSoundIndex = Math.floor(((i - 1) / ptsCount) * bufferLength * 0.5);
              const prevFrequencyVal = dataArray[prevSoundIndex] / 255;
              const prevReactiveHeight = prevFrequencyVal * waveHeightMax * (1.1 - w * 0.22);
              const prevOsc = Math.sin(Date.now() * speedFactor + (i - 1) * 0.52 + shiftPhase);
              const prevY = centerY + prevOsc * prevReactiveHeight - (smoothedBass * 35);

              // Control points for cubic bezier splines
              const cpX1 = prevX + segment / 2;
              const cpY1 = prevY;
              const cpX2 = px - segment / 2;
              const cpY2 = py;

              ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, px, py);
            }
          }
          ctx.stroke();
        }

        // Generate gold micro-spark embers rising up
        if (particlesRef.current.length < 45) {
          particlesRef.current.push({
            x: Math.random() * width,
            y: centerY + (Math.random() * 40 - 20),
            speedY: Math.random() * 1.2 + 0.4,
            speedX: Math.random() * 0.8 - 0.4,
            size: Math.random() * 2.5 + 1,
            alpha: Math.random() * 0.6 + 0.4,
            hue: 36 + Math.random() * 14 // warm amber gold tones (36-50)
          });
        }

        particlesRef.current.forEach((p, index) => {
          p.y -= p.speedY * (1.0 + smoothedBass * 2.5);
          p.x += Math.sin(Date.now() * 0.01 + index) * 0.4 + p.speedX;
          p.alpha -= 0.0075;

          if (p.alpha <= 0 || p.y < 5 || p.x < 5 || p.x > width - 5) {
            p.x = Math.random() * width;
            p.y = centerY + (Math.random() * 50 - 25);
            p.alpha = Math.random() * 0.7 + 0.3;
            p.speedY = Math.random() * 1.2 + 0.4;
          }

          ctx.shadowBlur = 6 * settings.glowStrength;
          ctx.shadowColor = `hsla(${p.hue}, 100%, 50%, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.0 + smoothedHigh * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${p.alpha})`;
          ctx.fill();
        });

      } else if (settings.type === "stardust_orbit") {
        // --- 2. LUXURY STARDUST ORBIT ---
        // Rotating physical vinyl turntable core with expanding radial hairpins & orbital trails
        const radBaseScale = isCompact ? 2.5 : 4.4;
        const radBase = Math.min(width, height) / radBaseScale;
        const reactiveCoreRad = radBase * (1.0 + smoothedBass * 0.22 * settings.colorIntensity);

        ctx.translate(centerX, centerY);

        // Spin logic (continuously spins, speeds up on high bass volume)
        rotationAngleRef.current += 0.0055 + (smoothedBass * 0.015);

        // Radial fine spectrogram spikes
        const numSpikes = 110;
        const spikeStep = (Math.PI * 2) / numSpikes;

        ctx.shadowBlur = 15 * settings.glowStrength;
        for (let i = 0; i < numSpikes; i++) {
          const angle = i * spikeStep + rotationAngleRef.current * 0.25;
          const mapIndex = Math.floor((i / numSpikes) * bufferLength * 0.7);
          const rawAmp = dataArray[mapIndex] / 255;
          const scaledAmpHeight = Math.pow(rawAmp, 1.7) * 55 * settings.colorIntensity;

          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const xStart = cos * (reactiveCoreRad + 4);
          const yStart = sin * (reactiveCoreRad + 4);
          const xEnd = cos * (reactiveCoreRad + 4 + scaledAmpHeight);
          const yEnd = sin * (reactiveCoreRad + 4 + scaledAmpHeight);

          const gradLine = ctx.createLinearGradient(xStart, yStart, xEnd, yEnd);
          gradLine.addColorStop(0, "rgba(220, 180, 130, 0.95)"); // Champagne gold rim
          gradLine.addColorStop(0.5, "rgba(245, 158, 11, 0.75)"); // Intense amber aura
          gradLine.addColorStop(1, "rgba(255, 255, 255, 0)"); // Air fade

          ctx.strokeStyle = gradLine;
          ctx.lineWidth = 1.35 * settings.barWidthMultiplier;
          ctx.shadowColor = "rgba(245, 158, 11, 0.35)";

          ctx.beginPath();
          ctx.moveTo(xStart, yStart);
          ctx.lineTo(xEnd, yEnd);
          ctx.stroke();
        }

        // Spin stardust orbits around centered cover
        if (particlesRef.current.length < 80 || !particlesRef.current[0]?.angle) {
          particlesRef.current = [];
          for (let i = 0; i < 80; i++) {
            particlesRef.current.push({
              angle: Math.random() * Math.PI * 2,
              orbitRadius: radBase + 15 + Math.random() * 65,
              rotSpeed: (Math.random() * 0.012 + 0.003),
              pSize: Math.random() * 1.8 + 0.6,
              opacity: Math.random() * 0.7 + 0.3,
            });
          }
        }

        particlesRef.current.forEach((p) => {
          p.angle += p.rotSpeed * (1.0 + smoothedMid * 2.2);
          const breathingShift = Math.sin(Date.now() * 0.0022 + p.orbitRadius) * (smoothedBass * 14);
          const currentRadius = p.orbitRadius + breathingShift;

          const px = Math.cos(p.angle) * currentRadius;
          const py = Math.sin(p.angle) * currentRadius;

          ctx.shadowBlur = 6 * settings.glowStrength;
          ctx.shadowColor = "rgba(251, 191, 36, 0.45)";
          ctx.fillStyle = `rgba(255, 235, 190, ${p.opacity * (0.55 + smoothedHigh * 0.45)})`;

          ctx.beginPath();
          ctx.arc(px, py, p.pSize * (1.0 + smoothedHigh * 0.7), 0, Math.PI * 2);
          ctx.fill();
        });

        // Clip and render user album Cover Art directly inside canvas structure
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, reactiveCoreRad, 0, Math.PI * 2);
        ctx.clip();

        if (loadedImage) {
          ctx.rotate(rotationAngleRef.current);
          drawImageCover(
            ctx,
            loadedImage,
            -reactiveCoreRad,
            -reactiveCoreRad,
            reactiveCoreRad * 2,
            reactiveCoreRad * 2
          );
          ctx.rotate(-rotationAngleRef.current);
        } else {
          // B&O Gold Turntable vinyl backing fallback
          ctx.fillStyle = "#12141a";
          ctx.fill();
          ctx.fillStyle = "#dba960";
          ctx.beginPath();
          ctx.arc(0, 0, reactiveCoreRad * 0.3, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
          ctx.lineWidth = 1;
          for (let rFactor = 0.5; rFactor <= 0.85; rFactor += 0.15) {
            ctx.beginPath();
            ctx.arc(0, 0, reactiveCoreRad * rFactor, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();

        // High gloss luxury metallic cover bezel
        ctx.shadowBlur = 18 * settings.glowStrength;
        ctx.shadowColor = "rgba(212, 175, 55, 0.55)";
        
        const metallicGrad = ctx.createLinearGradient(-reactiveCoreRad, -reactiveCoreRad, reactiveCoreRad, reactiveCoreRad);
        metallicGrad.addColorStop(0, "rgba(130, 80, 30, 0.9)");
        metallicGrad.addColorStop(0.25, "rgba(251, 191, 36, 0.9)"); // Bright Gold
        metallicGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)"); // Chrome Highlight
        metallicGrad.addColorStop(0.75, "rgba(245, 158, 11, 0.9)"); // Gold
        metallicGrad.addColorStop(1, "rgba(130, 80, 30, 0.9)");
        
        ctx.strokeStyle = metallicGrad;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(0, 0, reactiveCoreRad + 1.2, 0, Math.PI * 2);
        ctx.stroke();

        // Stylized spindle center hole
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#020305";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.translate(-centerX, -centerY);

      } else if (settings.type === "neon_perspective") {
        // --- 3. CYBERPUNK PERSPECTIVE RIFT ---
        // A breathtaking 3D synthwave rift valley deforming on mid/bass frequencies
        const horizonRatio = height * 0.35;
        ctx.fillStyle = "#040508";
        ctx.fillRect(0, 0, width, height);

        // Perspective roads from horizon center down to bottom
        const linesCount = 14;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.12 + smoothedBass * 0.16})`; // pulsing purple lanes
        ctx.shadowBlur = 0;

        for (let i = -linesCount; i <= linesCount; i++) {
          const spreadFactor = (i * width) / linesCount;
          ctx.beginPath();
          ctx.moveTo(centerX, horizonRatio);
          ctx.lineTo(centerX + spreadFactor * 1.6, height);
          ctx.stroke();
        }

        // Perspective horizontal lines warping on bass hits
        const horizontalLinesCount = 12;
        ctx.strokeStyle = "rgba(6, 182, 212, 0.11)"; // Cyan horizon mesh
        for (let j = 0; j < horizontalLinesCount; j++) {
          const normY = j / (horizontalLinesCount - 1);
          // quadratic scaling for true 3D perspective projection
          const projectY = horizonRatio + normY * normY * (height - horizonRatio) + (smoothedBass * 9 * normY);
          ctx.beginPath();
          ctx.moveTo(0, projectY);
          ctx.lineTo(width, projectY);
          ctx.stroke();
        }

        // Spectrogram mountain ridges/walls along left & right borders
        const steps = 28;
        const leftRidge: { x: number; y: number }[] = [];
        const rightRidge: { x: number; y: number }[] = [];

        for (let i = 0; i < steps; i++) {
          const factor = i / (steps - 1);
          const drawY = horizonRatio + factor * (height - horizonRatio);

          const matchFreq = Math.floor(factor * bufferLength * 0.65);
          const value = dataArray[matchFreq] / 255;
          const peakValEx = Math.pow(value, 1.45) * 44 * (0.35 + factor * 1.3) * settings.colorIntensity;

          // Align ridge bounds
          const normalLeftWall = (width * 0.13) * (1.0 - factor);
          const normalRightWall = width - (width * 0.13) * (1.0 - factor);

          leftRidge.push({ x: normalLeftWall - peakValEx, y: drawY });
          rightRidge.push({ x: normalRightWall + peakValEx, y: drawY });
        }

        // Draw Left Canyon Wall surface fill
        const leftCanyonGrad = ctx.createLinearGradient(0, horizonRatio, 0, height);
        leftCanyonGrad.addColorStop(0, "rgba(219, 39, 119, 0.05)");
        leftCanyonGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.35)");
        leftCanyonGrad.addColorStop(1, "rgba(6, 182, 212, 0.75)");

        ctx.fillStyle = leftCanyonGrad;
        ctx.beginPath();
        ctx.moveTo(width * 0.13, horizonRatio);
        leftRidge.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(0, height);
        ctx.lineTo(0, horizonRatio);
        ctx.closePath();
        ctx.fill();

        // Neon outline left
        ctx.strokeStyle = "rgba(236, 72, 153, 0.85)";
        ctx.lineWidth = 1.8 * settings.barWidthMultiplier;
        ctx.shadowBlur = 14 * settings.glowStrength;
        ctx.shadowColor = "rgba(236, 72, 153, 0.6)";
        ctx.beginPath();
        ctx.moveTo(width * 0.13, horizonRatio);
        leftRidge.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();

        // Draw Right Canyon Wall surface fill
        const rightCanyonGrad = ctx.createLinearGradient(0, horizonRatio, 0, height);
        rightCanyonGrad.addColorStop(0, "rgba(219, 39, 119, 0.05)");
        rightCanyonGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.35)");
        rightCanyonGrad.addColorStop(1, "rgba(6, 182, 212, 0.75)");

        ctx.fillStyle = rightCanyonGrad;
        ctx.beginPath();
        ctx.moveTo(width - (width * 0.13), horizonRatio);
        rightRidge.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(width, height);
        ctx.lineTo(width, horizonRatio);
        ctx.closePath();
        ctx.fill();

        // Neon outline right
        ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
        ctx.shadowColor = "rgba(6, 182, 212, 0.6)";
        ctx.beginPath();
        ctx.moveTo(width - (width * 0.13), horizonRatio);
        rightRidge.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();

        // Radiant retro sunset glowing in distance
        ctx.shadowBlur = 35 * settings.glowStrength;
        ctx.shadowColor = "rgba(168, 85, 247, 0.45)";
        const sunsetGlow = ctx.createRadialGradient(centerX, horizonRatio, 1, centerX, horizonRatio, 45 + smoothedBass * 40);
        sunsetGlow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        sunsetGlow.addColorStop(0.2, "rgba(219, 39, 119, 0.65)");
        sunsetGlow.addColorStop(0.6, "rgba(168, 85, 247, 0.2)");
        sunsetGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = sunsetGlow;
        ctx.beginPath();
        ctx.arc(centerX, horizonRatio, 45 + smoothedBass * 40, 0, Math.PI * 2);
        ctx.fill();

      } else if (settings.type === "audio_ring") {
        // --- 4. ETHEREAL SOUND LOOP RINGS ---
        // Organic concentric harmonizer rings resembling hyper-premium smart screens
        ctx.translate(centerX, centerY);

        const rings = [
          { r: Math.min(width, height) / 5.2, band: "bass", color: "rgba(245, 158, 11, ", phaseCount: 4, sizeAmp: 30, speed: 0.0025, direction: 1 },  // Bass ring
          { r: Math.min(width, height) / 3.6, band: "mid", color: "rgba(168, 85, 247, ", phaseCount: 7, sizeAmp: 38, speed: -0.0016, direction: -1.2 }, // Vocal mid ring
          { r: Math.min(width, height) / 2.6, band: "high", color: "rgba(6, 182, 212, ", phaseCount: 11, sizeAmp: 44, speed: 0.002, direction: 0.8 },  // Air high ring
        ];

        ctx.shadowBlur = 20 * settings.glowStrength;

        rings.forEach((ringConfig, rIdx) => {
          const stepsCount = 160;
          const deltaAng = (Math.PI * 2) / stepsCount;

          const ringIntensity = ringConfig.band === "bass" ? smoothedBass : ringConfig.band === "mid" ? smoothedMid : smoothedHigh;
          const scrollFactor = Date.now() * ringConfig.speed;
          const outerAngleOffset = Date.now() * 0.00028 * ringConfig.direction;

          ctx.shadowColor = `${ringConfig.color} 0.55)`;
          ctx.strokeStyle = `${ringConfig.color} 1.0)`;
          ctx.lineWidth = (4.0 - rIdx) * settings.barWidthMultiplier * 0.72;

          ctx.beginPath();
          for (let i = 0; i <= stepsCount; i++) {
            const angle = i * deltaAng + outerAngleOffset;
            const sineWave = Math.sin(angle * ringConfig.phaseCount + scrollFactor) * ringIntensity * ringConfig.sizeAmp * settings.colorIntensity;
            const currentRad = ringConfig.r + sineWave;

            const rx = Math.cos(angle) * currentRad;
            const ry = Math.sin(angle) * currentRad;

            if (i === 0) {
              ctx.moveTo(rx, ry);
            } else {
              ctx.lineTo(rx, ry);
            }
          }
          ctx.closePath();
          ctx.stroke();

          // Outer secondary frequency spikes sprouting radially from the loops (mid-stage only)
          if (rIdx === 1) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = `${ringConfig.color} 0.28)`;
            ctx.beginPath();
            for (let i = 0; i < stepsCount; i += 3) {
              const angle = i * deltaAng + outerAngleOffset;
              const sineWave = Math.sin(angle * ringConfig.phaseCount + scrollFactor) * ringIntensity * ringConfig.sizeAmp * settings.colorIntensity;
              const baseRad = ringConfig.r + sineWave;

              const x1 = Math.cos(angle) * baseRad;
              const y1 = Math.sin(angle) * baseRad;
              const extraHeight = (dataArray[Math.floor(i % bufferLength)] / 255) * 16 * settings.colorIntensity;
              const x2 = Math.cos(angle) * (baseRad + extraHeight);
              const y2 = Math.sin(angle) * (baseRad + extraHeight);

              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
            }
            ctx.stroke();
          }
        });

        // Add a core high-contrast concentric ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(width, height) / 9.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.translate(-centerX, -centerY);

      } else if (settings.type === "cosmic_mandala") {
        // --- 5. COSMIC MANDALA PORTAL (Photo 1 Style) ---
        // Rotating sacred geometry portal with radiating spikes & central orbs
        const scaleFactor = isCompact ? 2.8 : 5.2;
        const radBase = Math.min(width, height) / scaleFactor;
        const reactiveCoreRad = radBase * (1.1 + smoothedBass * 0.28 * settings.colorIntensity);
        ctx.translate(centerX, centerY);

        rotationAngleRef.current += 0.0055 + (smoothedBass * 0.015);

        // Render back fuzzy glass blobs
        const blobCount = 4;
        for (let i = 0; i < blobCount; i++) {
          const angle = (i * Math.PI / 2) + rotationAngleRef.current * 0.45;
          const dist = 32 + smoothedBass * 45;
          const bx = Math.cos(angle) * dist;
          const by = Math.sin(angle) * dist;
          const size = 60 + smoothedMid * 75;
          
          let blobColor = "rgba(168, 85, 247, 0.16)"; // purple
          if (i === 1) blobColor = "rgba(236, 72, 153, 0.16)"; // hot pink
          else if (i === 2) blobColor = "rgba(6, 182, 212, 0.16)"; // cyan
          else if (i === 3) blobColor = "rgba(251, 191, 36, 0.14)"; // amber

          const blobGrad = ctx.createRadialGradient(bx, by, 5, bx, by, size);
          blobGrad.addColorStop(0, blobColor);
          blobGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = blobGrad;
          ctx.beginPath();
          ctx.arc(bx, by, size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Concentric geometric rings with alternating speed rotation
        ctx.shadowBlur = 15 * settings.glowStrength;
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const rRadius = reactiveCoreRad * (1.0 + rIdx * 0.42);
          const rAngle = rotationAngleRef.current * (rIdx % 2 === 0 ? 0.6 : -0.8);
          ctx.strokeStyle = rIdx === 0 
            ? `rgba(236, 72, 153, ${0.45 + smoothedMid * 0.45})` 
            : rIdx === 1 
              ? `rgba(6, 182, 212, ${0.4 + smoothedHigh * 0.45})` 
              : `rgba(251, 191, 36, ${0.3 + smoothedBass * 0.35})`;
          ctx.lineWidth = 1.35 * settings.barWidthMultiplier;
          ctx.shadowColor = ctx.strokeStyle as string;

          ctx.beginPath();
          ctx.setLineDash([4 + rIdx * 6, 8 + rIdx * 4]);
          ctx.arc(0, 0, rRadius, rAngle, rAngle + Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Concentric high-density sound spikes radiating outwards
        const numLasers = 180;
        const angleStep = (Math.PI * 2) / numLasers;
        for (let i = 0; i < numLasers; i++) {
          const angle = i * angleStep + rotationAngleRef.current * 0.18;
          const mapIndex = Math.floor((i / numLasers) * bufferLength * 0.72);
          const rawAmp = dataArray[mapIndex] / 255;
          const ampHeight = Math.pow(rawAmp, 1.7) * 90 * settings.colorIntensity;

          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const startX = cos * reactiveCoreRad;
          const startY = sin * reactiveCoreRad;
          const endX = cos * (reactiveCoreRad + ampHeight);
          const endY = sin * (reactiveCoreRad + ampHeight);

          const cycleColor = Math.floor((i / numLasers) * 3);
          const itemGrad = ctx.createLinearGradient(startX, startY, endX, endY);
          if (cycleColor === 0) {
            itemGrad.addColorStop(0, "rgba(236, 72, 153, 0.95)"); // hot pink
            itemGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.6)"); // violet
            itemGrad.addColorStop(1, "rgba(6, 182, 212, 0)"); // cyan transparency fade
          } else if (cycleColor === 1) {
            itemGrad.addColorStop(0, "rgba(6, 182, 212, 0.95)"); // cyan
            itemGrad.addColorStop(0.5, "rgba(34, 197, 94, 0.6)"); // emerald
            itemGrad.addColorStop(1, "rgba(251, 191, 36, 0)"); // amber transparency fade
          } else {
            itemGrad.addColorStop(0, "rgba(251, 191, 36, 0.95)"); // amber
            itemGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.6)"); // red
            itemGrad.addColorStop(1, "rgba(236, 72, 153, 0)"); // pink transparency fade
          }

          ctx.strokeStyle = itemGrad;
          ctx.lineWidth = 1.25 * settings.barWidthMultiplier;
          ctx.shadowBlur = 8 * settings.glowStrength;
          ctx.shadowColor = cycleColor === 0 
            ? "rgba(236, 72, 153, 0.35)" 
            : cycleColor === 1 
              ? "rgba(6, 182, 212, 0.35)" 
              : "rgba(251, 191, 36, 0.35)";

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // Clip and draw album cover in center of mandala ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, reactiveCoreRad * 0.9, 0, Math.PI * 2);
        ctx.clip();

        if (loadedImage) {
          ctx.rotate(-rotationAngleRef.current * 0.16);
          drawImageCover(
            ctx,
            loadedImage,
            -reactiveCoreRad * 0.9,
            -reactiveCoreRad * 0.9,
            reactiveCoreRad * 1.8,
            reactiveCoreRad * 1.8
          );
          ctx.rotate(rotationAngleRef.current * 0.16);
        } else {
          const fallbackGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, reactiveCoreRad);
          fallbackGrad.addColorStop(0, "rgba(15, 23, 42, 1.0)");
          fallbackGrad.addColorStop(0.5, "rgba(30, 41, 59, 1.0)");
          fallbackGrad.addColorStop(1, "rgba(251, 191, 36, 0.4)");
          ctx.fillStyle = fallbackGrad;
          ctx.fill();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
          ctx.lineWidth = 1.1;
          for (let leaf = 0; leaf < 8; leaf++) {
            const rotAng = (leaf * Math.PI) / 4;
            ctx.rotate(rotAng);
            ctx.beginPath();
            ctx.ellipse(0, -reactiveCoreRad * 0.35, reactiveCoreRad * 0.15, reactiveCoreRad * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.rotate(-rotAng);
          }
        }
        ctx.restore();

        // Elegant glass outer gold rim highlight
        ctx.shadowBlur = 18 * settings.glowStrength;
        ctx.shadowColor = "rgba(251, 191, 36, 0.65)";
        
        const mandalaRimGrad = ctx.createLinearGradient(-reactiveCoreRad, -reactiveCoreRad, reactiveCoreRad, reactiveCoreRad);
        mandalaRimGrad.addColorStop(0, "rgba(236, 72, 153, 0.85)");
        mandalaRimGrad.addColorStop(0.5, "rgba(251, 191, 36, 0.95)");
        mandalaRimGrad.addColorStop(1, "rgba(6, 182, 212, 0.85)");

        ctx.strokeStyle = mandalaRimGrad;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, reactiveCoreRad * 0.9 + 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.translate(-centerX, -centerY);
        ctx.shadowBlur = 0;

      } else if (settings.type === "liquid_terrain") {
        // --- 6. GLOWING AUDIO TERRAIN (Photo 2 Style) ---
        // Beautiful floating multi-layered particle terrain waves flowing like rich silk ribbons
        ctx.fillStyle = "#030408"; 
        ctx.fillRect(0, 0, width, height);

        const layersCount = 4;
        const ptsCount = 38;
        const xStep = width / (ptsCount - 1);

        ctx.shadowBlur = 12 * settings.glowStrength;

        for (let layer = 0; layer < layersCount; layer++) {
          const baseHeightRatio = 0.54 + (layer * 0.11); 
          const layerBaseY = height * baseHeightRatio;

          let bandVolume = smoothedMid;
          if (layer === 0) bandVolume = smoothedBass;
          else if (layer === 3) bandVolume = smoothedHigh;

          let strokeColor = "rgba(168, 85, 247, 0.85)"; // Purple
          let shadowColor = "rgba(168, 85, 247, 0.45)";
          let fillColor = "rgba(168, 85, 247, 0.05)";

          if (layer === 1) {
            strokeColor = "rgba(236, 72, 153, 0.85)"; // Pink
            shadowColor = "rgba(236, 72, 153, 0.45)";
            fillColor = "rgba(236, 72, 153, 0.05)";
          } else if (layer === 2) {
            strokeColor = "rgba(6, 182, 212, 0.88)"; // Electric Cyan
            shadowColor = "rgba(6, 182, 212, 0.45)";
            fillColor = "rgba(6, 182, 212, 0.05)";
          } else if (layer === 3) {
            strokeColor = "rgba(34, 197, 94, 0.88)"; // Neon green
            shadowColor = "rgba(34, 197, 94, 0.45)";
            fillColor = "rgba(34, 197, 94, 0.05)";
          }

          ctx.strokeStyle = strokeColor;
          ctx.shadowColor = shadowColor;
          ctx.lineWidth = (2.4 - layer * 0.35) * settings.barWidthMultiplier;

          const layerPts: { x: number; y: number }[] = [];
          for (let i = 0; i < ptsCount; i++) {
            const px = i * xStep;
            
            const symIndex = i < ptsCount / 2 ? i : (ptsCount - 1 - i);
            const freqBin = Math.floor((symIndex / (ptsCount / 2)) * bufferLength * 0.6);
            const rawAmp = dataArray[freqBin] / 255;
            const reactiveHeight = Math.pow(rawAmp, 1.5) * 75 * settings.colorIntensity * (0.35 + (layer + 1) * 0.22);

            const phase = Date.now() * (0.0014 + layer * 0.0006) + (i * 0.22);
            const waveOsc = Math.sin(phase) * (14 + layer * 4);

            const py = layerBaseY - reactiveHeight + waveOsc;
            layerPts.push({ x: px, y: py });
          }

          ctx.beginPath();
          ctx.moveTo(0, height);
          layerPts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();

          ctx.beginPath();
          layerPts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else {
              const prev = layerPts[i - 1];
              const cpX1 = prev.x + xStep / 2;
              const cpY1 = prev.y;
              const cpX2 = pt.x - xStep / 2;
              const cpY2 = pt.y;
              ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, pt.x, pt.y);
            }
          });
          ctx.stroke();

          ctx.shadowBlur = 12 * settings.glowStrength;
          ctx.fillStyle = "#ffffff";
          for (let i = 2; i < ptsCount - 2; i += 2) {
            const pt = layerPts[i];
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, (2.0 + bandVolume * 2.8), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;

      } else if (settings.type === "retro_glass") {
        // --- 5. RETRO GLASS BENTO COLUMNS ("retro_glass" default fallback) ---
        // Exquisite floating glass equalizer bento bars with physics-driven gravity peak particles
        const totalPills = 14;
        const gapStep = 7;
        const pillWidth = (width - (totalPills - 1) * gapStep - 20) / totalPills;

        ctx.shadowBlur = 0;
        ctx.translate(10, 0);

        for (let i = 0; i < totalPills; i++) {
          const mapIndex = Math.floor(Math.pow(i / totalPills, 1.35) * (bufferLength * 0.75));
          const value = dataArray[mapIndex] / 255;
          const activeAmp = Math.pow(value, 1.25) * settings.colorIntensity;
          const pillHeight = activeAmp * (height * 0.7);

          const px = i * (pillWidth + gapStep);
          const py = height - pillHeight - 14;

          // Round Rect Utility
          const drawRoundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
            c.beginPath();
            c.moveTo(x + r, y);
            c.lineTo(x + w - r, y);
            c.quadraticCurveTo(x + w, y, x + w, y + r);
            c.lineTo(x + w, y + h - r);
            c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            c.lineTo(x + r, y + h);
            c.quadraticCurveTo(x, y + h, x, y + h - r);
            c.lineTo(x, y + r);
            c.quadraticCurveTo(x, y, x + r, y);
            c.closePath();
          };

          // Draw frosted background glass channel slot
          ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
          drawRoundRect(ctx, px, 14, pillWidth, height - 28, pillWidth / 2);
          ctx.fill();

          // Active level neon glass filling
          const colorGrad = ctx.createLinearGradient(px, height - 14, px, py);
          colorGrad.addColorStop(0, "rgba(147, 51, 234, 0.4)");  // Purple base
          colorGrad.addColorStop(0.5, "rgba(236, 72, 153, 0.72)"); // Hot Pink mid
          colorGrad.addColorStop(1, "rgba(255, 210, 210, 0.95)"); // Clear peach white peak

          ctx.fillStyle = colorGrad;
          if (pillHeight > 3) {
            ctx.shadowBlur = 12 * settings.glowStrength;
            ctx.shadowColor = "rgba(236, 72, 153, 0.4)";
            drawRoundRect(ctx, px, py, pillWidth, pillHeight, pillWidth / 2);
            ctx.fill();
          }

          // Physics computation for floating gravity peak cap structures
          const gravityConstant = 0.16;
          let currentPeak = peaksRef.current[i] || 0;
          let currentVel = peakVelsRef.current[i] || 0;

          if (pillHeight > currentPeak) {
            currentPeak = pillHeight;
            currentVel = -1.25; // instant burst lift
          } else {
            currentVel += gravityConstant;
            currentPeak -= currentVel;
            if (currentPeak < 0) {
              currentPeak = 0;
              currentVel = 0;
            }
          }

          peaksRef.current[i] = currentPeak;
          peakVelsRef.current[i] = currentVel;

          // Render falling glowing capsule beads
          const capHeightY = height - currentPeak - 19;
          if (capHeightY < height - 14) {
            ctx.shadowBlur = 15 * settings.glowStrength;
            ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";

            ctx.beginPath();
            ctx.arc(px + pillWidth / 2, capHeightY, Math.max(1.8, pillWidth * 0.38), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.translate(-10, 0);
        ctx.shadowBlur = 0;

      } else if (settings.type === "spectre_core") {
        // --- 7. SPECTRE POLYGON CORE (Trap Nation style) ---
        ctx.fillStyle = "#06070a";
        ctx.fillRect(0, 0, width, height);

        ctx.translate(centerX, centerY);

        const polygonSides = 6;
        const baseRadius = isCompact ? Math.min(width, height) * 0.35 : Math.min(width, height) * 0.22;
        const bassImpact = smoothedBass * (isCompact ? 15 : 35) * settings.colorIntensity;
        const currentRadius = baseRadius + bassImpact;

        // Draw inner glowing core
        ctx.shadowBlur = 30 * settings.glowStrength;
        ctx.shadowColor = `rgba(168, 85, 247, 0.4)`;
        ctx.fillStyle = `rgba(10, 10, 15, 0.95)`;
        ctx.beginPath();
        for (let i = 0; i <= polygonSides; i++) {
          const angle = (i * Math.PI * 2) / polygonSides - Math.PI / 2;
          const px = Math.cos(angle) * currentRadius;
          const py = Math.sin(angle) * currentRadius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Draw Album Cover in center
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= polygonSides; i++) {
          const angle = (i * Math.PI * 2) / polygonSides - Math.PI / 2;
          const px = Math.cos(angle) * currentRadius;
          const py = Math.sin(angle) * currentRadius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.clip();
        
        if (loadedImage) {
           drawImageCover(
              ctx,
              loadedImage,
              -currentRadius,
              -currentRadius,
              currentRadius * 2,
              currentRadius * 2
           );
           ctx.fillStyle = "rgba(0,0,0,0.3)";
           ctx.fill();
        }
        ctx.restore();

        // Draw audio wave along the edges
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"; 
        ctx.shadowBlur = 15 * settings.glowStrength;
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3 * settings.barWidthMultiplier;
        
        ctx.beginPath();
        for (let i = 0; i < polygonSides; i++) {
          const angleStart = (i * Math.PI * 2) / polygonSides - Math.PI / 2;
          const angleEnd = ((i + 1) * Math.PI * 2) / polygonSides - Math.PI / 2;
          
          const ptsOnEdge = 24;
          for (let j = 0; j <= ptsOnEdge; j++) {
             const t = j / ptsOnEdge;
             const ex = Math.cos(angleStart) * currentRadius * (1 - t) + Math.cos(angleEnd) * currentRadius * t;
             const ey = Math.sin(angleStart) * currentRadius * (1 - t) + Math.sin(angleEnd) * currentRadius * t;
             
             const dx = Math.cos(angleEnd) - Math.cos(angleStart);
             const dy = Math.sin(angleEnd) - Math.sin(angleStart);
             const len = Math.sqrt(dx*dx + dy*dy);
             const nx = dy / len;
             const ny = -dx / len;

             const freqIdx = Math.floor((1 - Math.abs(t - 0.5) * 2) * bufferLength * 0.4); 
             const val = (dataArray[freqIdx] / 255);
             const amp = Math.pow(val, 1.8) * 35 * settings.colorIntensity;

             // Spike outwards
             const sx = ex + nx * amp;
             const sy = ey + ny * amp;

             if (i === 0 && j === 0) ctx.moveTo(sx, sy);
             else ctx.lineTo(sx, sy);
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw outer particles
        if (particlesRef.current.length < 50 || particlesRef.current[0]?.vx === undefined) {
           particlesRef.current = [];
           for(let i=0; i<50; i++) {
             particlesRef.current.push({
               x: (Math.random() - 0.5) * currentRadius,
               y: (Math.random() - 0.5) * currentRadius,
               vx: (Math.random() - 0.5) * 5,
               vy: (Math.random() - 0.5) * 5,
               size: Math.random() * 2 + 1,
               alpha: 1,
             });
           }
        }
        
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "white";
        particlesRef.current.forEach((p) => {
           p.x += p.vx * (1 + smoothedBass * 2);
           p.y += p.vy * (1 + smoothedBass * 2);
           p.alpha -= 0.015;
           if (p.alpha <= 0) {
              const angle = Math.random() * Math.PI * 2;
              p.x = Math.cos(angle) * currentRadius;
              p.y = Math.sin(angle) * currentRadius;
              p.vx = Math.cos(angle) * (Math.random() * 2 + 1);
              p.vy = Math.sin(angle) * (Math.random() * 2 + 1);
              p.alpha = 1;
           }
           ctx.globalAlpha = p.alpha;
           ctx.beginPath();
           ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
           ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        ctx.translate(-centerX, -centerY);

      } else if (settings.type === "lux_pulse_line") {
        // --- 8. LUX PULSE LINE (Specterr pulse line style) ---
        ctx.fillStyle = "#0c0d12";
        ctx.fillRect(0, 0, width, height);

        const centerYPos = height * 0.75;
        
        ctx.beginPath();
        const ptCount = 120;
        const widthStep = width / (ptCount - 1);
        
        ctx.shadowBlur = 25 * settings.glowStrength;
        ctx.shadowColor = "rgba(236, 72, 153, 0.6)";
        
        const grad = ctx.createLinearGradient(0, centerYPos, width, centerYPos);
        grad.addColorStop(0, "rgba(6, 182, 212, 1)"); // Cyan
        grad.addColorStop(0.5, "rgba(168, 85, 247, 1)"); // Purple
        grad.addColorStop(1, "rgba(236, 72, 153, 1)"); // Pink
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4.5 * settings.barWidthMultiplier;
        
        for (let i = 0; i < ptCount; i++) {
            const distFromCenter = Math.abs((i / (ptCount - 1)) - 0.5) * 2;
            const freqIdx = Math.floor((1 - distFromCenter) * bufferLength * 0.5);
            const val = dataArray[freqIdx] / 255;
            const amp = Math.pow(val, 1.8) * height * 0.35 * settings.colorIntensity;
            
            const px = i * widthStep;
            const py = centerYPos - amp - (smoothedBass * 10);
            
            if (i === 0) {
               ctx.moveTo(px, py);
            } else {
               ctx.lineTo(px, py);
            }
        }
        ctx.stroke();

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        const gradFill = ctx.createLinearGradient(0, centerYPos-150, 0, height);
        gradFill.addColorStop(0, "rgba(168, 85, 247, 0.3)");
        gradFill.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradFill;
        ctx.fill();

        // Draw album cover floating in center above the line
        if (loadedImage) {
           const coverSize = isCompact ? Math.min(width, height) * 0.7 : Math.max(120, Math.min(width, height) * 0.35);
           const coverX = centerX - coverSize / 2;
           const offset = isCompact ? 10 : 40;
           let coverY = centerYPos - coverSize - offset - (smoothedBass * (isCompact ? 5 : 20));
           if (isCompact && coverY < 0) {
              coverY = 5; // prevent going off screen in compact mode
           }
           
           ctx.shadowBlur = 30 * settings.glowStrength;
           ctx.shadowColor = "rgba(168, 85, 247, 0.4)";
           
           ctx.beginPath();
           ctx.roundRect(coverX, coverY, coverSize, coverSize, 20);
           ctx.save();
           ctx.clip();
           drawImageCover(ctx, loadedImage, coverX, coverY, coverSize, coverSize);
           ctx.restore();
           
           ctx.strokeStyle = "rgba(255,255,255,0.15)";
           ctx.lineWidth = 2;
           ctx.stroke();
        }
        ctx.shadowBlur = 0;
      } else {
         // fallback
         ctx.fillStyle = "#000";
         ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying, settings, loadedImage, isExpanded, isSignatureSound, isCompact]);

  const getModeFriendlyName = (type: string) => {
    switch (type) {
      case "liquid_gold":
        return "Golden Silk Wave";
      case "stardust_orbit":
        return "Stardust Halo Orbit";
      case "neon_perspective":
        return "Perspective Rift";
      case "audio_ring":
        return "Ethereal Loop Rings";
      case "cosmic_mandala":
        return "Cosmic Mandala Gate";
      case "liquid_terrain":
        return "Flowing Liquid Terrain";
      case "retro_glass":
        return "Glass Bento equalizers";
      case "spectre_core":
        return "Spectre Polygon Core";
      case "lux_pulse_line":
        return "Luxury Pulse Line";
      default:
        return "Luxury Visualizer";
    }
  };

  return (
    <div 
      className={className || "w-full h-full pointer-events-auto relative flex justify-center items-center bg-black/30 border border-white/5 rounded-3xl overflow-hidden shadow-inner cursor-pointer"}
      onPointerDown={() => {
        resetHUDTimer();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        resetHUDTimer();
        if (onToggleExpand) onToggleExpand();
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full object-cover opacity-90 absolute inset-0 z-0 cursor-grab active:cursor-grabbing select-none touch-none"
      />
      
      {/* Immersive radial shadow framing */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/15 to-black/70 pointer-events-none z-10" />
      
      {/* HUD overlays */}
      <div className={`absolute inset-0 flex flex-col justify-between items-center p-3 z-25 pointer-events-none transition-all duration-700 ease-out ${showHUD ? 'opacity-100' : 'opacity-0 scale-[0.98]'}`}>
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[10px] font-black tracking-widest text-[#E0E2E8] uppercase select-none">
            {getModeFriendlyName(settings.type)}
          </span>
        </div>
        <div className="text-[8.5px] font-bold text-white/30 tracking-widest uppercase select-none animate-bounce">
          Drag to pan • Scroll to zoom • Double Click to resize
        </div>
      </div>

      {/* Deluxe Glass Tool-Bar Controllers Overlay (Z-30, pointer-events-auto) */}
      <div className={`absolute right-2 sm:right-3 z-30 pointer-events-none select-none transition-all duration-500 ease-out flex justify-between items-center ${isCompact ? "bottom-2 flex-row-reverse gap-2" : "top-3 bottom-3 flex-col"} ${showHUD ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-3 scale-95 pointer-events-none'}`}>
        
        {/* Toggle Expand Wide-screen icon */}
        {onToggleExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetHUDTimer();
              onToggleExpand();
            }}
            className={`pointer-events-auto w-8 h-8 rounded-full bg-black/55 hover:bg-black/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#E0E2E8] hover:text-white transition-all active:scale-90 shadow-lg ${isCompact ? "scale-75 opacity-50 hover:opacity-100 origin-bottom-right" : ""}`}
            title={isExpanded ? "Collapse View" : "Expand Full Width"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* Zoom controller panel */}
        <div className={`flex pointer-events-auto bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/5 shadow-xl transition-all origin-bottom-right ${isCompact ? "flex-row gap-1 scale-[0.60] opacity-40 hover:opacity-100 hover:scale-[0.70]" : "flex-col gap-1.5 md:scale-100 scale-75 md:opacity-100 opacity-70 hover:opacity-100 hover:scale-90 md:hover:scale-100"}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetHUDTimer();
              zoomRef.current = Math.min(zoomRef.current + 0.15, 6.0);
              setCurrentZoom(zoomRef.current);
            }}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#E0E2E8] hover:text-white transition-all active:scale-90"
            title="Zoom In"
          >
            <span className="font-bold text-sm leading-none">+</span>
          </button>

          {/* Quick HUD percentage or indicator */}
          {(zoomRef.current !== 1.0 || offsetXRef.current !== 0 || offsetYRef.current !== 0) ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetHUDTimer();
                zoomRef.current = 1.0;
                offsetXRef.current = 0;
                offsetYRef.current = 0;
                setCurrentZoom(1.0);
                setCurrentOffsetX(0);
                setCurrentOffsetY(0);
              }}
              className="w-7 h-7 rounded-full bg-amber-500/80 hover:bg-amber-500 flex items-center justify-center text-black font-extrabold text-[10px] transition-all active:scale-90 shadow-md animate-pulse"
              title="Reset Zoom & Pan"
            >
              ↺
            </button>
          ) : (
            <div className="w-7 h-4 flex items-center justify-center text-[8px] font-bold text-white/30 tracking-widest leading-none select-none">
              {Math.round(currentZoom * 100)}%
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              resetHUDTimer();
              zoomRef.current = Math.max(zoomRef.current - 0.15, 0.3);
              setCurrentZoom(zoomRef.current);
            }}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#E0E2E8] hover:text-white transition-all active:scale-90"
            title="Zoom Out"
          >
            <span className="font-bold text-sm leading-none">-</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function useAudioProcessor(eqSettings: any[], spatialSettings: any) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sigInRef = useRef<GainNode | null>(null);
  const sigOutRef = useRef<GainNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const widenGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const wetDetailGainRef = useRef<GainNode | null>(null);
  const bassShelfRef = useRef<BiquadFilterNode | null>(null);
  const bassPeakRef = useRef<BiquadFilterNode | null>(null);
  const exciterHighShelfRef = useRef<BiquadFilterNode | null>(null);
  const trebleAirRef = useRef<BiquadFilterNode | null>(null);
  const vocalPresenceGainRef = useRef<GainNode | null>(null);
  const vocalDeMudRef = useRef<BiquadFilterNode | null>(null);
  const vocalPresenceNodeRef = useRef<BiquadFilterNode | null>(null);
  const vocalAirRef = useRef<BiquadFilterNode | null>(null);

  const masterGainRef = useRef<GainNode | null>(null);
  const currentRouteStateRef = useRef<boolean | null>(null);

  const eqSettingsRef = useRef(eqSettings);
  const spatialSettingsRef = useRef(spatialSettings);

  useEffect(() => {
    eqSettingsRef.current = eqSettings;
    spatialSettingsRef.current = spatialSettings;
  }, [eqSettings, spatialSettings]);

  const [isSignatureSound, setIsSignatureSound] = useState(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_is_signature_sound");
      return saved === "true";
    } catch {
      return false;
    }
  });
  const isSignatureSoundRef = useRef(isSignatureSound);
  useEffect(() => {
    isSignatureSoundRef.current = isSignatureSound;
    localStorage.setItem("acoustic_presence_is_signature_sound", String(isSignatureSound));
  }, [isSignatureSound]);

  const [isContextReady, setIsContextReady] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const [audioError, setAudioError] = useState<string | null>(null);

  const initAudio = (audioElement: HTMLAudioElement) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "running") setIsContextReady(true);

      const isNewElement = connectedAudioElementRef.current !== audioElement;

      if (isNewElement) {
        if (sourceRef.current) {
          try {
            sourceRef.current.disconnect();
          } catch (e) {
            console.warn("Could not disconnect old source node:", e);
          }
          sourceRef.current = null;
        }

        sourceRef.current = ctx.createMediaElementSource(audioElement);
        connectedAudioElementRef.current = audioElement;

        if (!masterGainRef.current) {
          masterGainRef.current = ctx.createGain();
          masterGainRef.current.gain.value = 1.0;
          masterGainRef.current.connect(ctx.destination);
        }

        if (!analyserRef.current) {
          analyserRef.current = ctx.createAnalyser();
          analyserRef.current.fftSize = 128;
          analyserRef.current.smoothingTimeConstant = 0.8;
          analyserRef.current.connect(masterGainRef.current);
        }
        setAnalyser(analyserRef.current);

        if (!sigInRef.current) {
          // --- HD Signature Pipeline ---
          const pipeline = buildHDPipeline(
            ctx,
            eqSettingsRef.current,
            spatialSettingsRef.current,
          );

          sigInRef.current = pipeline.input;
          sigOutRef.current = pipeline.output;
          eqNodesRef.current = pipeline.nodes.eqNodes;
          bassShelfRef.current = pipeline.nodes.bassShelf;
          bassPeakRef.current = pipeline.nodes.bassPeak;
          wetDetailGainRef.current = pipeline.nodes.wetDetailGain;
          exciterHighShelfRef.current = pipeline.nodes.exciterHighShelf as any;
          trebleAirRef.current = pipeline.nodes.trebleAir as any;
          vocalPresenceGainRef.current = pipeline.nodes.vocalPresenceGain;
          vocalDeMudRef.current = pipeline.nodes.vocalDeMud as any;
          vocalPresenceNodeRef.current = pipeline.nodes.vocalPresenceNode as any;
          vocalAirRef.current = pipeline.nodes.vocalAir as any;
          widenGainRef.current = pipeline.nodes.widenGain;
          wetGainRef.current = pipeline.nodes.wetGain;
          dryGainRef.current = pipeline.nodes.dryGain;
        }

        // Apply corresponding audio routing
        const shouldEnableHD = isSignatureSoundRef.current;
        if (shouldEnableHD) {
          sourceRef.current.connect(sigInRef.current);
          sigOutRef.current.connect(analyserRef.current);
        } else {
          sourceRef.current.connect(analyserRef.current);
        }
        currentRouteStateRef.current = shouldEnableHD;
      }
    } catch (err: any) {
      setAudioError(err.message || "Unknown audio routing error");
      console.error(err);
    }
  };

  const updateEqNode = (
    index: number,
    param: "frequency" | "Q" | "gain",
    value: number,
  ) => {
    const node = eqNodesRef.current[index];
    if (node) {
      if (param === "frequency") node.frequency.value = value;
      else if (param === "Q") node.Q.value = value;
      else if (param === "gain") node.gain.value = value;
    }
  };

  const updateSpatial = (
    param:
      | "reverb"
      | "wideness"
      | "clarity"
      | "treble"
      | "punch"
      | "bassWeight"
      | "vocalHD",
    value: number,
  ) => {
    if (param === "reverb" && wetGainRef.current && dryGainRef.current) {
      wetGainRef.current.gain.value = value * 1.5;
      dryGainRef.current.gain.value = 1.0 - value * 0.4;
    }
    if (param === "wideness" && widenGainRef.current) {
      widenGainRef.current.gain.value = value * 1.2;
    }
    if (param === "clarity" && exciterHighShelfRef.current) {
      exciterHighShelfRef.current.gain.value = value * 8.0;
    }
    if (param === "treble" && trebleAirRef.current) {
      trebleAirRef.current.gain.value = value * 12.0;
    }
    if (param === "punch" && wetDetailGainRef.current) {
      wetDetailGainRef.current.gain.value = value;
    }
    if (param === "bassWeight" && bassShelfRef.current && bassPeakRef.current) {
      bassShelfRef.current.gain.value = value * 12.0;
      bassPeakRef.current.gain.value = value * 6.0;
    }
    if (param === "vocalHD" && vocalPresenceGainRef.current) {
      vocalPresenceGainRef.current.gain.value = value;
      if (vocalDeMudRef.current) vocalDeMudRef.current.gain.value = -2.5 * value;
      if (vocalPresenceNodeRef.current) vocalPresenceNodeRef.current.gain.value = 3.0 * value;
      if (vocalAirRef.current) vocalAirRef.current.gain.value = 2.5 * value;
    }
  };

  const toggleSignatureSound = (enable: boolean, force = false) => {
    setIsSignatureSound(enable);
    if (
      !sourceRef.current ||
      !analyserRef.current ||
      !sigInRef.current ||
      !sigOutRef.current ||
      !audioContextRef.current
    )
      return;

    if (!force && currentRouteStateRef.current === enable) {
      // Already routed correctly! Skip disconnect/connect to avoid audio glitches or temporary mutes
      return;
    }

    const ctx = audioContextRef.current;

    try {
      sourceRef.current.disconnect();
    } catch (e) {
      console.warn("Error disconnecting old sourceRef routing:", e);
    }
    try {
      sigOutRef.current.disconnect();
    } catch (e) {
      console.warn("Error disconnecting old sigOutRef routing:", e);
    }

    if (enable) {
      sourceRef.current.connect(sigInRef.current);
      sigOutRef.current.connect(analyserRef.current);
    } else {
      sourceRef.current.connect(analyserRef.current);
    }
    currentRouteStateRef.current = enable;
  };

  const resumeContext = async () => {
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      await audioContextRef.current.resume();
      setIsContextReady(true);
    }
  };

  return {
    initAudio,
    toggleSignatureSound,
    isSignatureSound,
    resumeContext,
    isContextReady,
    analyser,
    updateEqNode,
    updateSpatial,
    audioError,
    audioContextRef,
    masterGainRef,
  };
}

const EQ_BANDS_DEFAULT = [
  { name: "Deep Sub", f: 25, q: 1.4, g: 0.0, type: "peaking", fRange: [20, 30] },
  { name: "Sub", f: 40, q: 1.4, g: 0.0, type: "peaking", fRange: [30, 50] },
  {
    name: "Low Bass",
    f: 63,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [50, 80],
  },
  { name: "Bass", f: 100, q: 1.4, g: 0.0, type: "peaking", fRange: [80, 125] },
  {
    name: "Upper Bass",
    f: 160,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [125, 200],
  },
  {
    name: "Low Mid",
    f: 250,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [200, 315],
  },
  { name: "Mid", f: 400, q: 1.4, g: 0.0, type: "peaking", fRange: [315, 500] },
  {
    name: "Upper Mid",
    f: 630,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [500, 800],
  },
  {
    name: "High Mid",
    f: 1000,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [800, 1250],
  },
  {
    name: "Presence",
    f: 1600,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [1250, 2000],
  },
  {
    name: "Up Pres.",
    f: 2500,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [2000, 3150],
  },
  {
    name: "Clarity",
    f: 4000,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [3150, 5000],
  },
  {
    name: "Highs",
    f: 6300,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [5000, 8000],
  },
  {
    name: "Air",
    f: 10000,
    q: 1.4,
    g: 0.0,
    type: "peaking",
    fRange: [8000, 12500],
  },
  {
    name: "Sparkle",
    f: 16000,
    q: 1.4,
    g: 0.0,
    type: "highshelf",
    fRange: [12500, 20000],
  },
];

const PRESETS = [
  {
    id: "flat_original",
    icon: AudioLines,
    name: "Flat / Original",
    desc: "Bypass all enhancements. Sounds exactly like the original uncolored audio.",
    eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    spatial: {
      bassWeight: 0.0,
      punch: 0.0,
      vocalHD: 0.0,
      clarity: 0.0,
      treble: 0.0,
      reverb: 0.0,
      wideness: 0.0,
    },
  },
  {
    id: "ultra_hd",
    icon: Headset,
    name: "Ultra HD Master",
    desc: "Balanced 15-band enhancement for maximum detail and controlled punch.",
    eq: [
      0, 2.0, 3.5, 2.0, 0.5, -1.0, -1.5, -1.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.5,
      4.5,
    ],
    spatial: {
      bassWeight: 0.25,
      punch: 0.45,
      vocalHD: 0.6,
      clarity: 0.15,
      treble: 0.0,
      reverb: 0.15,
      wideness: 1.8,
    },
  },
  {
    id: "vocal_focus",
    icon: Mic2,
    name: "Crystal Vocal HD",
    desc: "Pushes vocals forward with extreme 4D clarity while reducing muddy frequencies.",
    eq: [
      -1.0, -1.5, -2.0, -2.5, -3.0, -2.0, -1.0, 0.5, 2.5, 4.0, 4.5, 5.0, 3.5,
      2.0, 3.0,
    ],
    spatial: {
      bassWeight: 0.1,
      punch: 0.35,
      vocalHD: 1.3,
      clarity: 0.35,
      treble: 0.0,
      reverb: 0.2,
      wideness: 1.6,
    },
  },
  {
    id: "cinematic_4d",
    icon: Film,
    name: "Cinematic 4D Spatial",
    desc: "Massive width, deep sub-bass, and immersive psychoacoustic wrapping.",
    eq: [
      6.0, 5.5, 4.0, 2.0, 0.5, -1.0, -1.0, -0.5, 1.0, 1.5, 2.0, 2.5, 3.5, 4.5,
      5.0,
    ],
    spatial: {
      bassWeight: 0.75,
      punch: 0.55,
      vocalHD: 0.4,
      clarity: 0.3,
      treble: 0.0,
      reverb: 0.55,
      wideness: 2.9,
    },
  },
  {
    id: "club_bass",
    icon: Disc3,
    name: "Booming Club Bass",
    desc: "Heavy physical 3D bass thump for modern electronic and hip-hop.",
    eq: [
      8.5, 7.5, 5.5, 2.0, 0.0, -2.0, -2.5, -2.0, -1.0, 0.0, 1.5, 2.0, 1.5, 2.5,
      3.0,
    ],
    spatial: {
      bassWeight: 0.95,
      punch: 0.85,
      vocalHD: 0.2,
      clarity: 0.1,
      treble: 0.0,
      reverb: 0.1,
      wideness: 1.5,
    },
  },
  {
    id: "pure_air",
    icon: Wind,
    name: "Audiophile Air",
    desc: "Maximum transparency, transient detail, and crystalline 4D high frequencies.",
    eq: [
      -2.0, -1.5, -1.0, -1.5, -1.0, -0.5, 0.0, 1.0, 2.0, 3.0, 4.5, 5.5, 6.0,
      7.0, 8.0,
    ],
    spatial: {
      bassWeight: 0.15,
      punch: 0.3,
      vocalHD: 0.9,
      clarity: 0.6,
      treble: 0.0,
      reverb: 0.25,
      wideness: 2.3,
    },
  },
  {
    id: "nordic_precision",
    icon: Speaker,
    name: "Nordic Acoustic Precision",
    desc: "Inspired by premium Danish engineering. Immaculate clarity, tight articulate bass, and an ultra-wide, uncolored 4D soundstage.",
    eq: [
      -0.5, 1.0, 1.5, 0.5, 0.0, -0.5, -1.0, -0.5, 0.5, 1.0, 1.5, 2.5, 3.5, 4.0,
      5.0,
    ],
    spatial: {
      bassWeight: 0.35,
      punch: 0.4,
      vocalHD: 0.6,
      clarity: 0.5,
      treble: 0.2,
      reverb: 0.15,
      wideness: 2.2,
    },
  },
  {
    id: "beosound_signature",
    icon: Sparkles,
    name: "BeoSound AI Signature",
    desc: "The pinnacle of Danish audio engineering. Intelligent harmonic excitement, multi-stage mastering, and holographic 4D spatial depth.",
    eq: [
      1.5, 2.5, 1.5, 0.0, -1.0, -1.5, -0.5, 0.0, 0.5, 1.5, 2.5, 4.0, 5.5, 7.0,
      8.5,
    ],
    spatial: {
      bassWeight: 0.55,
      punch: 0.35,
      vocalHD: 0.85,
      clarity: 0.75,
      treble: 0.5,
      reverb: 0.25,
      wideness: 2.6,
    },
  },
  {
    id: "lofi_warm",
    icon: Coffee,
    name: "Lofi Warm Analog",
    desc: "Muffled highs, emphasized mids and warm bass for a cozy, vintage vinyl feel.",
    eq: [
      1.0, 2.0, 2.5, 3.0, 2.5, 1.0, 0.5, -1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0,
    ],
    spatial: {
      bassWeight: 0.15,
      punch: 0.1,
      vocalHD: 0.2,
      clarity: 0.0,
      treble: 0.0,
      reverb: 0.1,
      wideness: 0.5,
    },
  },
  {
    id: "gaming_footsteps",
    icon: Crosshair,
    name: "Tactical FPS Gaming",
    desc: "Cut the rumble and boost upper-mid details to hear footsteps and specific audio cues.",
    eq: [
      -4.0, -3.0, -2.0, -1.0, -1.0, 0.0, 0.5, 1.0, 3.5, 5.5, 6.5, 5.5, 4.5, 2.0, 1.0,
    ],
    spatial: {
      bassWeight: 0.0,
      punch: 0.5,
      vocalHD: 0.5,
      clarity: 0.4,
      treble: 0.0,
      reverb: 0.05,
      wideness: 1.0,
    },
  },
  {
    id: "podcast_voice",
    icon: Podcast,
    name: "Podcast & Audiobook",
    desc: "Optimized for the human voice, ensuring crystal clear dialogue with a radio-like body.",
    eq: [
      -2.0, -1.5, -1.0, 1.0, 2.5, 2.0, 1.5, 1.0, 1.5, 2.5, 3.5, 3.0, 1.5, 0.5, 0.0,
    ],
    spatial: {
      bassWeight: 0.0,
      punch: 0.7,
      vocalHD: 0.8,
      clarity: 0.2,
      treble: 0.0,
      reverb: 0.0,
      wideness: 0.2,
    },
  },
  {
    id: "classic_rock",
    icon: Guitar,
    name: "Classic Rock & Live",
    desc: "Brings out the guitars, snares, and gritty bass lines for an energetic live performance feel.",
    eq: [
      1.0, 2.0, 3.0, 2.5, 1.5, 0.0, 0.5, 1.5, 2.0, 3.0, 2.5, 2.0, 2.5, 2.0, 1.5,
    ],
    spatial: {
      bassWeight: 0.1,
      punch: 0.5,
      vocalHD: 0.4,
      clarity: 0.15,
      treble: 0.0,
      reverb: 0.2,
      wideness: 1.5,
    },
  },
  {
    id: "workout_hype",
    icon: Dumbbell,
    name: "Workout Gym Hype",
    desc: "Extreme V-shape curve: Massive bass thump and piercing high-end energy to keep you moving.",
    eq: [
      6.0, 7.0, 5.0, 3.0, 1.0, -1.0, -1.5, 0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 5.5, 6.0,
    ],
    spatial: {
      bassWeight: 0.4,
      punch: 0.8,
      vocalHD: 0.5,
      clarity: 0.3,
      treble: 0.0,
      reverb: 0.15,
      wideness: 2.0,
    },
  },
];

const DEFAULT_SPATIAL = {
  bassWeight: 0.0,
  punch: 0.0,
  vocalHD: 0.0,
  clarity: 0.0,
  treble: 0.0,
  reverb: 0.0,
  wideness: 0.0,
};

export default function App() {
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("all");
  // Volume logic removed
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  
  // Stemmix states
  const [stemmixStatus, setStemmixStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [stemmixProgress, setStemmixProgress] = useState(0);
  const [separationMode, setSeparationMode] = useState<"webgpu" | "onnx" | "ai">("webgpu");
  const [stemUrls, setStemUrls] = useState<{ vocals: string | null; drums: string | null; bass: string | null; guitar: string | null; piano: string | null; other: string | null } | null>(null);
  const [stemSongInfo, setStemSongInfo] = useState<{title: string, duration: number, cover?: string, audioUrl?: string} | null>(null);
  const [stemmixError, setStemmixError] = useState("");
  const [showStemmix, setShowStemmix] = useState(true);
  // Audio elements for playback of stems
  const stemsAudioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [stemsPlaying, setStemsPlaying] = useState(false);
  const [stemsVolumes, setStemsVolumes] = useState<Record<string, number>>({
    vocals: 1, drums: 1, bass: 1, guitar: 1, piano: 1, other: 1
  });

  const [duration, setDuration] = useState<number | null>(null);
  const [sampleRate, setSampleRate] = useState<number | null>(null);

  const [eqSettings, setEqSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_eq_settings");
      return saved ? JSON.parse(saved) : EQ_BANDS_DEFAULT;
    } catch {
      return EQ_BANDS_DEFAULT;
    }
  });

  const [spatialSettings, setSpatialSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_spatial_settings");
      return saved ? JSON.parse(saved) : DEFAULT_SPATIAL;
    } catch {
      return DEFAULT_SPATIAL;
    }
  });

  const [showTuning, setShowTuning] = useState(false);

  const [showVisualizer, setShowVisualizer] = useState(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_show_visualizer");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [isVisualizerExpanded, setIsVisualizerExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_is_visualizer_expanded");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<
    "presets" | "eq" | "spatial" | "viz" | "export"
  >("presets");
  const [activeBand, setActiveBand] = useState<number>(0);

  const [visSettings, setVisSettings] = useState(() => {
    const defaultVis = {
      barWidthMultiplier: 1.4,
      barSpacing: 1.0,
      colorIntensity: 1.0,
      glowStrength: 1.0,
      type: "liquid_gold",
      palette: "ocean",
    };
    try {
      const saved = localStorage.getItem("acoustic_presence_vis_settings");
      return saved ? JSON.parse(saved) : defaultVis;
    } catch {
      return defaultVis;
    }
  });

  useEffect(() => {
    localStorage.setItem("acoustic_presence_eq_settings", JSON.stringify(eqSettings));
  }, [eqSettings]);

  useEffect(() => {
    localStorage.setItem("acoustic_presence_spatial_settings", JSON.stringify(spatialSettings));
  }, [spatialSettings]);

  useEffect(() => {
    localStorage.setItem("acoustic_presence_show_visualizer", String(showVisualizer));
  }, [showVisualizer]);

  useEffect(() => {
    localStorage.setItem("acoustic_presence_is_visualizer_expanded", String(isVisualizerExpanded));
  }, [isVisualizerExpanded]);

  useEffect(() => {
    localStorage.setItem("acoustic_presence_vis_settings", JSON.stringify(visSettings));
  }, [visSettings]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [cookiesInputText, setCookiesInputText] = useState("");
  const [cookiesStatus, setCookiesStatus] = useState<{ loaded: boolean; length: number; preview: string }>({
    loaded: false,
    length: 0,
    preview: ""
  });
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [saveCookiesMessage, setSaveCookiesMessage] = useState("");
  const [saveCookiesError, setSaveCookiesError] = useState("");

  const refreshCookiesStatus = async () => {
    try {
      const res = await fetch("/api/youtube/cookies");
      const json = await res.json();
      if (json.success && json.status) {
        setCookiesStatus(json.status);
      }
    } catch (e) {
      console.error("Failed to load youtube cookies status", e);
    }
  };

  useEffect(() => {
    const initCookies = async () => {
      const localCookies = localStorage.getItem("youtubeCookies");
      if (localCookies) {
        setCookiesInputText(localCookies);
        try {
          const saveRes = await fetch("/api/youtube/cookies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookiesText: localCookies })
          });
          const saveData = await saveRes.json();
          if (saveData.success && saveData.status) {
            setCookiesStatus(saveData.status);
          }
        } catch(e) {
          console.warn("Failed to auto-restore cookies from localStorage", e);
          refreshCookiesStatus();
        }
      } else {
        refreshCookiesStatus();
      }
    };
    initCookies();
  }, []);
  const handlePasteCookies = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setCookiesInputText(text);
          setSaveCookiesMessage("Pasted cookies from clipboard successfully!");
          setTimeout(() => setSaveCookiesMessage(""), 3000);
        } else {
          setSaveCookiesError("Clipboard is empty or contains no readable data.");
          setTimeout(() => setSaveCookiesError(""), 3000);
        }
      } else {
        setSaveCookiesError("Automatic paste not supported. Please press Ctrl+V / Cmd+V in the box.");
        setTimeout(() => setSaveCookiesError(""), 4000);
      }
    } catch (err: any) {
      console.warn("Clipboard read error:", err);
      setSaveCookiesError("Please allow clipboard permission when prompted, or manually use Ctrl+V (Cmd+V) instead.");
      setTimeout(() => setSaveCookiesError(""), 4000);
    }
  };

  const handleSaveCookies = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    
    // Determine the actual string to save
    const textToSave = overrideText !== undefined ? overrideText : cookiesInputText;
    
    setIsSavingCookies(true);
    setSaveCookiesMessage("");
    setSaveCookiesError("");
    try {
      const res = await fetch("/api/youtube/cookies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cookiesText: textToSave })
      });
      let data;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (!res.ok) throw new Error("Stemmix server returned invalid response (Status " + res.status + ")");
          throw new Error("Failed to parse JSON response");
        }
        if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update cookies");
      }
      setSaveCookiesMessage(data.message);
      setCookiesStatus(data.status);
      if (!textToSave.trim()) {
        setSaveCookiesMessage("Reset to default cookies.");
        localStorage.removeItem("youtubeCookies");
      } else {
        localStorage.setItem("youtubeCookies", textToSave);
      }
    } catch (err: any) {
      setSaveCookiesError(err.message || "An unexpected error occurred while saving cookies.");
    } finally {
      setIsSavingCookies(false);
    }
  };

  useEffect(() => {
    refreshCookiesStatus();
  }, []);

  const [tiktokUrl, setTiktokUrl] = useState("");
  const [isFetchingTiktok, setIsFetchingTiktok] = useState(false);
  const [tiktokError, setTiktokError] = useState("");

  const [recentSongs, setRecentSongs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_recent_tiktok");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("acoustic_presence_recent_tiktok", JSON.stringify(recentSongs));
  }, [recentSongs]);

  const [webgpuQuality, setWebgpuQuality] = useState<'fast' | 'high' | 'ultra' | 'pro'>(() => {
    return (localStorage.getItem("stemmix_webgpu_quality") as any) || "ultra";
  });
  const [defaultPlaylistInput, setDefaultPlaylistInput] = useState("");
  const [isSavingDefaultPlaylist, setIsSavingDefaultPlaylist] = useState(false);
  const [saveDefaultMsg, setSaveDefaultMsg] = useState("");
  const [saveDefaultErr, setSaveDefaultErr] = useState("");
  const [saveQueueSuccess, setSaveQueueSuccess] = useState(false);

  const handleLoadDefaultPlaylist = async (forceClean = false) => {
    try {
      const res = await fetch("/api/default-songs");
      const json = await res.json();
      if (json.success && json.songs && json.songs.length > 0) {
        setRecentSongs(json.songs);
        if (forceClean || !currentSong) {
          const firstSong = json.songs[0];
          setCurrentSong(firstSong);
          let playUrl = firstSong.audioUrl;
          if (playUrl && (playUrl.includes("nct.vn") || playUrl.includes("nhaccuatui.com")) && !playUrl.includes("/api/proxy-stream")) {
            playUrl = `/api/proxy-stream?url=${encodeURIComponent(playUrl)}`;
          }
          setAudioUrl(playUrl);
          setFileName(firstSong.title || "Default Song");
        }
        return true;
      }
    } catch (e) {
      console.error("Failed to load default playlist config", e);
    }
    return false;
  };

  // Load server-configured default playlist on startup if browser storage is empty
  useEffect(() => {
    const saved = localStorage.getItem("acoustic_presence_recent_tiktok");
    if (!saved || JSON.parse(saved).length === 0) {
      handleLoadDefaultPlaylist();
    } else {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.length > 0) {
        const firstSong = parsed[0];
        setCurrentSong(firstSong);
        let playUrl = firstSong.audioUrl;
        if (playUrl && (playUrl.includes("nct.vn") || playUrl.includes("nhaccuatui.com")) && !playUrl.includes("/api/proxy-stream")) {
          playUrl = `/api/proxy-stream?url=${encodeURIComponent(playUrl)}`;
        }
        setAudioUrl(playUrl);
        setFileName(firstSong.title || "Default Song");
      }
    }
  }, []);

  const handleSaveCurrentQueueAsDefault = async () => {
    try {
      const res = await fetch("/api/nhaccuatui/save-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ songs: recentSongs })
      });
      let data;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (!res.ok) throw new Error("Stemmix server returned invalid response (Status " + res.status + ")");
          throw new Error("Failed to parse JSON response");
        }
        if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save playlist");
      }
      setSaveQueueSuccess(true);
      setTimeout(() => setSaveQueueSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveDefaultPlaylistLink = async () => {
    setIsSavingDefaultPlaylist(true);
    setSaveDefaultMsg("");
    setSaveDefaultErr("");
    try {
      const res = await fetch("/api/nhaccuatui/save-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: defaultPlaylistInput })
      });
      let data;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (!res.ok) throw new Error("Stemmix server returned invalid response (Status " + res.status + ")");
          throw new Error("Failed to parse JSON response");
        }
        if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse or save playlist");
      }
      setSaveDefaultMsg(`Successfully set! Default playlist saved; loaded ${data.songs?.length || 0} songs.`);
      if (data.songs && data.songs.length > 0) {
        setRecentSongs(data.songs);
      }
      setDefaultPlaylistInput("");
      setTimeout(() => setSaveDefaultMsg(""), 4000);
    } catch (err: any) {
      setSaveDefaultErr(err.message || "An unexpected error occurred.");
      setTimeout(() => setSaveDefaultErr(""), 5000);
    } finally {
      setIsSavingDefaultPlaylist(false);
    }
  };

  const [playlistTab, setPlaylistTab] = useState<"upnext" | "albums" | "guide" | "community" | "search">("upnext");

  const [tiktokSearchType, setTiktokSearchType] = useState<"sound" | "video" | "youtube" | "nhaccuatui" | "tkaraoke">("youtube");
  const [tiktokSearchQuery, setTiktokSearchQuery] = useState("");
  const [tiktokSearchResults, setTiktokSearchResults] = useState<any[]>([]);
  const [tiktokSearchPage, setTiktokSearchPage] = useState(1);
  const [tiktokSearchHasMore, setTiktokSearchHasMore] = useState(false);
  const [tiktokSearchError, setTiktokSearchError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSearchingTiktok, setIsSearchingTiktok] = useState(false);

  useEffect(() => {
    localStorage.setItem("acoustic_presence_recent_searches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const isYt = tiktokSearchType === "youtube";
      const res = await fetch(`/api/search/suggest?yt=${isYt}&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions", e);
    }
  };

  const handleTiktokSearch = async (
    e?: React.FormEvent,
    isLoadMore = false,
    typeOverride?: string,
    queryOverride?: string
  ) => {
    if (e) e.preventDefault();
    const activeType = typeOverride || tiktokSearchType;
    const activeQuery = (queryOverride !== undefined ? queryOverride : tiktokSearchQuery).trim();
    
    if (!activeQuery) return;
    
    const page = isLoadMore ? tiktokSearchPage + 1 : 1;
    
    setIsSearchingTiktok(true);
    if (!isLoadMore) {
      setTiktokSearchError("");
      setTiktokSearchResults([]);
      setShowSuggestions(false);
    }
    
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== activeQuery.toLowerCase());
      return [activeQuery, ...filtered].slice(0, 8);
    });
    
    try {
      let endpoint = "";
      if (activeType === "youtube") {
        endpoint = `/api/youtube/search?q=${encodeURIComponent(activeQuery)}`;
      } else if (activeType === "nhaccuatui") {
        endpoint = `/api/nct-search?q=${encodeURIComponent(activeQuery)}`;
      } else if (activeType === "tkaraoke") {
        endpoint = `/api/tkaraoke/search?q=${encodeURIComponent(activeQuery)}&p=${page}`;
      } else {
        // TikTok search ('sound' or 'video')
        endpoint = `/api/tiktok/search?type=${activeType}&q=${encodeURIComponent(activeQuery)}`;
      }
      
      const res = await fetch(endpoint);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search request failed");
      }
      
      const data = await res.json();
      const results = data.videos || [];
      
      if (isLoadMore) {
        setTiktokSearchResults(prev => {
          const newResults = results.filter((r: any) => !prev.some((p: any) => (p.id || p.video_id || p.url) === (r.id || r.video_id || r.url)));
          return [...prev, ...newResults];
        });
      } else {
        setTiktokSearchResults(results);
      }
      setTiktokSearchPage(page);
      setTiktokSearchHasMore(activeType === "tkaraoke" && results.length >= 10);
    } catch (err: any) {
      console.error(err);
      if (!isLoadMore) {
        setTiktokSearchError(err.message || "Failed to find search results. Please try another query.");
      }
    } finally {
      setIsSearchingTiktok(false);
    }
  };

  // Community Share & Real-time Sync states & functions
  const [communityTracks, setCommunityTracks] = useState<any[]>([]);
  const [communityViewMode, setCommunityViewMode] = useState<"grid" | "list">("grid");
  const [firebaseUsernames, setFirebaseUsernames] = useState<any[]>([]);
  const [communityNickname, setCommunityNickname] = useState(() => {
    return localStorage.getItem("acoustic_presence_nickname") || "Acoustic Lover";
  });

  const [isSharingToCommunity, setIsSharingToCommunity] = useState(false);
  const [communityError, setCommunityError] = useState("");
  const [communitySuccess, setCommunitySuccess] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");

  // Initialize Anonymous Firebase login for seamless security rule validation
  useEffect(() => {
    initAuth();
  }, []);

  // Sync nickname preference to client storage
  useEffect(() => {
    localStorage.setItem("acoustic_presence_nickname", communityNickname);
  }, [communityNickname]);

  // Real-time Listener for shared TikTok Usernames from Firestore database
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "shared_usernames"), (snapshot) => {
        const ulist: any[] = [];
        snapshot.forEach((docSnap) => {
          ulist.push(docSnap.data());
        });
        setFirebaseUsernames(ulist);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "shared_usernames");
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore Username real-time subscription issue:", err);
    }
  }, []);

  // Real-time Listener for shared general track links from Firestore database
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "shared_tracks"), (snapshot) => {
        const tlist: any[] = [];
        snapshot.forEach((docSnap) => {
          tlist.push(docSnap.data());
        });
        // Sort tracks so newer or liked tracks appear beautifully
        tlist.sort((a, b) => {
          const tA = a.sharedAt ? new Date(a.sharedAt).getTime() : 0;
          const tB = b.sharedAt ? new Date(b.sharedAt).getTime() : 0;
          return tB - tA;
        });
        setCommunityTracks(tlist);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "shared_tracks");
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore Track real-time subscription issue:", err);
    }
  }, []);

  // Share or unshare creator username in community database
  const handleToggleShareUsername = async (alb: any) => {
    setCommunityError("");
    setCommunitySuccess("");
    try {
      const sanitizedId = alb.username.toLowerCase().replace(/[^a-zA-Z0-9_\-]/g, "_");
      const isShared = firebaseUsernames.some(u => u.username.toLowerCase() === alb.username.toLowerCase());

      if (isShared) {
        // Tapped/Shared already -> untap to REMOVE
        await deleteDoc(doc(db, "shared_usernames", sanitizedId));
        setCommunitySuccess(`Unshared creator @${alb.username} from group database!`);
        setTimeout(() => setCommunitySuccess(""), 3000);
      } else {
        // Untapped/Not shared -> tap to CREATE
        const docData = {
          id: sanitizedId,
          username: alb.username,
          displayName: alb.displayName || `@${alb.username}`,
          avatarSub: alb.avatarSub || alb.username.slice(0, 2).toUpperCase(),
          sharedBy: communityNickname.trim() || "Anonymous Listener",
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "shared_usernames", sanitizedId), docData);
        setCommunitySuccess(`Shared creator @${alb.username} with travelers!`);
        setTimeout(() => setCommunitySuccess(""), 4500);
      }
    } catch (error) {
      console.error("Failed to sync shared username to Firestore:", error);
      setCommunityError("Failed to update shared creator. Verify your internet connection.");
      setTimeout(() => setCommunityError(""), 5000);
    }
  };

  // Toggle share/unshare of any fetched general music links (YouTube, Facebook, NCT, or TikTok URLs)
  const handleToggleShareTrack = async (track: any) => {
    setCommunityError("");
    setCommunitySuccess("");
    try {
      // Find if this URL has been shared inside Firestore already
      const sharedTrack = communityTracks.find(t => t.originalUrl === track.originalUrl);

      if (sharedTrack) {
        // Already shared - untap to DELETE
        await deleteDoc(doc(db, "shared_tracks", sharedTrack.id));
        setCommunitySuccess(`Removed "${track.title || "fetched song"}" from shared community library.`);
        setTimeout(() => setCommunitySuccess(""), 3000);
      } else {
        // Not shared - tap to CREATE
        const newDocRef = doc(collection(db, "shared_tracks"));
        const docData = {
          id: newDocRef.id,
          title: track.title || "Shared Audio",
          author: track.author || "Unknown Artist",
          cover: track.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100",
          duration: track.duration || 0,
          audioUrl: track.audioUrl || "",
          originalUrl: track.originalUrl || "",
          sharedBy: communityNickname.trim() || "Anonymous Listener",
          sharedAt: new Date().toISOString(),
          likes: 0
        };
        await setDoc(newDocRef, docData);
        setCommunitySuccess(`Shared "${track.title || "fetched song"}" with travelers!`);
        setTimeout(() => setCommunitySuccess(""), 4500);
      }
    } catch (error) {
      console.error("Failed to sync shared track to Firestore:", error);
      setCommunityError("Could not update document inside Firestore database.");
      setTimeout(() => setCommunityError(""), 5000);
    }
  };

  // Upvote/Like general track in community database
  const handleLikeCommunityTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const docRef = doc(db, "shared_tracks", id);
      const currentLikes = communityTracks.find(t => t.id === id)?.likes || 0;
      await setDoc(docRef, { likes: currentLikes + 1 }, { merge: true });
    } catch (err) {
      console.error("Failed to like Firestore track:", err);
    }
  };

  const playCommunityTrack = (track: any) => {
    // Standard playback translation object template matching player expectation
    const targetObj = {
      id: track.id,
      title: track.title,
      author: track.author,
      cover: track.cover,
      duration: track.duration,
      audioUrl: track.audioUrl,
      originalUrl: track.originalUrl
    };
    if (!recentSongs.some(s => s.id === targetObj.id)) {
      setRecentSongs(prev => [targetObj, ...prev]);
    }
    playRecentSong(targetObj);
  };

  const [tiktokAlbums, setTiktokAlbums] = useState<any[]>(() => {
    const defaultVietnameseAlbums = [
      { id: "alb_chammusicboxofficial", username: "chammusicboxofficial", displayName: "Chạm Music", avatarSub: "CM" },
      { id: "alb_nhachayss", username: "nhachayss", displayName: "Nhạc Hay", avatarSub: "NH" },
      { id: "alb_tuanying198x", username: "tuanying198x", displayName: "Tuấn Ying", avatarSub: "TY" },
      { id: "alb_buon19936", username: "buon19936", displayName: "Buồn199x", avatarSub: "B1" },

      { id: "alb_motchutbuon_stt07", username: "motchutbuon_stt07", displayName: "Trạm dừng Chân", avatarSub: "TDC" },
      { id: "alb_nhacchudu", username: "nhacchudu", displayName: "Nhạc Chu Du", avatarSub: "CD" },

    ];

    try {
      const saved = localStorage.getItem("acoustic_presence_tiktok_albums");
      if (saved) {
        const parsed = JSON.parse(saved);
        // If the saved list is the old 4 default creators, migrate it to the new Vietnamese top 10
        const isOldDefault = Array.isArray(parsed) && parsed.length === 4 && parsed.some(alb => alb.username === "bellapoarch");
        if (isOldDefault) {
          return defaultVietnameseAlbums;
        }
        return parsed;
      }
    } catch {}
    return defaultVietnameseAlbums;
  });

  useEffect(() => {
    localStorage.setItem("acoustic_presence_tiktok_albums", JSON.stringify(tiktokAlbums));
  }, [tiktokAlbums]);

  // Reactively pool local custom creators and community shared usernames
  const allAlbums = React.useMemo(() => {
    const combined = [...(tiktokAlbums || [])];
    (firebaseUsernames || []).forEach((fu) => {
      const normalizedSharedName = (fu.username || "").toLowerCase();
      if (!normalizedSharedName) return;
      const alreadyInLocal = combined.some(alb => (alb.username || "").toLowerCase() === normalizedSharedName);
      if (!alreadyInLocal) {
        combined.push({
          id: `community_${normalizedSharedName}`,
          username: fu.username,
          displayName: fu.displayName || `@${fu.username}`,
          isFromCommunity: true,
          avatar: fu.avatar || "",
          avatarSub: fu.avatarSub || fu.username.slice(0, 2).toUpperCase()
        });
      }
    });
    return combined;
  }, [tiktokAlbums, firebaseUsernames]);

  const [albumsCache, setAlbumsCache] = useState<Record<string, { songs: any[], cursor: string, hasMore: boolean, updatedAt: number }>>(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_albums_cache_v2");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("acoustic_presence_albums_cache_v2", JSON.stringify(albumsCache));
  }, [albumsCache]);

  const [activeAlbumCursor, setActiveAlbumCursor] = useState<string>("0");
  const [activeAlbumHasMore, setActiveAlbumHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [activeAlbumUsername, setActiveAlbumUsername] = useState<string | null>(null);

  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [newAlbumInput, setNewAlbumInput] = useState("");

  const activePreloadUrlRef = useRef<string | null>(null);

  const playRecentSong = async (song: any) => {
    // Determine target URL
    let playUrl = song.audioUrl;
    
    // TKaraoke lazy fetch
    if (song.isTKaraokePlaylistTrack && song.originalUrl) {
      try {
        setIsFetchingTiktok(true);
        const resDetails = await fetch(`/api/tkaraoke/song?url=${encodeURIComponent(song.originalUrl)}`);
        const detailsJson = await resDetails.json();
        if (detailsJson.success && detailsJson.data.mp3Versions.length > 0) {
           playUrl = `/api/proxy-stream?url=${encodeURIComponent(detailsJson.data.mp3Versions[0].url)}`;
           song.audioUrl = playUrl; // cache it
           song.author = detailsJson.data.mp3Versions[0].name;
        }
      } catch (err) {
        console.error("Failed to fetch tkaraoke mp3", err);
      } finally {
        setIsFetchingTiktok(false);
      }
    }

    const isLocal = song.id?.startsWith("local_") || (playUrl && playUrl.startsWith("blob:"));
    if (!isLocal) {
      setUploadedFile(null);
    }
    if (playUrl && (playUrl.includes("nct.vn") || playUrl.includes("nhaccuatui.com")) && !playUrl.includes("/api/proxy-stream")) {
      playUrl = `/api/proxy-stream?url=${encodeURIComponent(playUrl)}`;
    }

    if (!playUrl) return;

    shouldAutoPlayRef.current = true;
    
    // If we're already playing something smoothly, let's preload in background!
    if (isPlaying && audioUrl && audioRef.current && !audioRef.current.paused) {
         setIsAIAnalyzing(true);
         activePreloadUrlRef.current = playUrl;

         const preloader = new window.Audio();
         preloader.src = playUrl;
         preloader.preload = "auto";
         
         const handleReady = () => {
             if (activePreloadUrlRef.current !== playUrl) return;
             
             setCurrentSong(song);
             setAudioUrl(playUrl);
             setFileName(song.title || "TikTok Audio");
             setTiktokUrl(song.originalUrl || "");
             resumeContext();
             setIsAIAnalyzing(false);
             preloader.removeEventListener("canplay", handleReady);
         };

         const handleError = () => {
             if (activePreloadUrlRef.current !== playUrl) return;
             
             // Fallback: immediately switch
             setCurrentSong(song);
             setAudioUrl(playUrl);
             setFileName(song.title || "TikTok Audio");
             setTiktokUrl(song.originalUrl || "");
             resumeContext();
             setIsAIAnalyzing(false);
         };

         preloader.addEventListener("canplay", handleReady);
         preloader.addEventListener("error", handleError);
         
         // Trigger browser network fetch if possible locally
         preloader.load();
    } else {
        // Fallback: immediately switch
        setCurrentSong(song);
        setAudioUrl(playUrl);
        setFileName(song.title || "TikTok Audio");
        setTiktokUrl(song.originalUrl || "");
        resumeContext();
    }
  };

  const deleteRecentSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSongs((prev) => prev.filter((s) => s.id !== id));
  };

  const downloadAudio = async (e: React.MouseEvent, song: any) => {
    e.stopPropagation();
    if (!song.audioUrl) return;

    // Handle local files (blob URLs) directly
    if (song.audioUrl.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = song.audioUrl;
      link.download = `${song.title || "audio"}.m4a`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    let targetUrl = song.id?.toString().startsWith("yt_") ? song.originalUrl : song.audioUrl;
    
    // If the audio URL is already a proxy-stream link, extract the encoded URL for the download endpoint
    if (targetUrl && (targetUrl.startsWith("/api/proxy-stream") || targetUrl.includes("/api/proxy-stream"))) {
      try {
        const urlObj = new URL(targetUrl, window.location.origin);
        let extractedUrl = urlObj.searchParams.get("url");
        if (extractedUrl) targetUrl = extractedUrl;
      } catch (err) {}
    }
    
    const downloadUrl = `/api/download?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(song.title || "audio")}`;

    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("Failed to fetch binary");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${song.title || "audio"}.m4a`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      // fallback
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${song.title || "audio"}.m4a`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const fetchAndPlayUserAlbum = async (username: string, loadMore = false, forceRefresh = false) => {
    if (isFetchingTiktok || isLoadingMore) return;
    
    // Normalize username
    const normalizedUsername = username.replace("@", "").trim();
    setActiveAlbumUsername(normalizedUsername);

    // Cache-first optimization for initial loads
    if (!loadMore && !forceRefresh) {
      const cached = albumsCache[normalizedUsername];
      if (cached && cached.songs && cached.songs.length > 0) {
        setRecentSongs(cached.songs);
        setActiveAlbumCursor(cached.cursor || "0");
        setActiveAlbumHasMore(cached.hasMore || false);
        setTiktokError("");
        
        // Find existing album display details and trigger play
        playRecentSong(cached.songs[0]);
        return;
      }
    }

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsFetchingTiktok(true);
      setTiktokError("");
      setActiveAlbumCursor("0");
      setActiveAlbumHasMore(false);
    }

    try {
      const cursorToUse = loadMore ? activeAlbumCursor : "0";
      const refreshParam = forceRefresh ? "&refresh=true" : "";
      const response = await fetch(`/api/tiktok/user?unique_id=${encodeURIComponent(normalizedUsername)}&cursor=${encodeURIComponent(cursorToUse)}&count=40${refreshParam}`);
      const data = await response.json();
      
      if (!response.ok) {
         if (data.isCloudflareBlock) {
           setTiktokError("Due to TikTok's anti-bot protection and proxies being blocked, fetching users failed. Try pacing direct video links instead.");
         } else {
           setTiktokError(data.error || "Failed to fetch user posts.");
         }
         setIsFetchingTiktok(false);
         setIsLoadingMore(false);
         return;
      }

      const videos = data.data?.videos || [];
      const nextCursor = (data.data?.cursor || "0").toString();
      const hasMore = !!data.data?.hasMore;

      if (videos.length === 0) {
        if (!loadMore) {
          setTiktokError("This user has no posts or account is private.");
        } else {
          setActiveAlbumHasMore(false);
        }
        setIsFetchingTiktok(false);
        setIsLoadingMore(false);
        return;
      }

      // Try to find the real avatar in the posts and update the local album list
      const firstVidWithAuthor = videos.find((v: any) => v.author?.unique_id || v.author?.unique_id === "");
      const authorObj = firstVidWithAuthor?.author;
      if (authorObj) {
        const foundAvatar = authorObj.avatar || authorObj.avatar_medium || authorObj.avatar_thumb || authorObj.avatar_larger;
        const nickname = authorObj.nickname || authorObj.unique_id;

        if (foundAvatar || nickname) {
          setTiktokAlbums(prev => prev.map(alb => {
            if (alb.username.toLowerCase() === normalizedUsername.toLowerCase()) {
              return {
                ...alb,
                avatar: foundAvatar || alb.avatar,
                displayName: nickname || alb.displayName
              };
            }
            return alb;
          }));
        }
      }

      const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info).map((v: any) => {
        const videoAuthor = v.author?.nickname || authorObj?.nickname || `@${normalizedUsername}`;
        const musicCover = v.music_info?.cover || v.cover || v.origin_cover;
        return {
          id: v.video_id || v.id || Date.now().toString() + Math.random(),
          title: v.title || v.desc || "TikTok Audio",
          originalUrl: "https://www.tiktok.com/@" + normalizedUsername + "/video/" + (v.video_id || v.id),
          audioUrl: v.music || v.play || v.music_info?.play,
          cover: musicCover,
          author: videoAuthor,
          timestamp: Date.now()
        };
      });

      if (newSongs.length > 0) {
        let updatedSongsList = [];

        if (loadMore) {
          setRecentSongs((prev) => {
             const existingIds = new Set(prev.map(s => s.id));
             const toAdd = newSongs.filter((s: any) => !existingIds.has(s.id));
             updatedSongsList = [...prev, ...toAdd];
             return updatedSongsList;
          });
        } else {
          updatedSongsList = newSongs;
          setRecentSongs(newSongs);
          playRecentSong(newSongs[0]);
        }

        // Save progress to offline local albums cache
        setAlbumsCache(prev => ({
          ...prev,
          [normalizedUsername]: {
            songs: updatedSongsList,
            cursor: nextCursor,
            hasMore: hasMore,
            updatedAt: Date.now()
          }
        }));

        setActiveAlbumCursor(nextCursor);
        setActiveAlbumHasMore(hasMore);
        setTiktokError("");
      } else {
        if (!loadMore) {
          setTiktokError("No extracted audio tracks found in this creator's posts.");
        }
      }
    } catch (err) {
      setTiktokError("Network error while communicating with our proxy backend.");
    } finally {
      setIsFetchingTiktok(false);
      setIsLoadingMore(false);
    }
  };

  const handleLocalAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    // Create a local object URL for the file
    const url = URL.createObjectURL(file);
    const newSong = {
      id: `local_${Date.now()}`,
      title: file.name.replace(/.[^/.]+$/, ""),
      author: "Local File",
      audioUrl: url,
      coverUrl: "https://images.unsplash.com/photo-1614113489855-66422ad300a4?w=500&q=80&auto=format&fit=crop",
      timestamp: Date.now()
    };

    setRecentSongs(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      if (!existingIds.has(newSong.id)) {
        return [newSong, ...prev].slice(0, 50);
      }
      return prev;
    });

    setCurrentSong(newSong);
    setAudioUrl(newSong.audioUrl);
    setFileName(newSong.title);
    setIsPlaying(true);
    setShowAddAlbum(false);
  };

  const handleAddAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let val = newAlbumInput.trim();
    if (!val) return;

    let username = "";
    const isDirectLink = val.includes("youtube.com") || 
                         val.includes("youtu.be") || 
                         val.includes("nhaccuatui.com") ||
                         val.includes("nct.vn") ||
                         val.includes("tkaraoke.com") ||
                         val.startsWith("[") ||
                         val.includes("__NUXT_DATA__") ||
                         val.includes("/video/") || 
                         val.includes("/photo/") || 
                         (val.includes("://") && !val.includes("@"));

    if (!isDirectLink) {
      if (val.startsWith("@")) {
        username = val.substring(1).trim();
      } else if (val.includes("tiktok.com/")) {
        const match = val.match(/tiktok\.com\/@([^\/\?]+)/);
        if (match) {
          username = match[1];
        }
      } else {
        username = val;
      }
    }

    if (username) {
      const finalUsername = username.replace("@", "").trim();
      const exists = tiktokAlbums.some(alb => alb.username.toLowerCase() === finalUsername.toLowerCase());
      if (!exists) {
        const initials = finalUsername.slice(0, 2).toUpperCase();
        const newAlb = {
          id: `alb_${Date.now()}`,
          username: finalUsername,
          displayName: "@" + finalUsername,
          avatarSub: initials
        };
        setTiktokAlbums(prev => [newAlb, ...prev]);
      }
      setNewAlbumInput("");
      setShowAddAlbum(false);
      setTiktokError("");
      
      setPlaylistTab("albums");
      await fetchAndPlayUserAlbum(finalUsername);
    } else {
      // Direct song link
      setTiktokUrl(val);
      setNewAlbumInput("");
      setShowAddAlbum(false);
      
      // Execute the fetch
      setTimeout(() => {
        const fakeForm = { preventDefault: () => {} } as React.FormEvent;
        handleTiktokFetch(fakeForm, val);
      }, 50);
    }
  };

  const handleTiktokFetch = async (e: React.FormEvent, urlOverride?: string, forceRefresh = false) => {
    if (e && e.preventDefault) e.preventDefault();
    const urlToUse = urlOverride || tiktokUrl;
    if (!urlToUse) return;
    setIsFetchingTiktok(true);
    setTiktokError("");
    
    // Robust general URL fetching (supports YouTube, Facebook, SoundCloud, Twitch, Vimeo, Twitter/X, etc. via yt-dlp)
    const isTikTokUrl = urlToUse.includes("tiktok.com") || (urlToUse.includes("@") && !urlToUse.includes("://"));
    const isNctUrl = urlToUse.includes("nhaccuatui.com") || urlToUse.includes("nct.vn") || urlToUse.startsWith("[") || urlToUse.includes("__NUXT_DATA__");
    const isTKaraokeUrl = urlToUse.includes("tkaraoke.com");

    if (!isTikTokUrl && !isNctUrl && !isTKaraokeUrl) {
      try {
        const metadataRes = await fetch(`/api/metadata?url=${encodeURIComponent(urlToUse)}`);
        let data;
        try {
          data = await metadataRes.json();
        } catch {
          throw new Error("Server returned an invalid HTML or timeout response instead of JSON. The link might be a massive playlist or restricted by CAPTCHA.");
        }
        
        if (!metadataRes.ok) {
          const isYouTube = urlToUse.includes("youtube.com") || urlToUse.includes("youtu.be");
          let errMsg = data?.error || "Failed to extract track metadata. Link might be restricted or private.";
          if (isYouTube && !errMsg.toLowerCase().includes("cookie")) {
            errMsg += " — YouTube blocks fetching by IP. Go to Settings and add YouTube Cookies to fix this!";
          }
          throw new Error(errMsg);
        }
        
        shouldAutoPlayRef.current = true;
        const streamUrl = `/api/stream?url=${encodeURIComponent(urlToUse)}`;
        setAudioUrl(streamUrl);
        setFileName(data.title || "Shared Audio");
        
        // YouTube-specific thumbnail lookup fallback if none is provided
        let defaultCover = data.cover;
        if (!defaultCover && (urlToUse.includes("youtube.com") || urlToUse.includes("youtu.be"))) {
          const ytId = urlToUse.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];
          if (ytId) {
            defaultCover = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          }
        }
        if (!defaultCover) {
          defaultCover = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300";
        }
        
        const newSong = {
          id: "yt_" + Date.now().toString(),
          title: data.title || "Shared Audio Track",
          originalUrl: urlToUse,
          audioUrl: streamUrl,
          cover: defaultCover,
          author: data.author || "Web Audio",
          timestamp: Date.now()
        };

        setRecentSongs((prev) => {
          const filtered = prev.filter((s) => s.originalUrl !== urlToUse);
          return [newSong, ...filtered].slice(0, 50);
        });
        
        playRecentSong(newSong);
        setTiktokUrl(""); 
      } catch(err: any) {
        setTiktokError(err.message || "Failed to fetch media audio. Video/track might be restricted.");
      } finally {
        setIsFetchingTiktok(false);
      }
      return;
    }

    // NhacCuaTui fetching
    if (urlToUse.includes("nhaccuatui.com") || urlToUse.includes("nct.vn") || urlToUse.startsWith("[") || urlToUse.includes("__NUXT_DATA__")) {
      try {
        let res;
        if (urlToUse.startsWith("[") || urlToUse.includes("__NUXT_DATA__")) {
          // Explicit manual payload! Use the POST endpoint
          res = await fetch("/api/nhaccuatui/manual", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ htmlText: urlToUse })
          });
        } else {
          // Standard NhacCuaTui link
          const refreshParam = forceRefresh ? "&refresh=true" : "";
          res = await fetch(`/api/nhaccuatui/playlist?url=${encodeURIComponent(urlToUse)}${refreshParam}`);
        }
        
        let json;
        try {
          json = await res.json();
        } catch {
          throw new Error("Server returned an invalid HTML or timeout response instead of JSON. The link might be invalid or process timed out.");
        }
        
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to process NhacCuaTui request.");
        }
        
        const { title, songs } = json.data;
        if (!songs || songs.length === 0) {
          throw new Error("No play-ready audio tracks found in this NhacCuaTui link/source.");
        }
        
        // Load songs into queue
        setRecentSongs(songs);
        
        // Auto play first track
        shouldAutoPlayRef.current = true;
        playRecentSong(songs[0]);
        
        setTiktokUrl("");
        setTiktokError("");
      } catch (err: any) {
        setTiktokError(err.message || "Failed to fetch or parse NhacCuaTui source. Make sure you pasted the complete playlist link or raw view-source text!");
      } finally {
        setIsFetchingTiktok(false);
      }
      return;
    }

    if (isTKaraokeUrl) {
      try {
        const isSong = urlToUse.includes("/song/") || (urlToUse.match(/\.html$/) && !urlToUse.includes("playlist"));
        if (isSong) {
            const res = await fetch(`/api/tkaraoke/song?url=${encodeURIComponent(urlToUse)}`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Failed to process TKaraoke link");
            const details = json.data;
            if (details.mp3Versions && details.mp3Versions.length > 0) {
              const bestVersion = details.mp3Versions[0];
              const streamUrl = `/api/proxy-stream?url=${encodeURIComponent(bestVersion.url)}`;
              const newSong = {
                  id: "tkar_" + Date.now().toString(),
                  title: urlToUse.split('/').pop()?.replace('.html', '') || "TKaraoke Track",
                  originalUrl: urlToUse,
                  audioUrl: streamUrl,
                  cover: "https://images.unsplash.com/photo-1516280440502-127db8e0586e?q=80&w=300",
                  author: bestVersion.name || "TKaraoke",
                  timestamp: Date.now()
              };
              setRecentSongs((prev) => {
                  const filtered = prev.filter((s) => s.originalUrl !== urlToUse);
                  return [newSong, ...filtered].slice(0, 50);
              });
              playRecentSong(newSong);
              setTiktokUrl("");
              setTiktokError("");
            } else {
              throw new Error("No playable mp3 version found for this song.");
            }
        } else {
            const res = await fetch(`/api/tkaraoke/playlist?url=${encodeURIComponent(urlToUse)}`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Failed to process TKaraoke playlist");
            const songsList = json.data.songs;
            if (!songsList || songsList.length === 0) throw new Error("No play-ready audio tracks found in this TKaraoke link.");
            
            // Map the tkaraoke playlist to recentSongs format
            const mappedSongs = songsList.map((s: any, idx: number) => ({
                id: "tkar_" + idx + "_" + Date.now().toString(),
                title: s.title || "TKaraoke Track",
                originalUrl: s.url,
                audioUrl: s.url, 
                cover: "https://images.unsplash.com/photo-1516280440502-127db8e0586e?q=80&w=300",
                author: "TKaraoke",
                timestamp: Date.now(),
                isTKaraokePlaylistTrack: true 
            }));
            
            setRecentSongs(mappedSongs);
            shouldAutoPlayRef.current = true;
            playRecentSong(mappedSongs[0]);
            
            setTiktokUrl("");
            setTiktokError("");
        }
      } catch (err: any) {
         setTiktokError(err.message || "Failed to fetch TKaraoke source.");
      } finally {
         setIsFetchingTiktok(false);
      }
      return;
    }

    let isUserLink = false;
    let username = "";
    
    if (urlToUse.startsWith("@")) {
      isUserLink = true;
      username = urlToUse.substring(1).trim();
    } else {
      const match = urlToUse.match(/tiktok\.com\/@([^\/\?]+)(?:\?|$|\/$)/);
      if (match && !urlToUse.includes('/video/') && !urlToUse.includes('/photo/')) {
        isUserLink = true;
        username = match[1];
      }
    }

    if (isUserLink) {
      try {
        const response = await fetch(`/api/tiktok/user?unique_id=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        if (!response.ok) {
           if (data.isCloudflareBlock) {
             setTiktokError("Due to TikTok's anti-bot protection and proxies being blocked, fetching users failed. Try pacing direct video links instead.");
           } else {
             setTiktokError(data.error || "Failed to fetch user posts.");
           }
           setIsFetchingTiktok(false);
           return;
        }

        const videos = data.data?.videos || [];
        if (videos.length === 0) {
          setTiktokError("User has no videos or account is private.");
          setIsFetchingTiktok(false);
          return;
        }

        const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info).map((v: any) => ({
          id: v.video_id || v.id || Date.now().toString() + Math.random(),
          title: v.title || v.desc || "TikTok Audio",
          originalUrl: "https://www.tiktok.com/@" + username + "/video/" + (v.video_id || v.id),
          audioUrl: v.music || v.play || v.music_info?.play,
          videoUrl: v.play || null,
          cover: v.cover || v.origin_cover || v.music_info?.cover,
          author: v.author?.nickname || "@" + username,
          timestamp: Date.now()
        }));

        if (newSongs.length > 0) {
          setRecentSongs((prev) => {
             const existingIds = new Set(prev.map(s => s.id));
             const toAdd = newSongs.filter((s: any) => !existingIds.has(s.id));
             return [...toAdd, ...prev].slice(0, 50);
          });
          setTiktokError("");
          setTiktokUrl("");
        } else {
          setTiktokError("No extracted audio found in the user's recent posts.");
        }
      } catch (err) {
        setTiktokError("Network error while communicating with our proxy backend.");
      } finally {
        setIsFetchingTiktok(false);
      }
      return;
    }

    try {
      let oembedData: any = {};
      try {
        const oembedRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent("https://www.tiktok.com/oembed?url=" + urlToUse)}`);
        oembedData = await oembedRes.json();
      } catch (e) {
        // ignore oembed error
      }

      const response = await fetch("https://www.tikwm.com/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "url=" + encodeURIComponent(urlToUse) + "&hd=1"
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Could not parse provider response. The API might be experiencing rate limits or blocking queries.");
      }
      if (data && data.data && (data.data.music || data.data.play)) {
        const urlToFetch = data.data.music || data.data.play;
        const songTitle = oembedData.title || data.data.title || "TikTok Audio";
        
        const newSong = {
          id: data.data.id || Date.now().toString(),
          title: songTitle,
          originalUrl: urlToUse,
          audioUrl: urlToFetch,
          videoUrl: data.data.play || null,
          cover: oembedData.thumbnail_url || data.data.cover || data.data.origin_cover,
          author: oembedData.author_name || data.data.author?.nickname,
          timestamp: Date.now()
        };

        setRecentSongs((prev) => {
          const filtered = prev.filter((s) => s.originalUrl !== urlToUse && s.id !== newSong.id);
          return [newSong, ...filtered].slice(0, 50); // increased limit
        });
        
        playRecentSong(newSong);
        setTiktokUrl(""); // clear input
      } else {
        setTiktokError(data?.msg || "Could not extract audio from this link. Make sure it's public.");
      }
    } catch (err: any) {
      setTiktokError("Network error. The API might be blocked by your browser extensions or adblocker.");
    } finally {
      setIsFetchingTiktok(false);
    }
  };

  const [activePresetId, setActivePresetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_active_preset_id");
      return saved || "flat_original";
    } catch {
      return "flat_original";
    }
  });

  useEffect(() => {
    localStorage.setItem("acoustic_presence_active_preset_id", activePresetId);
  }, [activePresetId]);

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=0&enablejsapi=1`;
    }
    return null;
  };

  const getTikTokEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/\/video\/(\d+)/);
    if (match) {
      return `https://www.tiktok.com/embed/v2/${match[1]}`;
    }
    return null;
  };

  

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shouldAutoPlayRef = useRef<boolean>(false);
  const progressBarRef1 = useRef<HTMLDivElement>(null);
  const progressBarRef2 = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLSpanElement>(null);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const {
    initAudio,
    toggleSignatureSound,
    isSignatureSound,
    resumeContext,
    analyser,
    updateEqNode,
    updateSpatial,
    audioError,
    audioContextRef,
    masterGainRef,
  } = useAudioProcessor(eqSettings, spatialSettings);

  const isSignatureSoundRef = useRef(isSignatureSound);
  useEffect(() => {
    isSignatureSoundRef.current = isSignatureSound;
  }, [isSignatureSound]);

  useEffect(() => {
    const handleGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch((err) => {
          console.warn("[App Gesture Autoresume] Failed to resume audio context:", err);
        });
      }
    };
    window.addEventListener("pointerdown", handleGesture);
    window.addEventListener("click", handleGesture);
    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("click", handleGesture);
    };
  }, [audioContextRef]);

  const [uiLayoutMode, setUiLayoutMode] = useState<"full" | "compact" | "hidden">(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_ui_mode");
      if (saved === "full" || saved === "compact" || saved === "hidden") return saved;
      const legacy = localStorage.getItem("acoustic_presence_compact_mode");
      return legacy === "false" ? "full" : "compact";
    } catch {
      return "compact";
    }
  });

  useEffect(() => {
    localStorage.setItem("acoustic_presence_ui_mode", uiLayoutMode);
  }, [uiLayoutMode]);

  const isCompact = uiLayoutMode === "compact" || uiLayoutMode === "hidden";

  const [showVideoIframe, setShowVideoIframe] = useState(false);
  const [bgPlayBypass, setBgPlayBypass] = useState(() => {
    try {
      const saved = localStorage.getItem("acoustic_presence_bg_bypass");
      return saved === "true";
    } catch {}
    return false;
  });

  // master volume removed as requested to fix muting

  const [countdown, setCountdown] = useState<{
    type: "HD" | "BG";
    targetValue: boolean;
    secondsLeft: number;
    isCompleting?: boolean;
    visible?: boolean;
  } | null>(null);

  const countdownTimeoutRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const completionTimeoutRef = useRef<any>(null);
  const fadeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  const startDelayedAction = (type: "HD" | "BG", targetValue: boolean) => {
    if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

    setCountdown(null);

    const wasPlaying = isPlaying || (audioRef.current && !audioRef.current.paused);
    const currentTime = audioRef.current ? audioRef.current.currentTime : 0;
    
    let needsRestore = false;

    if (type === "HD") {
      resumeContext();
      if (targetValue) {
        if (bgPlayBypass !== false) {
          setBgPlayBypass(false);
          needsRestore = true;
        }
        toggleSignatureSound(true);
      } else {
        toggleSignatureSound(false);
      }
    } else if (type === "BG") {
      if (bgPlayBypass !== targetValue) {
        setBgPlayBypass(targetValue);
        needsRestore = true;
      }
      if (targetValue) {
        toggleSignatureSound(false);
        setShowVisualizer(false);
      }
    }

    if (needsRestore) {
      let attempts = 0;
      const restoreTime = () => {
        if (audioRef.current && audioRef.current.readyState >= 1) {
          audioRef.current.currentTime = currentTime;
          if (wasPlaying) {
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch((e) => {
              console.warn("Playback resume blocked:", e);
              setIsPlaying(false);
            });
          }
        } else if (attempts < 20) {
          attempts++;
          setTimeout(restoreTime, 50);
        }
      };
      setTimeout(restoreTime, 10);
    } else {
      if (wasPlaying && audioRef.current) {
         audioRef.current.play().catch(e => console.warn(e));
      }
    }
  };

  useEffect(() => {
    localStorage.setItem("acoustic_presence_bg_bypass", String(bgPlayBypass));
  }, [bgPlayBypass]);

  // Enforce turning off HD and Visualizer if BG PLAY starts as true
  useEffect(() => {
    if (bgPlayBypass) {
      toggleSignatureSound(false);
      setShowVisualizer(false);
    }
  }, [bgPlayBypass, toggleSignatureSound, setShowVisualizer]);

  const toggleBgBypass = () => {
    const nextVal = !bgPlayBypass;
    startDelayedAction("BG", nextVal);
  };

  const handleToggleHD = () => {
    resumeContext();
    const nextVal = !isSignatureSound;
    startDelayedAction("HD", nextVal);
  };

  const cycleVisualizer = () => {
    resumeContext();
    if (bgPlayBypass) {
      // Turn off BG PLAY mode if activating Visualizer
      setBgPlayBypass(false);
    }
    const types = ["liquid_gold", "stardust_orbit", "neon_perspective", "audio_ring", "cosmic_mandala", "liquid_terrain", "retro_glass", "spectre_core", "lux_pulse_line"];
    if (!showVisualizer) {
      setShowVisualizer(true);
      setVisSettings((prev) => ({ ...prev, type: "liquid_gold" }));
    } else {
      const currentIndex = types.indexOf(visSettings.type);
      if (currentIndex === -1 || currentIndex === types.length - 1) {
        setShowVisualizer(false);
      } else {
        setVisSettings((prev) => ({ ...prev, type: types[currentIndex + 1] }));
      }
    }
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setActivePresetId(preset.id);
    const newEq = eqSettings.map((band, i) => ({
      ...band,
      g: preset.eq[i] !== undefined ? preset.eq[i] : band.g,
    }));
    setEqSettings(newEq);
    setSpatialSettings(preset.spatial);

    newEq.forEach((band, i) => {
      updateEqNode(i, "gain", band.g);
    });
    Object.entries(preset.spatial).forEach(([key, val]) => {
      updateSpatial(key as any, val);
    });
  };

  const handleEqChange = (
    index: number,
    param: "f" | "q" | "g",
    value: number,
  ) => {
    setActivePresetId("custom");
    const newSettings = [...eqSettings];
    newSettings[index] = { ...newSettings[index], [param]: value };
    setEqSettings(newSettings);
    updateEqNode(
      index,
      param === "f" ? "frequency" : param === "q" ? "Q" : "gain",
      value,
    );
  };

  const handleSpatialChange = (
    param:
      | "reverb"
      | "wideness"
      | "clarity"
      | "treble"
      | "punch"
      | "bassWeight"
      | "vocalHD",
    value: number,
  ) => {
    setActivePresetId("custom");
    setSpatialSettings((prev) => ({ ...prev, [param]: value }));
    updateSpatial(param, value);
  };

  // Removed old youtube loading code

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(file);
      const newSong = {
        id: "local_" + Date.now().toString(),
        title: file.name,
        originalUrl: "Local File",
        audioUrl: url,
        timestamp: Date.now(),
        cover: null,
        author: "Local Upload"
      };
      setRecentSongs((prev) => [newSong, ...prev]);
      playRecentSong(newSong);
      
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    resumeContext(); // Do not await to preserve synchronous user gesture context

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => {
        if (e.name !== 'AbortError') {
           console.warn("Autoplay/Play blocked:", e);
        }
      });
      // if stems are playing, pause them when user toggles play on master!
      if (stemsPlaying) {
          setStemsPlaying(false);
          Object.values(stemsAudioRefs.current).forEach((a: any) => a.pause());
      }
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load();
      if (!bgPlayBypass) {
        initAudio(audioRef.current);

        // Force re-routing of audio graph for new file depending on current toggle state
        // Using setTimeout ensures the DOM audio element has fully registered the source
        setTimeout(() => {
          toggleSignatureSound(isSignatureSoundRef.current);
        }, 100);
      }

      if (shouldAutoPlayRef.current || isPlaying) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            console.warn("Autoplay was blocked or interrupted:", e);
            setIsPlaying(false);
          });
        shouldAutoPlayRef.current = false;
      } else {
        setIsPlaying(false);
      }
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current && audioUrl && !bgPlayBypass) {
      initAudio(audioRef.current);
      setTimeout(() => {
        toggleSignatureSound(isSignatureSoundRef.current);
      }, 100);
    }
  }, [bgPlayBypass]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      // Self-heal: If playing but AudioContext is suspended, auto-resume
      if (isPlaying && audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(console.warn);
      }

      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      
      // Calculate smooth volume
      let targetVolume = 1.0;
      if (countdown && !countdown.isCompleting) {
          // If countdown is active, let the direct fadeTimeoutRef handle the volume drop near the end
          targetVolume = 1.0;
      } else if (duration > 4) {
        if (currentTime < 2) {
          targetVolume = currentTime / 2;
        } else if (duration - currentTime < 2) {
          targetVolume = (duration - currentTime) / 2;
        }
      }
      
      // Apply fade if not in the middle of a countdown fade!
      if (!countdown || countdown.isCompleting) {
          const finalVol = Math.max(0, Math.min(1, targetVolume));
          audioRef.current.volume = finalVol;
          if (masterGainRef.current) {
             masterGainRef.current.gain.value = finalVol;
          }
      }

      const p = (currentTime / duration) * 100;
      const progressPercent = isNaN(p) ? 0 : p;
      if (progressBarRef1.current) progressBarRef1.current.style.width = `${progressPercent}%`;
      if (progressBarRef2.current) progressBarRef2.current.style.width = `${progressPercent}%`;
      if (currentTimeRef.current) currentTimeRef.current.innerText = formatDurationDisplay(currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (!sampleRate) {
        if (audioContextRef.current) {
          setSampleRate(audioContextRef.current.sampleRate);
        } else {
          setSampleRate(44100);
        }
      }
    }
  };

  useEffect(() => {
    if (!audioUrl) {
      setDuration(null);
      setSampleRate(null);
      return;
    }

    let active = true;

    const fetchAndDecodeMetadata = async () => {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
           throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           throw new Error("Received JSON error instead of audio stream. Upstream might be blocked.");
        }
        const arrayBuffer = await response.arrayBuffer();
        
        if (!active) return;

        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!CtxClass) return;
        
        const tempCtx = new CtxClass();
        const audioBuffer = await safeDecodeAudioData(tempCtx as any, arrayBuffer);
        
        if (!active) {
          tempCtx.close();
          return;
        }

        setDuration(audioBuffer.duration);
        setSampleRate(audioBuffer.sampleRate);
        tempCtx.close();
      } catch (err) {
        console.warn("Could not decode audio header metadata natively:", err);
        if (audioRef.current && active) {
          if (!isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
          }
          if (audioContextRef.current) {
            setSampleRate(audioContextRef.current.sampleRate);
          } else {
            setSampleRate(44100);
          }
        }
      }
    };

    fetchAndDecodeMetadata();

    return () => {
      active = false;
    };
  }, [audioUrl]);

  const formatDurationDisplay = (sec: number | null) => {
    if (sec === null || isNaN(sec)) return "--:--";
    if (sec === 0 && !audioUrl) return "ERROR";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatSampleRateDisplay = (rate: number | null) => {
    if (rate === null || isNaN(rate)) return "--- kHz";
    if (rate >= 1000) {
      return `${(rate / 1000).toFixed(1)} kHz`;
    }
    return `${rate} Hz`;
  };

  const [isExpanded, setIsExpanded] = useState(false);

  const handleExport = async () => {
    if (!audioUrl) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      const resultUrl = await exportOfflineHD(
        audioUrl,
        eqSettings,
        spatialSettings,
        (prog) => {
          setExportProgress(prog);
        },
      );

      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `HD_Enhanced_${fileName?.replace(/\.[^/.]+$/, "") || "audio"}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(resultUrl);
    } catch (err: any) {
      console.error("Export failed:", err);
      alert("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleSeparateStems = async (forceEngine?: "webgpu" | "onnx" | "ai") => {
    if (!audioUrl) return;
    setShowStemmix(true);
    if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
    if (stemsPlaying) {
      setStemsPlaying(false);
    }
    Object.values(stemsAudioRefs.current).forEach((a: any) => {
      a.pause();
      a.removeAttribute('src');
    });
    stemsAudioRefs.current = {};
    
    setStemUrls(null);
    setStemSongInfo({ title: currentSong?.title || "Untitled Track", duration: duration || 0, cover: currentSong?.cover, audioUrl: audioUrl });
    setStemmixStatus("loading");
    setStemmixError("");

    const activeEngine = (typeof forceEngine === "string" ? forceEngine : null) || separationMode;
    console.log(`[Stemmix] Starting separation using engine: ${activeEngine}`);

    if (activeEngine === "webgpu") {
      try {
        const support = await isWebGpuSupported();
        if (!support) {
          throw new Error("WebGPU is not supported or enabled in this browser. Please use 'AI Cloud' separation.");
        }

        console.log("[WebGPU] Fetching track buffer:", audioUrl);
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        console.log("[WebGPU] Decoding audio binary data...");
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedBuffer = await safeDecodeAudioData(ctx as any, arrayBuffer);

        console.log("[WebGPU] Executing 31-tap FIR filters & dynamic enhancers...");
        
        const processedStems = await separateStemsWithWebGpu(decodedBuffer, ctx, undefined, webgpuQuality);

        console.log("[WebGPU] Conversion to playable WAV stems in progress...");
        const stemUrlsObj: any = {};

        const keys = ["vocals", "bass", "drums", "melody", "other"] as const;
        for (const key of keys) {
          const buffer = processedStems[key];
          const wavBuffer = audioBufferToWav(buffer);
          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const blobUrl = URL.createObjectURL(wavBlob);

          if (key === "melody") {
            stemUrlsObj.guitar = blobUrl;
            stemUrlsObj.piano = blobUrl;
          } else {
            stemUrlsObj[key] = blobUrl;
          }
        }

        console.log("[WebGPU] Stems fully compiled client-side!");
        stemUrlsObj.isDspFallback = true;
        setStemUrls(stemUrlsObj);
        setStemmixStatus("ready");
      } catch (err: any) {
        console.error("[WebGPU error]", err);
        setStemmixError(err.message || "WebGPU separation failed. Try selecting AI Cloud mode.");
        setStemmixStatus("error");
      }
    } else if (activeEngine === "ai") {
      try {
        console.log("[AI Cloud] Sending to remote server for separation...");
        const formData = new FormData();
        if (uploadedFile && audioUrl && audioUrl.startsWith("blob:")) {
          formData.append("audio_file", uploadedFile);
        } else {
          formData.append("audioUrl", audioUrl || "");
        }
        
        let customSpace = "";
        try {
          customSpace = localStorage.getItem("stemmix_custom_space_url") || "";
        } catch {}
        if (customSpace) {
          formData.append("customSpace", customSpace);
        }

        const res = await fetch("/api/stemmix", {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error("AI Cloud request failed");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        console.log("[AI Cloud] Stems successfully separated remotely!");
        setStemUrls({
            vocals: data.stems?.vocals,
            drums: data.stems?.drums,
            bass: data.stems?.bass,
            guitar: data.stems?.guitar || data.stems?.other,
            piano: data.stems?.piano || data.stems?.other,
            other: data.stems?.other,
            isDspFallback: false
        } as any);
        setStemmixStatus("ready");
      } catch (err: any) {
         console.error("[AI Cloud error]", err);
         setStemmixError(err.message || "AI Cloud separation failed.");
         setStemmixStatus("error");
      }
    } else if (activeEngine === "onnx") {
      try {
        console.log("[ONNX] Initializing ONNX Runtime Web session...");
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedBuffer = await safeDecodeAudioData(ctx as any, arrayBuffer);
        
        console.log("[ONNX] Executing ONNX neural network inference...");
        const processedStems = await separateStemsWithONNX(decodedBuffer, ctx, (prog) => {
           setStemmixProgress(Math.floor(prog * 100));
        });
        
        console.log("[ONNX] Converting ONNX output tensors to playable WAV stems...");
        const stemUrlsObj: any = {};
        const keys = ["vocals", "bass", "drums", "other"] as const;
        for (const key of keys) {
          const buffer = processedStems[key];
          const wavBuffer = audioBufferToWav(buffer);
          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const blobUrl = URL.createObjectURL(wavBlob);
          stemUrlsObj[key] = blobUrl;
        }
        console.log("[ONNX] Stems extracted successfully client-side!");
        stemUrlsObj.isDspFallback = true;
        setStemUrls(stemUrlsObj);
        setStemmixStatus("ready");
      } catch (err: any) {
        console.error(err);
        setStemmixError(err.message || "ONNX Separation failed. Try checking your browser's WebAssembly support.");
        setStemmixStatus("error");
      }
    }
  };



  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchStartRef.current.x - touchEndX;
    const deltaY = touchStartRef.current.y - touchEndY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 50) {
        handleNextSong();
      } else if (deltaX < -50) {
        handlePrevSong();
      }
    }
    touchStartRef.current = null;
  };

  const handleNextSong = () => {
    if (!currentSong || recentSongs.length <= 1) return;
    const currentIndex = recentSongs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % recentSongs.length;
    playRecentSong(recentSongs[nextIndex]);
  };

  const handlePrevSong = () => {
    if (!currentSong || recentSongs.length <= 1) return;
    const currentIndex = recentSongs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + recentSongs.length) % recentSongs.length;
    playRecentSong(recentSongs[prevIndex]);
  };

  // Media Session API for Bluetooth, lockscreen, and hardware media key control
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || "TikTok Audio",
        artist: currentSong.author || "Unknown Artist",
        album: currentSong.album || "TikTok Music Box",
        artwork: currentSong.cover ? [
          { src: currentSong.cover, sizes: '96x96', type: 'image/jpeg' },
          { src: currentSong.cover, sizes: '128x128', type: 'image/jpeg' },
          { src: currentSong.cover, sizes: '192x192', type: 'image/jpeg' },
          { src: currentSong.cover, sizes: '256x256', type: 'image/jpeg' },
          { src: currentSong.cover, sizes: '384x384', type: 'image/jpeg' },
          { src: currentSong.cover, sizes: '512x512', type: 'image/jpeg' },
        ] : [],
      });
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current && audioUrl) {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.warn("Bluetooth play blocked:", e));
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrevSong();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNextSong();
      });
    } catch (e) {
      console.warn("MediaSession action handler registration failed:", e);
    }

    return () => {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
        } catch (_) {}
      }
    };
  }, [currentSong, audioUrl, recentSongs]);

  // Update media session playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      } catch (_) {}
    }
  }, [isPlaying]);

  return (
    <div className={`text-[#E0E2E8] font-sans flex flex-col relative overflow-hidden ${
      isCompact ? "h-[100dvh] max-h-[100dvh] bg-[#0A0B10]" : "min-h-[100dvh] bg-[#0A0B10]"
    }`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {currentSong?.cover && (
        <>
          <div 
            className="absolute inset-0 z-0 opacity-40 transition-opacity duration-1000 scale-110 pointer-events-none"
            style={{
              backgroundImage: `url(${currentSong.cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(150%)',
            }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/0 via-[#0A0B10]/60 to-[#0A0B10] pointer-events-none" />
        </>
      )}

      {audioError && (
        <div className="bg-red-500/90 text-white p-3 z-[60] text-sm text-center shadow-md">
           <Info className="w-4 h-4 inline mr-1" /> {audioError}
        </div>
      )}

       {countdown && (
        <div 
          className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 bg-[#0E0F14]/95 backdrop-blur-md text-[#E0E2E8] px-4 py-2 rounded-full z-[100] text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center justify-center border border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.8)] transition-all duration-[600ms] ease-out select-none ${
            countdown.visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            {countdown.isCompleting ? (
              <>
                <span className="flex h-1.5 w-1.5 relative shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[9px] sm:text-[10px] text-emerald-400 font-extrabold tracking-widest shrink-0">
                  {countdown.type === "HD" ? "HD OK" : "BG OK"}
                </span>
                <span className="text-white/15 text-[8px] select-none shrink-0">|</span>
                <span className="font-sans text-[10px] text-white/90 truncate max-w-[140px] sm:max-w-xs normal-case">
                  {countdown.type === "HD"
                    ? `Lossless HD Enabled`
                    : `iOS BG Mode Active`}
                </span>
              </>
            ) : (
              <>
                <span className="flex h-1.5 w-1.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                <span className="font-mono text-[9px] sm:text-[10px] text-amber-400 font-extrabold tracking-widest shrink-0">
                  {countdown.type === "HD" ? "HD" : "BG PLAY"}
                </span>
                <span className="text-white/15 text-[8px] select-none shrink-0">|</span>
                <span className="font-sans text-[10px] text-white/90 truncate max-w-[140px] sm:max-w-xs normal-case">
                  {countdown.type === "HD" 
                    ? `${countdown.targetValue ? "Activating" : "Deactivating"} in ${countdown.secondsLeft}s`
                    : `${countdown.targetValue ? "Enabling" : "Disabling"} in ${countdown.secondsLeft}s`}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      
{/* Main Single Page Layout Container */}
      <div 
        className={`w-full mx-auto relative z-20 h-full max-h-[100dvh] overflow-hidden flex flex-col ${
          showStemmix 
            ? "lg:grid lg:grid-cols-3 px-1 lg:px-4 pt-1 pb-1 flex-1 lg:gap-6" 
            : "px-1 lg:px-4 pt-1 pb-1 flex-1"
        }`}
      >
        {/* Column 1 (Left Column) - Player & Playlist */}
        <div className={`w-full flex flex-col ${
          showStemmix
            ? "max-w-screen-md mx-auto flex-1 min-h-0 lg:col-span-1 lg:h-full lg:overflow-y-auto lg:custom-scrollbar lg:pr-2 lg:gap-4 shrink-0"
            : "max-w-screen-md mx-auto flex-1 min-h-0"
        }`}>
          
          {/* Player Section */}
        <div className={`w-full max-w-lg mx-auto flex flex-col items-center justify-center shrink-0 relative isolate sticky top-[0.5rem] z-[60] border border-white/10 overflow-hidden ${
          isCompact 
            ? "pt-3 pb-3 mb-2 rounded-[2rem] shadow-[0_12px_36px_rgba(0,0,0,0.5)]" 
            : "pt-4 pb-2 mb-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        }`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            
            {/* Dynamic Artwork Background */}
            {currentSong?.cover && (
               <div 
                  className="absolute inset-0 -z-20 bg-center bg-cover blur-[50px] opacity-50 scale-[1.2] transition-all duration-1000 saturate-[1.5]"
                  style={{ backgroundImage: `url(${currentSong.cover})` }}
               />
            )}
            <div className="absolute inset-0 -z-10 bg-[#0A0B10]/50 backdrop-blur-[40px]" />
            
            {/* Cover Art / Visualizer */}
            {uiLayoutMode !== "hidden" && (() => {
               const ytUrl = currentSong ? getYouTubeEmbedUrl(currentSong.originalUrl) : null;
               return (
            <div 
               onClick={!showVisualizer && !showVideoIframe ? cycleVisualizer : undefined}
               className={`transition-all duration-500 ease-out bg-black/40 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border shrink-0 relative ${
                 isCompact
                   ? ((showVisualizer && isVisualizerExpanded) || showVideoIframe
                       ? 'w-full h-[140px] md:h-[160px] border-x-0 rounded-none border-white/10 select-none mb-3' 
                       : `w-[110px] h-[110px] md:w-[130px] md:h-[130px] rounded-[1.25rem] mb-3 ${showVisualizer ? 'border-white/10 select-none' : 'border-white/5 cursor-pointer hover:border-white/20'}`)
                   : ((showVisualizer && isVisualizerExpanded) || showVideoIframe
                       ? 'w-full h-[280px] md:h-[360px] border-x-0 rounded-none border-white/10 select-none mb-6' 
                       : `w-[220px] h-[220px] md:w-[280px] md:h-[280px] rounded-[2rem] mb-6 ${showVisualizer ? 'border-white/10 select-none' : 'border-white/5 cursor-pointer hover:border-white/20'}`)
               } ${isPlaying && !showVisualizer && !showVideoIframe ? 'scale-100' : 'scale-[1.0]'}`}
            >
               {showVisualizer ? (
                  <Visualizer 
                     analyser={bgPlayBypass ? null : analyser} 
                     isPlaying={isPlaying} 
                     settings={{ 
                       type: visSettings.type, 
                       palette: visSettings.palette, 
                       barWidthMultiplier: visSettings.barWidthMultiplier, 
                       barSpacing: visSettings.barSpacing, 
                       colorIntensity: visSettings.colorIntensity, 
                       glowStrength: visSettings.glowStrength 
                     }} 
                     coverUrl={currentSong?.cover}
                     onContainerClick={cycleVisualizer}
                     isExpanded={isVisualizerExpanded}
                     onToggleExpand={() => setIsVisualizerExpanded(!isVisualizerExpanded)}
                     isSignatureSound={isSignatureSound}
                     isCompact={isCompact}
                     className="w-full h-full flex justify-center items-center relative overflow-hidden bg-black/95" 
                  />
               ) : showVideoIframe && ytUrl ? (
                  <iframe 
                    src={ytUrl} 
                    title="Video Player"
                    className="w-full h-full border-none absolute inset-0 bg-black"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
               ) : showVideoIframe && !!currentSong?.videoUrl ? (
                  <video 
                    ref={videoRef}
                    src={currentSong.videoUrl || currentSong.audioUrl} 
                    autoPlay
                    muted
                    loop
                    playsInline
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain absolute inset-0 bg-black"
                  />
               ) : currentSong?.cover ? (
                  <>
                    <FallbackImage src={currentSong.cover} alt={currentSong.title} className="w-full h-full object-cover transition-opacity" />
                  </>
               ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music className={`text-white/20 ${isCompact ? "w-10 h-10" : "w-20 h-20"}`} /></div>
               )}
            </div>
            );})()}

            {/* Info */}
            <div className={`w-full px-6 flex flex-col ${isCompact ? 'mb-2.5 text-center' : 'mb-6 text-left'}`}>
                 <h2 className={`font-bold text-white tracking-tight truncate leading-tight w-full drop-shadow-sm transition-all ${isCompact ? 'text-[15px]' : 'text-[20px] md:text-[24px]'}`}>{fileName || "Unknown Track"}</h2>
                 <p className={`font-medium tracking-wide truncate break-all w-full transition-all ${isCompact ? 'text-[11px] text-white/50 mt-0.5' : 'text-[14px] text-white/70 mt-1'}`}>{currentSong?.author || "Unknown Artist"}</p>
            </div>

            {/* Time / Progress */}
            <div className={`w-full px-6 ${isCompact ? 'mb-2.5' : 'mb-6'}`}>
                 <div 
                     className="h-1.5 w-full bg-black/30 backdrop-blur-md border border-white/10 rounded-full cursor-pointer relative group transition-all shadow-inner"
                     onClick={(e) => {
                       if (audioRef.current && duration) {
                         const rect = e.currentTarget.getBoundingClientRect();
                         const pos = (e.clientX - rect.left) / rect.width;
                         audioRef.current.currentTime = pos * audioRef.current.duration;
                       }
                     }}
                 >
                    <div ref={progressBarRef1} className="h-full bg-white/90 rounded-full pointer-events-none transition-none shadow-[0_0_12px_rgba(255,255,255,0.6)] relative">
                       <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                    </div>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold text-white/50 tracking-widest mt-1.5 px-0.5">
                    <span ref={currentTimeRef}>0:00</span>
                    <span>{formatDurationDisplay(duration)}</span>
                 </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center justify-center w-full px-6 mb-1">
                {/* Main Playback Controls */}
                <div className={`flex items-center justify-between w-full relative ${isCompact ? 'px-0 mb-3' : 'px-4 mb-6'}`}>
                  {/* Left: Repeat Button */}
                  <div className="flex justify-center w-12 border-none">
                    <button 
                      onClick={() => {
                        setRepeatMode(prev => prev === "all" ? "one" : prev === "one" ? "off" : "all");
                      }} 
                      className={`active:scale-90 transition-all rounded-full p-2 relative ${repeatMode !== "off" ? 'text-amber-400' : 'text-white/40 hover:text-white/80'}`}
                      title={repeatMode === "all" ? "Repeat All" : repeatMode === "one" ? "Repeat One" : "Repeat Off"}
                    >
                      <Repeat className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                      {repeatMode === "one" && <span className="absolute top-0 right-0 text-[8px] font-bold bg-amber-500 text-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black">1</span>}
                    </button>
                  </div>

                  {/* Center: Prev, Play, Next */}
                  <div className={`flex items-center justify-center flex-1 ${isCompact ? 'gap-4' : 'gap-6 md:gap-10'}`}>
                    <button onClick={handlePrevSong} className={`text-white hover:text-white/80 active:scale-90 transition-all rounded-full hover:bg-white/10 ${isCompact ? 'p-2' : 'p-4'}`}>
                        <SkipBack className={`${isCompact ? 'w-5 h-5' : 'w-8 h-8'} fill-current`} />
                    </button>

                    <button 
                        onClick={togglePlay}
                        className={`rounded-full bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/20 ${
                          isCompact ? 'w-[52px] h-[52px]' : 'w-[72px] h-[72px] md:w-[88px] md:h-[88px]'
                        }`}
                    >
                        {isPlaying 
                          ? <Pause className={`${isCompact ? 'w-5 h-5' : 'w-8 h-8 md:w-10 md:h-10'} fill-current`} /> 
                          : <Play className={`${isCompact ? 'w-5 h-5 ml-0.5' : 'w-8 h-8 md:w-10 md:h-10 ml-1'} fill-current`} />
                        }
                    </button>

                    <button onClick={handleNextSong} className={`text-white hover:text-white/80 active:scale-90 transition-all rounded-full hover:bg-white/10 ${isCompact ? 'p-2' : 'p-4'}`}>
                        <SkipForward className={`${isCompact ? 'w-5 h-5' : 'w-8 h-8'} fill-current`} />
                    </button>
                  </div>

                  {/* Empty Right container to balance flex space */}
                  <div className="relative flex justify-center w-12 border-none">
                    {(() => {
                      const ytUrl = currentSong ? getYouTubeEmbedUrl(currentSong.originalUrl) : null;
                      const isTikTokVideo = !!currentSong?.videoUrl && !ytUrl;
                      const hasVideo = !!(ytUrl || isTikTokVideo);
                      return hasVideo && (
                        <button 
                          onClick={() => {
                          const nextState = !showVideoIframe;
                          setShowVideoIframe(nextState);
                          if (nextState) setShowVisualizer(false);
                        }}
                          className={`text-white hover:text-white/80 active:scale-90 transition-all rounded-full hover:bg-white/10 ${isCompact ? 'p-2' : 'p-3'} ${showVideoIframe ? 'text-amber-400 bg-amber-400/10' : ''}`}
                          title="Watch Video"
                        >
                          <MonitorPlay className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} fill-current`} />
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Utility Controls */}
                <div className="flex items-center gap-5 justify-center w-full">
                  <button 
                    onClick={handleToggleHD} 
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${isSignatureSound ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'text-white/40 hover:text-white/70'}`}
                    title="Toggle Lossless HD Audio"
                  >
                      <span className="font-black text-[13px] tracking-widest uppercase">HD</span>
                  </button>
                  {(() => {
                    const ytUrl = currentSong ? getYouTubeEmbedUrl(currentSong.originalUrl) : null;
                    const isTikTokVideo = !!currentSong?.videoUrl && !ytUrl;
                    
                    return (showVideoIframe && (isTikTokVideo || ytUrl)) ? (
                      <button 
                        onClick={async () => {
                          const videoEl = videoRef.current;
                          if (isTikTokVideo && videoEl && document.pictureInPictureEnabled) {
                            try {
                              if (document.pictureInPictureElement) {
                                await document.exitPictureInPicture();
                              } else {
                                await videoEl.requestPictureInPicture();
                              }
                            } catch (e) {
                              console.warn("PIP failed", e);
                            }
                          } else if (ytUrl) {
                              // Fallback for YouTube: Toggle video mode since we can't natively PIP an iframe easily
                              setShowVideoIframe(!showVideoIframe);
                          } else if (!showVideoIframe) {
                            setShowVideoIframe(true);
                          }
                        }} 
                        className={`flex flex-row items-center justify-center gap-1.5 p-2 rounded-xl transition-all active:scale-95 ${document.pictureInPictureElement ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'text-white/40 hover:text-white/70'}`}
                        title="Picture-in-Picture"
                      >
                          <PictureInPicture className="w-5 h-5" />
                          <span className="font-black text-[9px] sm:text-[10px] whitespace-nowrap tracking-wider uppercase">PIP</span>
                      </button>
                    ) : (
                      <button 
                        onClick={toggleBgBypass} 
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${bgPlayBypass ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'text-white/40 hover:text-white/70'}`}
                        title="Toggle Background / iOS Lockscreen Playback"
                      >
                          <span className="font-black text-[9px] sm:text-[10px] whitespace-nowrap tracking-wider uppercase text-center">BG PLAY</span>
                      </button>
                    );
                  })()}
                  {!showVideoIframe && (
                    <button 
                      onClick={cycleVisualizer}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${showVisualizer ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'text-white/40 hover:text-white/70'}`}
                    title="Visualizer Mode"
                  >
                      <AudioWaveform className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowStemmix(!showStemmix)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${showStemmix ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'text-white/40 hover:text-white/70'}`}
                    title="Separate Audio Stems (Stemmix)"
                  >
                      <span className="font-black text-[11px] tracking-widest uppercase">STEMS</span>
                  </button>

                  <button 
                    onClick={() => setShowTuning(!showTuning)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${showTuning ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'text-white/40 hover:text-white/70'}`}
                    title="EQ & Settings"
                  >
                      <SlidersHorizontal className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => setUiLayoutMode(prev => prev === "full" ? "compact" : prev === "compact" ? "hidden" : "full")}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${uiLayoutMode !== "full" ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'text-white/40 hover:text-white/70'}`}
                    title={uiLayoutMode === "full" ? "Compact Layout" : uiLayoutMode === "compact" ? "Hidden Visualizer" : "Full Layout"}
                  >
                      {uiLayoutMode === "full" ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                </div>
            </div>

            {/* EQ Panel (Inline) */}
            {showTuning && (
               <div className={`w-full mt-2 flex flex-col gap-4 bg-black/20 backdrop-blur-md rounded-[24px] border border-white/5 p-5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative transition-all duration-500 animate-in slide-in-from-top-2 fade-in z-50 ${isCompact ? 'overflow-y-auto max-h-[35vh] scrollbar-thin scrollbar-thumb-white/10' : 'overflow-hidden'}`}>
                   
                   {/* HD Master & iOS BG Mode Toggles Grid */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                      
                      {/* HD Master Toggle */}
                      <div 
                         className={`p-3.5 rounded-[18px] border transition-all duration-500 flex justify-between items-center relative overflow-hidden ${isSignatureSound ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/40 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)]' : 'bg-black/40 border-white/5'}`}
                      >
                         <div className="relative z-10 flex flex-col pr-2">
                            <h3 className={`font-black text-[13px] tracking-widest uppercase flex items-center gap-2 transition-colors ${isSignatureSound ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-white'}`}>
                                HD
                            </h3>
                            <p className={`text-[10px] mt-0.5 font-medium transition-colors ${isSignatureSound ? 'text-amber-300/80' : 'text-white/40'}`}>Lossless Upscaling</p>
                         </div>
                         <button 
                               onClick={handleToggleHD} 
                               className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-300 shadow-inner z-10 border border-black/30 ${isSignatureSound ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-white/10'}`}
                            >
                               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-[0_2px_5px_rgba(0,0,0,0.5)] ${isSignatureSound ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                      </div>

                      {/* iOS Background Play Fix Toggle */}
                      <div 
                         className={`p-3.5 rounded-[18px] border transition-all duration-500 flex justify-between items-center relative overflow-hidden ${bgPlayBypass ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/40 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)]' : 'bg-black/40 border-white/5'}`}
                      >
                         <div className="relative z-10 flex flex-col pr-2">
                            <h3 className={`font-black text-[13px] tracking-widest uppercase flex items-center gap-2 transition-colors ${bgPlayBypass ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-white'}`}>
                                iOS BG Mode
                            </h3>
                            <p className={`text-[10px] mt-0.5 font-medium transition-colors ${bgPlayBypass ? 'text-amber-300/80' : 'text-white/40'}`}>Background & lockscreen</p>
                         </div>
                         <button 
                               onClick={toggleBgBypass} 
                               className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-300 shadow-inner z-10 border border-black/30 ${bgPlayBypass ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-white/10'}`}
                            >
                               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-[0_2px_5px_rgba(0,0,0,0.5)] ${bgPlayBypass ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                      </div>

                   </div>



                   {bgPlayBypass && (
                     <div className="p-3 bg-amber-500/10 border border-amber-500/10 rounded-[14px] text-amber-300 text-[10.5px] leading-relaxed relative overflow-hidden backdrop-blur-sm shadow-[inset_0_0_12px_rgba(251,191,36,0.03)] select-none animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="font-extrabold uppercase tracking-widest text-[9.5px] text-amber-400 mb-0.5 flex items-center gap-1.5">
                          <span className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> iOS BG MODE ACTIVE</span>
                        </div>
                        <p className="opacity-80">
                          Web Audio is bypassed to support true lockscreen background play. <strong>Waveforms and HD Lossless upscaling are dynamically simulated in this compatibility mode.</strong>
                        </p>
                     </div>
                   )}

                   {/* Equalizer */}
                   <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full px-1">
                      <div className="flex justify-between items-end mb-4 shrink-0">
                        <h3 className="font-bold text-[12px] uppercase tracking-widest text-white/70">Equalizer</h3>
                        <button 
                          onClick={() => {
                              const newEq = eqSettings.map((b) => ({ ...b, g: 0 }));
                              setEqSettings(newEq);
                              newEq.forEach((band, i) => updateEqNode?.(i, "gain", 0));
                          }}
                          className="text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-y-2 gap-x-2 relative z-10 w-full pb-2">
                           {eqSettings.map((band, i) => (
                              <div key={i} className="flex flex-col items-center justify-between h-[120px] w-full relative group">
                                <div className={`text-[10px] font-bold tracking-widest px-1 rounded flex items-center justify-center text-center -mb-2 z-10 transition-colors ${band.g !== 0 ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'text-white/30'}`}>
                                   {band.g > 0 ? '+' : ''}{band.g.toFixed(1)}
                                </div>
                                
                                <div className="flex-1 w-full flex justify-center relative my-3">
                                    <div className="absolute w-[4px] h-[80px] top-1/2 -translate-y-1/2 bg-black/60 rounded-full drop-shadow-sm border border-white/5" />
                                    <div className="absolute top-1/2 left-1/2 w-6 h-[2px] bg-white/10 -translate-y-1/2 -translate-x-1/2 rounded" />
                                    <div 
                                      className="absolute left-1/2 -translate-x-1/2 bottom-[10px] w-[4px] rounded-full bg-amber-500/50 pointer-events-none transition-all duration-200" 
                                      style={{ 
                                        height: `${band.g > 0 ? (band.g / 12) * 50 : 0}%`, 
                                        bottom: '50%',
                                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                                      }} 
                                    />
                                    <div 
                                      className="absolute left-1/2 -translate-x-1/2 top-[10px] w-[4px] rounded-full bg-white/20 pointer-events-none transition-all duration-200" 
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
                                         const newEq = [...eqSettings];
                                         newEq[i].g = val;
                                         setEqSettings(newEq);
                                         updateEqNode?.(i, "gain", val);
                                       }}
                                       className="w-full h-full bg-transparent appearance-none cursor-grab active:cursor-grabbing absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !origin-center -rotate-90 slider-vertical-glass"
                                       style={{ width: '80px', height: '32px' }}
                                    />
                                </div>

                                <div className={`text-[10px] font-bold tracking-widest h-4 flex items-center justify-center text-center leading-tight transition-colors ${band.g !== 0 ? 'text-amber-400/80' : 'text-white/40'}`}>
                                   {band.name.replace('Hz','').replace('kHz','k')}
                                </div>
                              </div>
                           ))}
                         </div>
                   </div>
               </div>
            )}
          </div> {/* End of Player Section */}

          {/* Integrated Playlist Section */}
          <div className={`w-full max-w-lg mx-auto flex flex-col min-h-0 px-2 ${
            isCompact 
              ? `flex-1 overflow-hidden mt-3 pb-3 ${showStemmix ? "hidden lg:flex" : ""}` 
              : "flex-1 shrink-0 mt-6 pb-6"
          }`}>
          
          {/* Header tabs row */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 px-3 col-span-full">
            <div className="flex gap-2 sm:gap-6 overflow-x-auto scrollbar-none max-w-full">
              <button
                onClick={() => setPlaylistTab("upnext")}
                className={`text-[9px] sm:text-[12px] tracking-widest sm:font-bold font-semibold uppercase transition-all pb-1 relative flex-shrink-0 ${
                  playlistTab === "upnext" 
                    ? "text-white" 
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                Songs<span className="hidden sm:inline"> {recentSongs.length > 0 && `(${recentSongs.length})`}</span>
                {playlistTab === "upnext" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
                )}
              </button>
              
              <button
                onClick={() => setPlaylistTab("albums")}
                className={`text-[9px] sm:text-[12px] tracking-widest sm:font-bold font-semibold uppercase transition-all pb-1 relative flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                  playlistTab === "albums" 
                    ? "text-white" 
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                Albums
                {playlistTab === "albums" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setPlaylistTab("search")}
                className={`text-[9px] sm:text-[12px] tracking-widest sm:font-bold font-semibold uppercase transition-all pb-1 relative flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ${
                  playlistTab === "search" 
                    ? "text-white" 
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                Search
                {playlistTab === "search" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setPlaylistTab("community")}
                className={`transition-all pb-1 px-1 relative flex items-center justify-center flex-shrink-0 ${
                  playlistTab === "community" 
                    ? "text-white" 
                    : "text-white/40 hover:text-white/70"
                }`}
                title="Community"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
                {playlistTab === "community" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
                )}
              </button>
            </div>

            {/* Quick header action inside Album/UpNext */}
            <div className="flex items-center gap-2">
              {recentSongs.length > 0 && playlistTab === "upnext" && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setRecentSongs([]);
                      setCurrentSong(null);
                      setAudioUrl(null);
                      setFileName(null);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/5 text-[#E0E2E8]/30 hover:text-red-400 hover:bg-white/10 transition-all"
                    title="Clear all songs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setShowAddAlbum(!showAddAlbum);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  showAddAlbum
                    ? "bg-amber-400 text-black rotate-45" 
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Add TikTok/YouTube link or profile"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPlaylistTab("guide")}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  playlistTab === "guide"
                    ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                    : "bg-white/10 text-white hover:bg-white/20 hover:text-amber-400"
                }`}
                title="App Introduction & Setup Guide"
              >
                <Info className="w-4 h-4" />
              </button>
              {/* YouTube Cookies/Bypass Settings Button - Always visible */}
              <button
                onClick={() => {
                  refreshCookiesStatus();
                  setShowSettingsModal(true);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  showSettingsModal 
                    ? "bg-amber-400 text-black" 
                    : "bg-white/10 text-white hover:bg-white/20 hover:text-amber-400"
                }`}
                title="YouTube Bot Bypass (Add Cookies)"
              >
                <Settings className={`w-4 h-4 ${cookiesStatus.loaded ? "text-emerald-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Tab contents */}
          
          {/* 1. Add Album Form (Always shows when showAddAlbum is true) */}
          {showAddAlbum && (
            <form 
              onSubmit={handleAddAlbumSubmit} 
              className="mb-5 bg-white/5 border border-white/10 rounded-2xl p-4 animate-in slide-in-from-top-1 fade-in duration-300"
            >
              <div className="text-[11px] font-bold tracking-wider text-amber-400 uppercase mb-2.5">
                Add Creator or Track
              </div>
              <p className="text-[11px] text-white/50 mb-3">
                Paste a link from <strong>TikTok, YouTube, Facebook, NCT, or TKaraoke</strong>.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste URL here..."
                  value={newAlbumInput}
                  onChange={(e) => setNewAlbumInput(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-[16px] md:text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  disabled={isFetchingTiktok}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isFetchingTiktok || !newAlbumInput.trim()}
                  className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-extrabold text-xs px-4 rounded-xl transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <label className="flex-1 bg-white/10 hover:bg-white/15 cursor-pointer border border-white/10 rounded-xl px-3.5 py-2.5 text-center transition-all flex items-center justify-center gap-2">
                   <Upload className="w-4 h-4 text-white/70" />
                   <span className="text-[11px] font-bold tracking-wider text-white/70 uppercase">Import Local Audio</span>
                   <input 
                      type="file" 
                      accept="audio/*,.mp3,.wav,.m4a,.aac" 
                      className="hidden" 
                      onChange={handleLocalAudioUpload} 
                   />
                </label>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 px-1 leading-normal">
                Type any creator username like `@khaby.lame` to load posts as dynamic albums, paste video URLs, or import local files.
              </p>
            </form>
          )}

          {/* Error messages/Loading Indicators */}
          {isFetchingTiktok && (
            <div className="mb-4 bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center border border-white/5 animate-pulse">
              <div className="w-5 h-5 border-2 border-amber-400 rounded-full border-t-transparent animate-spin mb-2" />
              <div className="text-[11px] font-bold tracking-widest text-[#E0E2E8]/70 uppercase">Extracting Audio...</div>
            </div>
          )}

          {tiktokError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center animate-in zoom-in-95 duration-250">
              <p className="text-red-400 text-xs font-medium leading-relaxed break-words">{tiktokError}</p>
              <button 
                onClick={() => setTiktokError("")} 
                className="text-[10px] font-extrabold tracking-widest text-white/40 uppercase mt-2 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab 1: Up Next */}
          {playlistTab === "upnext" && (
            <div className={`z-10 relative flex flex-col min-h-0 flex-1 overflow-hidden`}>
              {recentSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/[0.02] border border-white/[0.04] rounded-3xl text-center">
                  <Music className="w-8 h-8 text-white/10 mb-3" />
                  <div className="text-xs font-bold text-white/50 tracking-wider">Queue is currently empty</div>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    <button 
                      onClick={() => setPlaylistTab("albums")}
                      className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-3.5 py-1.5 rounded-full transition-all"
                    >
                      Browse Albums
                    </button>
                    <button 
                      onClick={() => handleLoadDefaultPlaylist(true)}
                      className="text-[10px] font-extrabold text-white/60 hover:text-white uppercase tracking-widest bg-white/5 border border-white/15 px-3.5 py-1.5 rounded-full transition-all"
                    >
                      Load Default
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase">Up Next ({recentSongs.length})</span>
                    <button
                      onClick={() => {
                        if (recentSongs.length > 0) {
                          const randomIndex = Math.floor(Math.random() * recentSongs.length);
                          playRecentSong(recentSongs[randomIndex]);
                        }
                      }}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 uppercase px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle className="w-3 h-3" />
                      Play Random
                    </button>
                  </div>
                  <div className={`flex flex-col gap-1 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1 overflow-y-auto`}>
                    {recentSongs.map((song) => {
                      const isActive = currentSong?.id === song.id;
                      return (
                        <div 
                          key={song.id} 
                          onClick={() => playRecentSong(song)}
                          className={`group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${
                            isActive 
                              ? 'bg-white/10 backdrop-blur-md shadow-lg border border-white/5' 
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-black/40 flex items-center justify-center shadow-md relative group-hover:scale-105 transition-transform duration-300">
                            {song.cover ? (
                              <FallbackImage src={song.cover} alt="cov" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-4 h-4 text-white/40" />
                            )}
                            {isActive && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                {isPlaying ? (
                                  <span className="flex gap-0.5 items-end h-3">
                                    <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_100ms] h-full" />
                                    <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_300ms] h-3/4" />
                                    <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_500ms] h-1/2" />
                                  </span>
                                ) : (
                                  <Play className="w-3" />
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold tracking-tight truncate ${isActive ? 'text-amber-400' : 'text-white'}`}>
                              {song.title}
                            </div>
                            <div className="text-[11px] text-white/50 font-medium tracking-wide truncate mt-0.5">
                              {song.author}
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            {/* Download song option */}
                            <button 
                              onClick={(e) => downloadAudio(e, song)}
                              className="opacity-70 md:opacity-0 group-hover:opacity-100 p-2 text-white/40 hover:text-amber-400 rounded-full transition-all active:scale-90 hover:bg-white/5"
                              title="Download audio"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete song option */}
                            <button 
                              onClick={(e) => deleteRecentSong(song.id, e)}
                              className="opacity-70 md:opacity-0 group-hover:opacity-100 p-2 text-white/40 hover:text-red-400 rounded-full transition-all active:scale-90 hover:bg-white/5"
                              title="Remove from queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic user album pagination indicator & click actions */}
                  {activeAlbumUsername && activeAlbumHasMore && (
                    <div className="mt-3 pt-2 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchAndPlayUserAlbum(activeAlbumUsername, true);
                        }}
                        disabled={isLoadingMore || isFetchingTiktok}
                        className="w-full py-3 px-4 bg-amber-400/10 hover:bg-amber-400/15 border border-amber-400/20 active:scale-98 transition-all text-amber-300 font-extrabold text-[10px] tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2 shadow-inner"
                      >
                        {isLoadingMore ? (
                          <>
                            <div className="w-3 h-3 border-2 border-amber-400 rounded-full border-t-transparent animate-spin" />
                            LOADING MORE TRACKS FROM TIKTOK...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            LOAD NEXT SONGS FOR @{activeAlbumUsername}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Tab 2: Albums */}
          {playlistTab === "albums" && (
            <div className="flex flex-col gap-3 min-h-0 flex-1">
              {/* Compact Defaults Control Bar */}
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 px-3 rounded-2xl shrink-0">
                <span className="text-[9px] font-black tracking-widest text-[#E0E2E8]/40 uppercase">Default Playlist</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSaveCurrentQueueAsDefault}
                    className={`text-[8px] font-black tracking-widest uppercase transition-all px-2.5 py-1.5 rounded-xl border ${
                      saveQueueSuccess 
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" 
                        : "text-[#E0E2E8]/40 bg-white/[0.02] border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                    title="Save active queue as the default start list on server"
                  >
                    {saveQueueSuccess ? "Saved ✓" : "Save as Default"}
                  </button>
                  <button
                    onClick={() => handleLoadDefaultPlaylist(true)}
                    className="text-[8px] font-black tracking-widest text-[#E0E2E8]/40 hover:text-amber-400 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-xl uppercase transition-all"
                    title="Reset playlist to the server defaults"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Layout constraint wrapper so Albums and Other Tracks scroll together */}
              <div className={`flex flex-col pb-4 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10`}>
                <div className="grid grid-cols-2 gap-3 items-start content-start">
              {allAlbums.map((alb) => {
                const normalizedUser = alb.username.toLowerCase();
                const isActive = activeAlbumUsername === normalizedUser;
                const cacheData = albumsCache[normalizedUser];
                const isCached = !!cacheData && cacheData.songs?.length > 0;
                const isSharedInFirebase = firebaseUsernames.some(u => u.username.toLowerCase() === normalizedUser);
                
                return (
                  <div
                    key={alb.id}
                    onClick={() => {
                      fetchAndPlayUserAlbum(alb.username);
                    }}
                    className={`group flex items-center justify-between p-2 rounded-[16px] cursor-pointer border transition-all duration-500 relative overflow-hidden h-[60px] ${
                      isActive
                        ? "bg-gradient-to-br from-amber-500/20 to-amber-900/10 border-amber-400/40 shadow-[0_8px_30px_rgb(245,158,11,0.15)]"
                        : "bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/5 hover:from-white/[0.08] hover:to-white/[0.03] hover:border-white/20 hover:shadow-xl hover:shadow-black/50"
                    }`}
                  >
                    {/* Left part: Logo + Username / count */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 relative z-10">
                      {/* Premium Circle Avatar Layout with Layered Zero-State Fallback */}
                      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-lg border border-white/10 group-hover:border-white/30 transition-colors">
                        <div className={`absolute inset-0 flex items-center justify-center font-black text-[10px] select-none uppercase transition-all duration-500 ${
                          isActive 
                            ? "bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                            : "bg-gradient-to-br from-white/10 to-white/5 text-white/80 group-hover:from-white/20 group-hover:to-white/10 group-hover:text-white"
                        }`}>
                          {alb.avatarSub || alb.username.slice(0, 2).toUpperCase()}
                        </div>
                        {alb.avatar ? (
                          <FallbackImage 
                            src={alb.avatar} 
                            className="absolute inset-0 w-full h-full object-cover transition-all duration-500 rounded-full group-hover:scale-110" 
                            alt=""
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay"></div>
                        )}
                        {/* active animated gold pulsing border */}
                        {isActive && (
                          <div className="absolute inset-0 border-[2px] border-amber-400 rounded-full animate-pulse pointer-events-none" />
                        )}
                        
                        {/* Luxury Glossy Sheen */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-full pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 20%)' }}></div>
                      </div>

                      {/* Display name & Saved/Local count */}
                      <div className="flex flex-col min-w-0">
                        <h4 className={`text-[11px] font-black tracking-tight truncate leading-tight drop-shadow-sm ${
                          isActive ? "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]" : "text-white/90 group-hover:text-white"
                        }`}>
                          {alb.displayName || `@${alb.username}`}
                        </h4>
                        
                        {/* Dynamic Offline / Cached Indicator */}
                        {isCached ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                            <p className="text-[9px] text-emerald-400/90 font-bold tracking-wider uppercase select-none truncate">
                              Saved ({cacheData.songs.length})
                            </p>
                          </div>
                        ) : (
                          <p className="text-[9px] text-white/40 mt-0.5 font-semibold tracking-wider uppercase select-none group-hover:text-white/60 transition-colors truncate">
                            {alb.isFromCommunity ? "Shared" : "Local"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right part: Control Tray Inside Album Block */}
                    <div className="flex items-center gap-0.5 relative z-10" onClick={(e) => e.stopPropagation()}>
                      {isCached && (
                        <button
                          onClick={() => {
                            fetchAndPlayUserAlbum(alb.username, false, true);
                          }}
                          className={`p-0.5 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-amber-400 ${
                            isFetchingTiktok && isActive ? "animate-spin text-amber-400" : ""
                          }`}
                          title="Force refresh database & recreate live audio proxy links"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      )}

                      {/* TOGGLE SHARE CREATOR */}
                      <button
                        onClick={() => handleToggleShareUsername(alb)}
                        className={`p-0.5 hover:bg-white/10 rounded-md transition-all ${
                          isSharedInFirebase ? "text-amber-400 animate-bounce" : "text-white/40 hover:text-amber-400"
                        }`}
                        title={isSharedInFirebase ? "Shared in Community Database (Unshare)" : "Share Creator Username with Community"}
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      
                      {(alb.id.startsWith("alb_") || alb.isFromCommunity) && (
                        <button
                          onClick={() => {
                            if (alb.isFromCommunity) {
                              handleToggleShareUsername(alb);
                            } else {
                              setTiktokAlbums(prev => prev.filter(a => a.id !== alb.id));
                              // Also wipe caches for clean state
                              if (albumsCache[normalizedUser]) {
                                setAlbumsCache(prev => {
                                  const updated = { ...prev };
                                  delete updated[normalizedUser];
                                  return updated;
                                });
                              }
                            }
                          }}
                          className="p-0.5 hover:bg-white/10 text-white/40 hover:text-red-400 rounded-md transition-all"
                          title={alb.isFromCommunity ? "Delete from community database" : "Delete custom album & wipe links"}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Silky glowing decoration */}
                    <div className={`absolute right-0 bottom-0 w-24 h-24 rounded-full blur-[25px] transition-all duration-700 pointer-events-none translate-x-8 translate-y-8 ${
                      isActive ? "bg-amber-500/20" : "bg-white/5 group-hover:bg-amber-400/10 group-hover:blur-[30px]"
                    }`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50 pointer-events-none" />
                  </div>
                );
              })}
              </div>

              {/* Other Fetched Tracks (YouTube, Facebook, NCT, or custom URLs) */}
              <div className="mt-5 border-t border-white/5 pt-3 shrink-0">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black tracking-widest text-[#E0E2E8]/90 uppercase flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      Other Fetched Tracks
                    </h3>
                    <p className="text-[10px] text-white/30 font-semibold tracking-wide">
                      Your loaded YouTube, Facebook, or music links
                    </p>
                  </div>
                </div>

                {recentSongs.filter(s => s.originalUrl).length === 0 ? (
                  <div className="text-center py-5 px-4 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                    <p className="text-[10px] text-white/30 font-semibold leading-relaxed">
                      No external tracks fetched yet.<br />Paste a YouTube or Facebook link to load elements.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentSongs.filter(s => s.originalUrl).map((song) => {
                      const isShared = communityTracks.some(t => t.originalUrl === song.originalUrl);
                      const isCurrentlyPlaying = currentSong?.originalUrl === song.originalUrl;
                      
                      return (
                        <div 
                          key={song.id}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-300 ${
                            isCurrentlyPlaying 
                              ? "bg-amber-400/5 border-amber-400/35" 
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                          }`}
                        >
                          {/* Playable Area */}
                          <div 
                            onClick={() => playRecentSong(song)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          >
                            <FallbackImage 
                              src={song.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100"} 
                              alt=""
                              className="w-8 h-8 object-cover rounded-lg border border-white/5 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <h4 className={`text-[11px] font-bold truncate leading-snug ${
                                isCurrentlyPlaying ? "text-amber-400" : "text-white/80"
                              }`}>
                                {song.title}
                              </h4>
                              <p className="text-[10px] text-white/40 truncate">
                                {song.author || "Unknown Artist"}
                              </p>
                            </div>
                          </div>

                          {/* Action Items */}
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            {/* Source Platform Badge */}
                            {song.originalUrl?.includes("youtube") || song.originalUrl?.includes("youtu.be") ? (
                              <span className="text-[8px] font-black tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded-md uppercase select-none">YT</span>
                            ) : song.originalUrl?.includes("facebook") || song.originalUrl?.includes("fb") ? (
                              <span className="text-[8px] font-black tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded-md uppercase select-none">FB</span>
                            ) : song.originalUrl?.includes("nhaccuatui") ? (
                              <span className="text-[8px] font-black tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1 py-0.5 rounded-md uppercase select-none">NCT</span>
                            ) : (
                              <span className="text-[8px] font-black tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-md uppercase select-none">URL</span>
                            )}

                            {/* TAP / SHARE TOGGLE BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleShareTrack(song);
                              }}
                              className={`p-1 hover:bg-white/10 rounded-lg transition-all ${
                                isShared 
                                  ? "bg-amber-400/10 border border-amber-400/35 text-amber-400" 
                                  : "text-white/35 hover:text-amber-400"
                              }`}
                              title={isShared ? "Shared (Click to Unshare/Delete)" : "Click to Share with Community"}
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecentSongs(prev => prev.filter(s => s.id !== song.id));
                              }}
                              className="p-1 hover:bg-white/10 text-white/35 hover:text-red-400 rounded-lg transition-all"
                              title="Delete from Queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {playlistTab === "search" && (
            <div className={`z-10 relative flex flex-col min-h-0 flex-1 overflow-hidden`}>
              {/* Search Header */}
              <div className="flex flex-col gap-3 mb-4 shrink-0">
                <form onSubmit={handleTiktokSearch} className="flex flex-col gap-2.5">
                  <div className="flex w-full sm:w-fit self-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5 shrink-0 justify-between sm:justify-start overflow-x-auto scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("sound");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "sound");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap ${
                        tiktokSearchType === "sound"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      <Music className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Sound
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("video");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "video");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap ${
                        tiktokSearchType === "video"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      <Film className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("youtube");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "youtube");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap ${
                        tiktokSearchType === "youtube"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      <span className="text-[7px] sm:text-[8px] bg-red-500/20 border border-red-500/35 text-red-400 px-1 py-0.2 rounded font-black">YT</span>
                      <span className="hidden sm:inline">YouTube</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("nhaccuatui");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "nhaccuatui");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap ${
                        tiktokSearchType === "nhaccuatui"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      <span className="text-[7px] sm:text-[8px] bg-blue-500/20 border border-blue-500/35 text-blue-400 px-1 py-0.2 rounded font-black">NCT</span>
                      <span className="hidden sm:inline">Audio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("tkaraoke");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "tkaraoke");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap ${
                        tiktokSearchType === "tkaraoke"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      <span className="text-[7px] sm:text-[8px] bg-pink-500/20 border border-pink-500/35 text-pink-400 px-1 py-0.2 rounded font-black">TK</span>
                      <span className="hidden sm:inline">Karaoke</span>
                    </button>
                  </div>

                  <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={
                          tiktokSearchType === "sound"
                            ? "Search viral TikTok sounds/music names..."
                            : tiktokSearchType === "video"
                            ? "Search TikTok videos & post hashtags..."
                            : tiktokSearchType === "nhaccuatui"
                            ? "Search NhacCuaTui Vietnamese songs..."
                            : tiktokSearchType === "tkaraoke"
                            ? "Search TKaraoke for lyrics and MP3s..."
                            : "Search YouTube songs, covers or creators..."
                        }
                        value={tiktokSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTiktokSearchQuery(val);
                          fetchSuggestions(val);
                        }}
                        onFocus={() => {
                          if (tiktokSearchQuery.trim()) setShowSuggestions(true);
                        }}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-[16px] md:text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 pl-9"
                        disabled={isSearchingTiktok}
                      />
                      <Search className="w-4 h-4 text-white/30 absolute left-3 top-3.5" />
                      {tiktokSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setTiktokSearchQuery("");
                            setTiktokSearchResults([]);
                            setTiktokSearchError("");
                            setSuggestions([]);
                          }}
                          className="absolute right-3 top-3 text-white/40 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingTiktok || !tiktokSearchQuery.trim()}
                      className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-extrabold text-xs px-5 rounded-xl transition-all flex items-center gap-1 shrink-0"
                    >
                      {isSearchingTiktok ? (
                        <div className="w-3.5 h-3.5 border-2 border-black rounded-full border-t-transparent animate-spin" />
                      ) : (
                        "Search"
                      )}
                    </button>

                    {/* Suggestions list */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl z-[80] overflow-hidden backdrop-blur-md">
                        {suggestions.map((sug, i) => (
                          <div
                            key={`sug_${sug}_${i}`}
                            onClick={() => {
                              setTiktokSearchQuery(sug);
                              setShowSuggestions(false);
                              handleTiktokSearch(undefined, false, tiktokSearchType, sug);
                            }}
                            className="px-3.5 py-2.5 hover:bg-white/5 text-xs text-white/80 hover:text-white cursor-pointer flex items-center gap-2 border-b border-white/[0.02] last:border-0"
                          >
                            <Search className="w-3 h-3 text-white/40" />
                            {sug}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </form>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap px-0.5">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Recent:</span>
                    {recentSearches.map((term, idx) => (
                      <div key={`search_${term}_${idx}`} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/[0.02] rounded-md pl-2 pr-1 py-0.5 text-[9px] text-white/70 transition-colors">
                        <span
                          className="cursor-pointer font-medium hover:text-amber-400"
                          onClick={() => {
                            setTiktokSearchQuery(term);
                            handleTiktokSearch(undefined, false, tiktokSearchType, term);
                          }}
                        >
                          {term}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRecentSearches(prev => prev.filter(t => t !== term));
                          }}
                          className="text-white/30 hover:text-red-400 p-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setRecentSearches([])}
                      className="text-[9px] text-red-400/60 hover:text-red-400 uppercase font-bold tracking-widest ml-auto"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Error messages */}
              {tiktokSearchError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center animate-in zoom-in-95 duration-250 shrink-0">
                  <p className="text-red-400 text-xs font-medium leading-relaxed">{tiktokSearchError}</p>
                </div>
              )}

              {/* Search Results */}
              <div className={`flex flex-col gap-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1 overflow-y-auto`}>
                {isSearchingTiktok && tiktokSearchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/50 bg-white/[0.01] border border-white/5 rounded-3xl">
                    <div className="w-6 h-6 border-2 border-amber-400 rounded-full border-t-transparent animate-spin mb-3" />
                    <div className="text-[10px] font-black tracking-widest text-[#E0E2E8]/70 uppercase">Querying Databases...</div>
                    <p className="text-[9px] text-white/30 mt-1 max-w-[200px] text-center leading-normal">
                      Connecting to public index. This process will resolve proxy links.
                    </p>
                  </div>
                ) : tiktokSearchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/[0.01] border border-white/[0.03] rounded-3xl text-center">
                    <Search className="w-8 h-8 text-white/10 mb-2.5" />
                    <div className="text-xs font-bold text-white/50 tracking-wider">
                      {tiktokSearchQuery.trim() ? "No search results match query" : "Search TikTok/YouTube/NCT catalog"}
                    </div>
                    <p className="text-[10px] text-white/30 max-w-[240px] mt-1.5 leading-relaxed">
                      Enter any track keywords, artist names, music aliases, or TikTok sounds, then press enter.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1 px-1 shrink-0">
                      <span className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                        Returned index ({tiktokSearchResults.length})
                      </span>
                    </div>

                    {tiktokSearchResults.map((song: any, index: number) => {
                      let isActive = false;
                      if (currentSong) {
                        if (tiktokSearchType === "youtube") {
                          isActive = (song.url && currentSong.originalUrl === song.url) || (song.id && currentSong.id === song.id);
                        } else if (tiktokSearchType === "nhaccuatui") {
                          isActive = currentSong.id === ("nct_" + song.id);
                        } else if (tiktokSearchType === "tkaraoke") {
                          isActive = song.url && currentSong.originalUrl === song.url;
                        } else {
                          const songId = song.id || song.video_id || song.url || `search-result-${index}`;
                          const oembedUrl = song.url || `https://www.tiktok.com/@share/video/${song.video_id || song.id}`;
                          isActive = (songId && currentSong.id === songId) || (oembedUrl && currentSong.originalUrl === oembedUrl);
                        }
                      }
                      return (
                        <div
                          key={`${song.id || song.video_id || song.url || 'search-result'}-${index}`}
                          onClick={() => {
                            if (tiktokSearchType === "youtube") {
                              const streamUrl = `/api/stream?url=${encodeURIComponent(song.url)}`;
                              const newSong = {
                                id: song.id,
                                title: song.title,
                                originalUrl: song.url,
                                audioUrl: streamUrl,
                                cover: song.cover,
                                author: song.author,
                                duration: song.duration,
                                timestamp: Date.now()
                              };
                              setRecentSongs(prev => {
                                const filtered = prev.filter(s => s.originalUrl !== song.url && s.id !== song.id);
                                return [newSong, ...filtered].slice(0, 50);
                              });
                              playRecentSong(newSong);
                            } else if (tiktokSearchType === "nhaccuatui") {
                              // If NhacCuaTui proxy stream url is already loaded!
                              const streamUrl = song.url.includes("api/proxy-stream") 
                                ? song.url 
                                : `/api/proxy-stream?url=${encodeURIComponent(song.url)}`;
                              const newSong = {
                                id: "nct_" + song.id,
                                title: song.title,
                                originalUrl: song.nctLink || `https://www.nhaccuatui.com/bai-hat/${song.id}.html`,
                                audioUrl: streamUrl,
                                cover: song.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100",
                                author: song.author,
                                duration: song.duration,
                                timestamp: Date.now()
                              };
                              setRecentSongs(prev => {
                                const filtered = prev.filter(s => s.id !== newSong.id);
                                return [newSong, ...filtered].slice(0, 50);
                              });
                              playRecentSong(newSong);
                            } else if (tiktokSearchType === "tkaraoke") {
                              const oembedUrl = song.url;
                              setTiktokUrl(oembedUrl);
                              setTimeout(() => {
                                const fakeForm = { preventDefault: () => {} } as React.FormEvent;
                                handleTiktokFetch(fakeForm, oembedUrl);
                              }, 50);
                            } else {
                              // TikTok type
                              const oembedUrl = song.url || `https://www.tiktok.com/@share/video/${song.video_id || song.id}`;
                              const streamUrl = song.audioUrl || song.music || (song.music_info && song.music_info.play) || song.play;
                              const songTitle = song.title || song.desc || "TikTok Audio";
                              const coverArt = song.cover || song.origin_cover || (song.music_info && song.music_info.cover);
                              const creator = song.author?.nickname || song.author || "TikTok Creator";
                              
                              if (!streamUrl) {
                                // Fallback fetching direct link!
                                setTiktokUrl(oembedUrl);
                                setTimeout(() => {
                                  const fakeForm = { preventDefault: () => {} } as React.FormEvent;
                                  handleTiktokFetch(fakeForm, oembedUrl);
                                }, 50);
                                return;
                              }

                              const songId = song.id || song.video_id || song.url || `search-result-${index}`;
                              const newSong = {
                                id: songId,
                                title: songTitle,
                                originalUrl: oembedUrl,
                                audioUrl: streamUrl,
                                videoUrl: song.play || (song.video_info && song.video_info.play) || null,
                                cover: coverArt,
                                author: creator,
                                duration: song.duration,
                                timestamp: Date.now()
                              };
                              setRecentSongs(prev => {
                                const filtered = prev.filter(s => s.originalUrl !== oembedUrl && s.id !== songId);
                                return [newSong, ...filtered].slice(0, 50);
                              });
                              playRecentSong(newSong);
                            }
                          }}
                          className={`group flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer border transition-all duration-300 ${
                            isActive
                              ? "bg-amber-400/5 border-amber-400/35"
                              : "bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/10"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black/40 flex items-center justify-center relative group-hover:scale-105 transition-transform">
                            {song.cover || (song.music_info && song.music_info.cover) ? (
                              <FallbackImage
                                src={song.cover || (song.music_info && song.music_info.cover)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-white/40" />
                            )}
                            {isActive && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                {isPlaying ? (
                                  <span className="flex gap-0.5 items-end h-3">
                                    <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_100ms] h-full" />
                                    <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_300ms] h-3/4" />
                                    <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_500ms] h-1/2" />
                                  </span>
                                ) : (
                                  <Play className="w-3" />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className={`text-[11px] font-bold truncate leading-tight ${isActive ? "text-amber-400" : "text-white"}`}>
                              {song.title || song.desc}
                            </h4>
                            <p className="text-[10px] text-white/40 truncate mt-0.5">
                              {tiktokSearchType === "tkaraoke" ? "TKaraoke" : (song.author?.nickname || song.author || "TikTok Creator")}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-1">
                            {/* Source badges */}
                            {tiktokSearchType === "youtube" ? (
                              <span className="text-[8px] font-black tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded-md uppercase select-none">YT</span>
                            ) : tiktokSearchType === "nhaccuatui" ? (
                              <span className="text-[8px] font-black tracking-wider text-[#2cc0ff] bg-[#2cc0ff]/10 border border-[#2cc0ff]/20 px-1 py-0.5 rounded-md uppercase select-none">NCT</span>
                            ) : tiktokSearchType === "tkaraoke" ? (
                              <span className="text-[8px] font-black tracking-wider text-pink-400 bg-pink-400/10 border border-pink-400/20 px-1 py-0.5 rounded-md uppercase select-none">TK</span>
                            ) : (
                              <span className="text-[8px] font-black tracking-wider text-white/45 bg-white/5 border border-white/10 px-1 py-0.5 rounded-md uppercase select-none">TT</span>
                            )}

                            {song.duration ? (
                              <span className="text-[9px] font-mono text-white/40">{formatDurationDisplay(song.duration)}</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    
                    {tiktokSearchHasMore && tiktokSearchResults.length > 0 && (
                      <div className="flex justify-center mt-2 mb-4">
                        <button
                          type="button"
                          onClick={(e) => handleTiktokSearch(e, true)}
                          disabled={isSearchingTiktok}
                          className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          {isSearchingTiktok ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {playlistTab === "community" && (
            <div className={`flex flex-col gap-3 text-white/90 pb-8 ${
              isCompact 
                ? "flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin scrollbar-thumb-white/10" 
                : "h-auto w-full"
            }`}>
              
              {/* Simplified Community Tab Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                <div className="flex flex-col min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[11px] sm:text-xs font-black tracking-widest text-[#E0E2E8] uppercase flex items-center gap-1">
                      <Waves className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-pulse shrink-0" />
                      Community
                    </h3>
                    <button
                      onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminPin(!showAdminPin)}
                      className={`p-0.5 rounded-md transition-colors shrink-0 ${isAdmin ? "bg-amber-400/20 text-amber-400" : "text-white/20 hover:text-white/50"}`}
                      title={isAdmin ? "Exit Admin Mode" : "Admin Access"}
                    >
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                  <p className="text-[8px] sm:text-[10px] text-white/30 font-semibold tracking-wide leading-tight mt-0.5 truncate">
                    Tap shared track to play
                  </p>
                </div>
                
                {showAdminPin && !isAdmin ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (adminPinInput === "311") {
                        setIsAdmin(true);
                        setShowAdminPin(false);
                        setAdminPinInput("");
                      } else {
                        setAdminPinInput("");
                      }
                    }}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <input
                      type="password"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      placeholder="PIN"
                      className="w-12 sm:w-14 bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[9px] sm:text-[10px] text-white text-center focus:outline-none focus:border-amber-400/50"
                      autoFocus
                    />
                    <button type="submit" className="text-[9px] sm:text-[10px] font-bold bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">OK</button>
                  </form>
                ) : communityTracks.length > 0 && (
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      onClick={() => {
                        const standardTracks = communityTracks.map(t => ({
                          id: t.id,
                          title: t.title,
                          author: t.author,
                          cover: t.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100",
                          duration: t.duration,
                          audioUrl: t.audioUrl,
                          originalUrl: t.originalUrl
                        }));
                        setRecentSongs(standardTracks);
                        if (standardTracks.length > 0) {
                          playRecentSong(standardTracks[0]);
                        }
                      }}
                      className="text-[9px] font-extrabold text-black bg-amber-400 hover:bg-amber-300 px-1.5 sm:px-2.5 py-1 rounded-full select-none uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer h-6 sm:h-auto"
                      title="Play All"
                    >
                      <Play className="w-2.5 h-2.5 fill-black shrink-0" />
                      <span className="hidden xs:inline">Play All</span>
                    </button>
                    <div className="flex bg-white/[0.02] border border-white/5 rounded-md overflow-hidden shrink-0">
                      <button 
                        onClick={() => setCommunityViewMode("grid")}
                        className={`p-1 sm:p-1.5 transition-colors ${communityViewMode === "grid" ? "bg-amber-400/20 text-amber-400" : "text-white/30 hover:text-white/70"}`}
                        title="Grid View"
                      >
                        <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCommunityViewMode("list")}
                        className={`p-1 sm:p-1.5 transition-colors ${communityViewMode === "list" ? "bg-amber-400/20 text-amber-400" : "text-white/30 hover:text-white/70"}`}
                        title="List View"
                      >
                        <List className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                    <div className="text-[9px] font-extrabold text-amber-400/80 bg-amber-400/5 border border-amber-400/10 px-1.5 sm:px-2 py-1 rounded-full select-none uppercase tracking-wider shrink-0 flex items-center justify-center h-6 sm:h-auto min-w-[20px]">
                      {communityTracks.length}<span className="hidden xs:inline">&nbsp;Shared</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid of Shared Tracks (Is Icon-Only Catalog) */}
              {communityTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl text-center px-4">
                  <Music className="w-6 h-6 text-white/20 mb-2" />
                  <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Lounge stands empty</p>
                  <p className="text-[10px] text-white/30 max-w-[240px] mt-1 leading-normal">
                    Go to the Albums tab and click the Share icon next to any of your fetched songs to publish them here!
                  </p>
                </div>
              ) : (
                <div className={`${communityViewMode === "grid" ? "grid grid-cols-3 sm:grid-cols-4" : "flex flex-col"} gap-3.5 overflow-y-auto max-h-[380px] pr-1 pb-4 scrollbar-thin scrollbar-thumb-white/10 Content-start`}>
                  {communityTracks.map((track) => {
                    const isActive = currentSong?.originalUrl === track.originalUrl;
                    
                    if (communityViewMode === "list") {
                      return (
                        <div
                          key={track.id}
                          onClick={() => playCommunityTrack(track)}
                          className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all duration-300 ${
                            isActive 
                              ? "bg-amber-400/5 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                              : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/15"
                          }`}
                          title={`${track.title} — ${track.author || "Unknown Artist"}`}
                        >
                          {/* Album Cover */}
                          <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
                            <FallbackImage 
                              src={track.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100"} 
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                            <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}>
                              {isActive && isPlaying ? (
                                <AudioLines className="w-4 h-4 text-amber-400 animate-pulse" />
                              ) : (
                                <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                              )}
                            </div>
                          </div>

                          {/* Song Details */}
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className={`text-xs font-bold leading-tight truncate ${isActive ? "text-amber-400" : "text-white"}`}>
                              {track.title}
                            </h4>
                            <p className="text-[10px] text-white/50 truncate font-semibold mt-0.5">
                              {track.author || "Unknown Artist"}
                            </p>
                            <p className="text-[9px] text-[#E0E2E8]/40 font-bold uppercase tracking-widest mt-1 truncate">
                              Shared by {track.sharedBy}
                            </p>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeCommunityTrack(track.id, e);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-colors active:scale-95 text-white/40"
                              title="Like Track"
                            >
                              <Heart className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[10px] font-bold">{track.likes || 0}</span>
                            </button>

                            {isAdmin && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await deleteDoc(doc(db, "shared_tracks", track.id));
                                  } catch (error) {
                                    console.error("Failed to delete track:", error);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors active:scale-95"
                                title="Delete track"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={track.id}
                        onClick={() => playCommunityTrack(track)}
                        className={`group relative aspect-square rounded-[18px] overflow-hidden cursor-pointer border transition-all duration-300 ${
                          isActive 
                            ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]" 
                            : "border-white/5 hover:border-white/20 hover:scale-102"
                        }`}
                        title={`${track.title} — ${track.author || "Unknown Artist"}`}
                      >
                        {/* Album Cover */}
                        <FallbackImage 
                          src={track.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100"} 
                          alt={track.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Hover details overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-2 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-[10px] font-bold text-amber-300 truncate leading-tight">{track.title}</p>
                          <p className="text-[9px] text-white/50 truncate font-semibold mt-0.5">{track.author || "Unknown Artist"}</p>
                          <p className="text-[8px] text-[#E0E2E8]/40 font-bold uppercase tracking-widest mt-1 truncate">By {track.sharedBy}</p>
                        </div>

                        {/* Active stream indicator / play button */}
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center border border-white/10 ${
                          isActive ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        }`}>
                          {isActive && isPlaying ? (
                            <AudioLines className="w-3 h-3 text-amber-400 animate-pulse" />
                          ) : (
                            <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400 ml-0.5" />
                          )}
                        </div>

                        {/* Mini likes badge */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeCommunityTrack(track.id, e);
                          }}
                          className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 border border-white/5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                        >
                          <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                          <span className="text-[8px] font-bold text-white/80">{track.likes || 0}</span>
                        </div>

                        {/* Admin Delete Action */}
                        {isAdmin && (
                          <div
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await deleteDoc(doc(db, "shared_tracks", track.id));
                              } catch (error) {
                                console.error("Failed to delete track:", error);
                              }
                            }}
                            className="absolute top-2 left-2 px-1.5 py-1.5 rounded-md bg-red-500/80 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 shadow-lg"
                            title="Delete track"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Help Guide & PWA installation */}
          {playlistTab === "guide" && (
            <div className={`flex flex-col gap-5 text-white/90 pb-8 flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin scrollbar-thumb-white/10`}>
              
              {/* Introduction Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 sm:p-6 relative backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/10 to-transparent blur-xl pointer-events-none" />
                <h3 className="text-xs font-black tracking-widest text-amber-400 uppercase mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  About [FC PLAYER v 1.2]
                </h3>
                <p className="text-[11px] sm:text-xs leading-relaxed text-white/70">
                  Welcome to the ultimate high-fidelity streaming companion! <strong>FC PLAYER</strong> extracts audio tracks directly from public TikTok creators, FB, NCT, hashtag videos, or direct URL links to stream them back-to-back in real time.
                </p>
                <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-white/5">
                  <div className="bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                    <div className="text-[10px] font-black text-amber-300">HD UPSCALING</div>
                    <div className="text-[9px] text-white/50 mt-1 leading-normal">16-band EQ, premium sound profiles, and true bass weights.</div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                    <div className="text-[10px] font-black text-emerald-400">CACHED ALBUMS</div>
                    <div className="text-[9px] text-white/50 mt-1 leading-normal">Your play history is auto-saved for offline-capable loads.</div>
                  </div>
                </div>
              </div>

              {/* Install guide */}
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 sm:p-6 relative backdrop-blur-sm">
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/5 to-transparent blur-xl pointer-events-none" />
                <h3 className="text-xs font-black tracking-widest text-[#E0E2E8] uppercase mb-3 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  Install App on Mobile
                </h3>
                <p className="text-[11px] sm:text-xs leading-relaxed text-white/70 mb-4">
                  Save our app directly on your smart device to unlock native <strong>fullscreen standalone display</strong>, isolated memory pools, and highly reliable background playback.
                </p>

                {/* Steps Accordion / Grid */}
                <div className="flex flex-col gap-3">
                  {/* iOS Safari */}
                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-850 text-white flex items-center justify-center font-bold text-[9px] border border-white/10">iOS</span>
                      <span className="text-[10px] font-bold text-amber-300">Apple Safari browser</span>
                    </div>
                    <ol className="text-[10px] text-white/60 space-y-2 pl-1">
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold shrink-0">1.</span>
                        <span>Tap the <span className="inline-flex bg-white/10 text-white rounded p-1 mx-0.5 text-[8px] font-bold"><Share2 className="w-2.5 h-2.5 inline" /></span> <strong>Share</strong> icon on bottom Safari toolbar.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold shrink-0">2.</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong> option.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold shrink-0">3.</span>
                        <span>Confirm the icon is shown and the name is set to <strong>"FC PLAYER"</strong>, then tap <strong>"Add"</strong>.</span>
                      </li>
                    </ol>
                  </div>

                  {/* Android Chrome */}
                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-850 text-white flex items-center justify-center font-bold text-[9px] border border-white/10">G</span>
                      <span className="text-[10px] font-bold text-emerald-400">Google Chrome / Android</span>
                    </div>
                    <ol className="text-[10px] text-white/60 space-y-2 pl-1">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold shrink-0">1.</span>
                        <span>Tap the <strong>three vertical dots</strong> (Menu) in top-right Chrome corner.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold shrink-0">2.</span>
                        <span>Select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold shrink-0">3.</span>
                        <span>Confirm and approve the system installation prompt immediately.</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Supported Platforms Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 sm:p-6 relative backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-400/5 to-transparent blur-xl pointer-events-none" />
                <h3 className="text-xs font-black tracking-widest text-amber-400 uppercase mb-3 flex items-center gap-1.5">
                  <ListMusic className="w-3.5 h-3.5 text-amber-400" />
                  Compatible Platforms
                </h3>
                <p className="text-[11px] sm:text-xs leading-relaxed text-white/70 mb-4">
                  Powered by a comprehensive, updated <strong className="text-amber-300">yt-dlp</strong> core, Acoustic Presence is fully compatible with thousands of platforms. Simply paste any sharing URL to instantly stream the audio:
                </p>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">YouTube & Music</div>
                      <div className="text-[9px] text-[#2cc0ff]">Full Playback & HD</div>
                    </div>
                    <span className="text-[8px] bg-red-500/15 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded font-black">YT</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">TikTok</div>
                      <div className="text-[9px] text-white/50">Direct & User Profiles</div>
                    </div>
                    <span className="text-[8px] bg-white/10 border border-white/20 text-white px-1.5 py-0.5 rounded font-black">TT</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">SoundCloud</div>
                      <div className="text-[9px] text-white/50">Tracks & Sets</div>
                    </div>
                    <span className="text-[8px] bg-orange-500/15 border border-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded font-black">SC</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">NhacCuaTui (NCT)</div>
                      <div className="text-[9px] text-[#2cc0ff]">Playlists & Direct HTML</div>
                    </div>
                    <span className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded font-black">NCT</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">Bandcamp</div>
                      <div className="text-[9px] text-white/50">Releases & Artists</div>
                    </div>
                    <span className="text-[8px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 px-1.5 py-0.5 rounded font-black">BC</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">Twitch</div>
                      <div className="text-[9px] text-white/50">VODs, clips & highlights</div>
                    </div>
                    <span className="text-[8px] bg-purple-500/15 border border-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded font-black">TW</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">Vimeo & Streamable</div>
                      <div className="text-[9px] text-white/50">HD video streams</div>
                    </div>
                    <span className="text-[8px] bg-teal-500/15 border border-teal-500/30 text-teal-400 px-1.5 py-0.5 rounded font-black">VM</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white">Social Media</div>
                      <div className="text-[9px] text-white/50">FB, X, Reddit, IG, Tumblr</div>
                    </div>
                    <span className="text-[8px] bg-pink-500/15 border border-pink-500/30 text-pink-400 px-1.5 py-0.5 rounded font-black">SOC</span>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-white/40">
                  <span>And 1,000+ others like Mixcloud, Hearthis.at, Rumble...</span>
                  <a href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5 font-bold">
                    Full Official List <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* iOS Background Play tip */}
              <div className="bg-amber-400/5 border border-amber-400/10 rounded-2xl p-4 text-[10px] sm:text-[11px] leading-relaxed relative select-none">
                <div className="font-extrabold uppercase tracking-widest text-[9px] text-amber-400 mb-1 flex items-center gap-1.5">
                  <span className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> PRO-TIP FOR CONTINUOUS BACKGROUND PLAYBACK</span>
                </div>
                <p className="opacity-80">
                  Toggle on <strong>"BG PLAY"</strong> (or <strong>"iOS BG Mode"</strong> in EQ panels) to prevent Apple iOS from pausing media when your screen lock automatically engages.
                </p>
              </div>

            </div>
          )}

        </div>

        </div> {/* End of Column 1 (Left Column) */}

        {/* Column 2 (Right Column) - Stem Studio */}
        {showStemmix && (
          <div className={`flex flex-col ${
            !isCompact 
              ? "lg:col-span-2 h-[80vh] lg:h-full shrink-0 lg:shrink" 
              : "w-full mt-4 h-[50dvh] shrink-0 lg:col-span-2 lg:h-full lg:mt-0 lg:shrink"
          } bg-[#0A0B10]/40 backdrop-blur-[40px] rounded-[24px] border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative transition-all duration-500 animate-in slide-in-from-right-4 fade-in z-50 overflow-hidden`}>
            <StemStudio 
               originalAudioUrl={stemSongInfo?.url || currentSong?.url || audioUrl}
               stemUrls={stemUrls} 
               songTitle={stemSongInfo?.title || currentSong?.title || "Untitled Track"}
               coverUrl={stemSongInfo?.cover || currentSong?.cover}
               originalDuration={stemSongInfo?.duration || duration || 0}
               onClose={() => setShowStemmix(false)}
               isEmbedded={true}
               isCompactUI={isCompact}
               stemmixStatus={stemmixStatus}
               progress={stemmixProgress}
               stemmixError={stemmixError}
               onRetrySeparate={() => handleSeparateStems()}
               separationMode={separationMode}
               onStemLoadError={(stem, err) => { setStemmixError(`Failed to load stem ${stem}: ${err}`); setStemmixStatus("error"); }}
               onSetSeparationMode={(mode) => {
                 setSeparationMode(mode);
                 handleSeparateStems(mode);
               }}
               newSongTitle={
                 audioUrl && audioUrl !== stemSongInfo?.audioUrl && stemmixStatus !== "loading"
                   ? currentSong?.title || "Untitled Track" 
                   : null
               }
               onExtractNewSong={() => handleSeparateStems()}
            />
          </div>
        )}

      </div> {/* End Main Single Page Layout Container */}

      {/* YouTube Cookies Bot Bypass Configuration Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" id="youtube_cookie_modal">
            <div className="relative w-full max-w-lg bg-[#0E1015]/95 border border-white/10 rounded-[24px] overflow-y-auto p-6 shadow-2xl shadow-black/80 flex flex-col gap-4 max-h-[95vh] sm:max-h-[90vh] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Settings className="w-4 h-4 animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-widest text-white uppercase">System Settings</h2>
                    <p className="text-[10px] text-white/40">Manage global audio sources, bypass cookies, and app defaults</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    setSaveCookiesMessage("");
                    setSaveCookiesError("");
                  }}
                  className="w-7 h-7 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center text-xs transition-all"
                  id="close_cookie_modal_btn"
                >
                  ✕
                </button>
              </div>

              
              {/* WebGPU Settings */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5" />
                    WebGPU Separation Quality
                  </h3>
                  <span className="text-[8px] bg-purple-500/15 border border-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded font-black font-mono">LOCAL SETTING</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                  Adjust the FIR filter resolution (taps) for local stem separation. Higher values yield better isolation but take longer to process.
                </p>
                <div className="flex gap-2 items-center">
                  <select
                    value={webgpuQuality}
                    onChange={(e) => {
                      const val = e.target.value as 'fast' | 'high' | 'ultra' | 'pro';
                      setWebgpuQuality(val);
                      localStorage.setItem("stemmix_webgpu_quality", val);
                    }}
                    className="flex-1 bg-black/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/15"
                  >
                    <option value="fast">Fast (255 taps) - Low Quality</option>
                    <option value="high">High (1023 taps) - Good Quality</option>
                    <option value="ultra">Ultra (4095 taps) - Professional</option>
                    <option value="pro">Max Pro (8191 taps) - Audiophile</option>
                  </select>
                </div>
              </div>

              {/* Section A: App Default Playlist (NhacCuaTui) */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" />
                    De-facto App Playlist
                  </h3>
                  <span className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded font-black font-mono">FILE PERSISTED</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                  Instantly load a NhacCuaTui playlist link as the default homepage song list on restart. The server will fetch and persist these songs in a physical configuration file.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste NhacCuaTui playlist link (nct.vn or nhaccuatui.com)..."
                    value={defaultPlaylistInput}
                    onChange={(e) => setDefaultPlaylistInput(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/15"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDefaultPlaylistLink}
                    disabled={isSavingDefaultPlaylist || !defaultPlaylistInput.trim()}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                  >
                    {isSavingDefaultPlaylist ? "Saving..." : "Apply"}
                  </button>
                </div>
                {saveDefaultMsg && (
                  <div className="text-[10px] font-semibold text-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-3 animate-in slide-in-from-top-1 duration-150">
                    ✓ {saveDefaultMsg}
                  </div>
                )}
                {saveDefaultErr && (
                  <div className="text-[10px] font-semibold text-center text-rose-400 bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3 animate-in slide-in-from-top-1 duration-150 font-sans">
                    ✕ {saveDefaultErr}
                  </div>
                )}
              </div>

              {/* Status Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <h3 className="text-[10px] font-black tracking-wider text-white/50 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Current Status
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cookiesStatus.loaded ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-[11px] font-bold text-white">
                      {cookiesStatus.loaded ? "Cookies Loaded & Active" : "No Active Cookies (Using Default Agent)"}
                    </span>
                  </div>
                  {cookiesStatus.loaded && (
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {cookiesStatus.length} lines parsed
                    </span>
                  )}
                </div>

                {cookiesStatus.loaded && cookiesStatus.preview && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[9px] font-bold text-white/30 uppercase">Preview:</span>
                    <pre className="text-[10px] font-mono bg-black/45 border border-white/5 rounded-lg p-2 text-emerald-400/80 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                      {cookiesStatus.preview}
                    </pre>
                  </div>
                )}
              </div>

              {/* Form Input */}
              <form onSubmit={handleSaveCookies} className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5" htmlFor="cookies_textarea">
                      <Key className="w-3.5 h-3.5" />
                      Paste exported cookies
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteCookies}
                      className="flex items-center gap-1 px-2 py-0.5 bg-amber-400/10 hover:bg-amber-400/20 active:scale-95 text-amber-400 font-extrabold text-[9px] uppercase tracking-wider rounded-lg border border-amber-400/20 transition-all select-none cursor-pointer"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-3 h-3" />
                      Paste
                    </button>
                  </div>
                  <a
                    href="https://github.com/yt-dlp/yt-dlp#how-do-i-pass-cookies-to-yt-dlp"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9px] text-[#2cc0ff] hover:underline flex items-center gap-1"
                  >
                    How to get Cookies? <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex-1 min-h-[120px] relative">
                  <textarea
                    id="cookies_textarea"
                    placeholder="Paste Netscape (cookies.txt) or raw JSON cookies array here... &#13;&#10;Examples: &#13;&#10;[ { &quot;domain&quot;: &quot;.youtube.com&quot;, &quot;name&quot;: &quot;SID&quot;, ... } ] &#13;&#10;Or raw space-separated or Cookie header: &#13;&#10;SID=xyz; HSID=abc; ..."
                    value={cookiesInputText}
                    onChange={(e) => setCookiesInputText(e.target.value)}
                    className="w-full h-full bg-black/50 border border-white/5 rounded-2xl p-3 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/15 resize-none leading-relaxed"
                  />
                </div>

                {/* Info / Tips */}
                <div className="text-[10px] text-white/50 leading-relaxed bg-black/20 rounded-xl p-3 border border-white/5 select-none flex flex-col gap-2">
                  <p>
                    <strong className="text-white flex items-center gap-1"><Rocket className="w-3.5 h-3.5 inline" /> Instruction:</strong> Install the{" "}
                    <a href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-0.5 font-bold">
                      "Get cookies Editor" <ExternalLink className="w-2.5 h-2.5" />
                    </a>{" "}
                    extension, sign in to YouTube, export cookies in <strong>Netscape</strong> or <strong>JSON</strong> format, and paste the output here. This completely bypasses bot-detection walls.
                  </p>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/90 rounded-lg p-2.5 flex items-start gap-1.5 leading-tight">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
                    <p>
                      <strong>Privacy Notice:</strong> We do <strong>not</strong> save your data to our server. Your cookies are <strong>only saved in localStorage</strong> on your local device.
                    </p>
                  </div>
                </div>

                {/* Notifications */}
                {saveCookiesMessage && (
                  <div className="text-[11px] font-bold text-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-3 animate-in fade-in duration-200" id="cookie_success_msg">
                    ✓ {saveCookiesMessage}
                  </div>
                )}
                {saveCookiesError && (
                  <div className="text-[11px] font-bold text-center text-rose-400 bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3 animate-in fade-in duration-200" id="cookie_error_msg">
                    ✕ {saveCookiesError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCookiesInputText("");
                      handleSaveCookies(undefined, "");
                    }}
                    disabled={isSavingCookies}
                    className="flex-1 px-4 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 disabled:opacity-40 text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl transition-all"
                    id="clear_cookies_btn"
                  >
                    Clear Cookies
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCookies}
                    className="flex-[2] px-5 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-400/15 transition-all"
                    id="save_cookies_btn"
                  >
                    {isSavingCookies ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Save & Apply Cookies</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

         <audio
          key={bgPlayBypass ? "audio-bypass" : "audio-processed"}
          ref={audioRef}
          src={audioUrl || undefined}
          autoPlay
          playsInline
          muted={!!(showVideoIframe && currentSong && getYouTubeEmbedUrl(currentSong.originalUrl))}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            const err = (e.target as HTMLAudioElement).error;
            if (err) {
              console.warn("Audio element error event:", err.code, err.message);
              // Ignore MEDIA_ERR_ABORTED (code 1) or when audio is intentionally cleared
              if (err.code === 1 || !audioUrl) {
                return;
              }
              setTiktokError(`Failed to play audio source. The track might be age-restricted, unavailable, or unsupported.`);
              setIsPlaying(false);
              setDuration(0);
              setAudioUrl("");
              // Optional: remove bad track from list
              if (currentSong) {
                setRecentSongs(prev => prev.filter(s => s.id !== currentSong.id));
                setTimeout(() => handleNextSong(), 500);
              }
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            handleEnded();
            if (repeatMode === "one" && audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
            } else if (repeatMode === "all" && currentSong && recentSongs.length > 1) {
              handleNextSong();
            } else if (repeatMode === "off") {
              setIsPlaying(false);
            }
          }}
          onLoadedMetadata={handleLoadedMetadata}
          crossOrigin="anonymous"
          className="hidden"
        />
        
      </div>
  );
}

