import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

# Add analyser node to nodesRef
setup_analyser = """    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;"""

content = content.replace("    const drive = audioCtx.createWaveShaper();", setup_analyser + "\n    const drive = audioCtx.createWaveShaper();")

# Add analyser to nodesRef dict
content = content.replace("nodesRef.current = {\n      drive, warm, comp,", "nodesRef.current = {\n      drive, warm, comp, analyser,")
content = content.replace("inputNode.disconnect();", "inputNode.disconnect();\n        analyser.disconnect();")

# Route through analyser
# The last line of the active chain routing is `currentNode.connect(outputNode);`
content = content.replace("currentNode.connect(outputNode);", "currentNode.connect(n.analyser);\n    n.analyser.connect(outputNode);")

# Add requestAnimationFrame for drawing the canvas
# Where we have the visualizer dummy:
old_visualizer = """               {/* EQ Visualizer Dummy */}
               <div className="w-full h-16 bg-black/40 rounded border border-white/5 mb-4 relative overflow-hidden">
                  <svg viewBox="0 0 100 40" className="w-full h-full text-indigo-400 opacity-60" preserveAspectRatio="none">
                    <path d="M0,20 Q10,10 20,25 T40,15 T60,20 T80,5 T100,10 L100,40 L0,40 Z" fill="currentColor" opacity="0.2"/>
                    <path d="M0,20 Q10,10 20,25 T40,15 T60,20 T80,5 T100,10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <div className="absolute bottom-1 w-full flex justify-between px-1 text-[7px] text-white/30 font-mono">
                    <span>125</span><span>1k</span><span>5k</span>
                  </div>
               </div>"""

new_visualizer = """               {/* Real-time Spectrum Visualizer */}
               <div className="w-full h-16 bg-black/40 rounded border border-white/5 mb-4 relative overflow-hidden">
                  <canvas ref={canvasRef} className="w-full h-full" width={300} height={64}></canvas>
                  <div className="absolute bottom-1 w-full flex justify-between px-2 text-[7px] text-white/30 font-mono pointer-events-none">
                    <span>125</span><span>1k</span><span>5k</span><span>10k</span>
                  </div>
               </div>"""

content = content.replace(old_visualizer, new_visualizer)

# Add canvasRef
content = content.replace("const [powerMaximize, setPowerMaximize] = useState(true);", "const [powerMaximize, setPowerMaximize] = useState(true);\n  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);\n  const animationRef = React.useRef<number>(0);")

# Add drawing effect
drawing_effect = """  useEffect(() => {
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
      if (!analyser) {
        // Draw resting line
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(width, height);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.8)');

      ctx.beginPath();
      ctx.moveTo(0, height);
      
      // We only care about the first half of the frequencies (up to ~11kHz)
      const visibleBins = Math.floor(bufferLength * 0.5);
      const sliceWidth = width / visibleBins;
      let x = 0;

      for (let i = 0; i < visibleBins; i++) {
        // Apply EQ state conceptually to the visualizer as an overlay, or just show the raw spectrum
        const v = dataArray[i] / 255.0;
        const y = height - (v * height);
        
        ctx.lineTo(x, y);
        x += sliceWidth;
      }
      
      ctx.lineTo(width, height);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke line
      ctx.beginPath();
      ctx.moveTo(0, height);
      x = 0;
      for (let i = 0; i < visibleBins; i++) {
        const v = dataArray[i] / 255.0;
        const y = height - (v * height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isOpen]);"""

idx = content.find("  // Web Audio API DSP Nodes refs")
if idx != -1:
    content = content[:idx] + drawing_effect + "\n\n" + content[idx:]
    with open('src/components/AudioEnhancer.tsx', 'w') as f:
        f.write(content)
    print("Injected real visualizer")
else:
    print("Could not find insertion point")

