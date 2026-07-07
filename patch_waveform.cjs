const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/function StemWaveform\(\{[^\}]+\}\) \{([\s\S]*?)return <div ref=\{containerRef\} className="w-full h-full opacity-60 hover:opacity-100 transition-opacity absolute inset-0 mix-blend-screen" \/>;\n\}/m, `function StemWaveform({ url, color, audioElement }: { url: string, color: string, audioElement: HTMLMediaElement | null }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        if (!containerRef.current || !url || !audioElement) return;
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
}`);

code = code.replace(/<StemWaveform url=\{\(stemUrls as any\)\[stem\]\} color=\{STEM_COLORS\[stem\] \|\| '#fbbf24'\} audioRef=\{\{ current: audioElementsRef\.current\[stem\] \}\} \/>/g, `<StemWaveform url={(stemUrls as any)[stem]} color={STEM_COLORS[stem] || '#fbbf24'} audioElement={audioElementsRef.current[stem]} />`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
