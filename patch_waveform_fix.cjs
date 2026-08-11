const fs = require('fs');
let content = fs.readFileSync('src/components/TimelineScrubber.tsx', 'utf8');

// Fix jumping waveform by generating random heights statically in a useMemo
const newVisualization = `        <div className="absolute inset-0 flex items-center justify-between px-1 opacity-60">
            {useMemo(() => Array.from({ length: 200 }).map(() => 30 + Math.random() * 70), []).slice(0, Math.max(5, Math.floor(activeDuration * 5))).map((h, i) => (
               <div key={i} className="w-0.5 bg-cyan-400 rounded-full mx-px" style={{ height: \`\${h}%\` }} />
            ))}
        </div>`;

content = content.replace(/        {?\/\* Fake visualization scaled to clip \*\/}?\n        <div className="absolute inset-0 flex items-center justify-between px-1 opacity-60">[\s\S]*?<\/div>/, '{/* Fake visualization scaled to clip */}\n' + newVisualization);

content = content.replace(/import React, \{ useRef, useState, useEffect \} from 'react';/, "import React, { useRef, useState, useEffect, useMemo } from 'react';");

fs.writeFileSync('src/components/TimelineScrubber.tsx', content);
