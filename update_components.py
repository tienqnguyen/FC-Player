import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

# Let's replace the Knob component
knob_new = """  const Knob = ({ label, value, onChange, min = 0, max = 100, unit = '' }: any) => {
    const rotation = ((value - min) / (max - min)) * 270 - 135;
    
    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startValue = value;
      
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY;
        // 1 pixel = 1 unit for example, or scaled
        const range = max - min;
        const speed = range / 100; // 100px drag for full range
        let newVal = startValue + deltaY * speed;
        newVal = Math.max(min, Math.min(max, newVal));
        if (onChange) onChange(Math.round(newVal));
      };
      
      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    return (
      <div className="flex flex-col items-center gap-1.5 select-none touch-none">
        <div 
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2a30] to-[#121215] shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.1)] border border-white/5 flex items-center justify-center group cursor-pointer"
          onPointerDown={handlePointerDown}
        >
          <div 
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#3a3a40] to-[#1a1a20] shadow-inner"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="w-1.5 h-3 bg-indigo-400 absolute top-1 left-1/2 -translate-x-1/2 rounded-full shadow-[0_0_5px_rgba(99,102,241,0.5)]"></div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{label}</div>
          <div className="text-[10px] text-white/80 font-mono">{value}{unit}</div>
        </div>
      </div>
    );
  };"""

# Let's replace the VerticalSlider component
slider_new = """  const VerticalSlider = ({ label, value, onChange, min = -100, max = 100 }: any) => {
    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startValue = value;
      
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const range = max - min;
        const speed = range / 100; // 100px drag for full range
        let newVal = startValue + deltaY * speed;
        newVal = Math.max(min, Math.min(max, newVal));
        if (onChange) onChange(Math.round(newVal));
      };
      
      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    return (
      <div className="flex flex-col items-center gap-2 select-none touch-none">
        <div 
          className="relative h-32 w-8 flex justify-center group cursor-pointer"
          onPointerDown={handlePointerDown}
        >
          <div className="absolute top-0 bottom-0 w-1 bg-black/60 rounded-full overflow-hidden border border-white/5 pointer-events-none">
             <div className="absolute bottom-0 w-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ height: `${((value - min) / (max - min)) * 100}%` }}></div>
          </div>
          <div 
             className="absolute w-6 h-3 bg-gradient-to-b from-white to-gray-400 rounded-sm shadow-md cursor-pointer border border-black/20 pointer-events-none"
             style={{ bottom: `calc(${((value - min) / (max - min)) * 100}% - 6px)` }}
          ></div>
        </div>
        <div className="text-[9px] text-white/50 font-bold tracking-wider">{label}</div>
      </div>
    );
  };"""

# We'll use regex to replace them
import re
content = re.sub(r'const Knob = \(.*?\{.*?return \(.*?\);\n  };', knob_new, content, flags=re.DOTALL)
content = re.sub(r'const VerticalSlider = \(.*?\{.*?return \(.*?\);\n  };', slider_new, content, flags=re.DOTALL)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Updated Knob and VerticalSlider")
