const fs = require('fs');
const file = 'src/components/StemStudio.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import { AudioEnhancer }')) {
  code = code.replace(
    'import PixabayStudio from "./PixabayStudio";',
    'import PixabayStudio from "./PixabayStudio";\nimport { AudioEnhancer } from "./AudioEnhancer";'
  );
}

if (!code.includes('const [showAudioEnhancer, setShowAudioEnhancer]')) {
  code = code.replace(
    'const [showPixabayStudio, setShowPixabayStudio] = useState<boolean>(false);',
    'const [showPixabayStudio, setShowPixabayStudio] = useState<boolean>(false);\n  const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);'
  );
}

const divToAdd = `
             {expandedSections.mixer && (
                <div className="w-full mt-2">
                   <div 
                      className="w-full bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group"
                      onClick={() => setShowAudioEnhancer(true)}
                   >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                           <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide">Audio Enhancer</h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Pro Mastering Plugin</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                   </div>
                </div>
             )}
`;

if (!code.includes('onClick={() => setShowAudioEnhancer(true)}')) {
  code = code.replace(
    '                    <PixabayStudio ref={pixabayStudioRef} masterDuration={duration} \n                        isPlaying={isPlaying} \n                        primaryAudioRef={audioElementsRef} \n                        primaryStem={stemsList.includes(\'vocals\') ? \'vocals\' : stemsList[0]}\n                   />\n                </div>\n             )}',
    '                    <PixabayStudio ref={pixabayStudioRef} masterDuration={duration} \n                        isPlaying={isPlaying} \n                        primaryAudioRef={audioElementsRef} \n                        primaryStem={stemsList.includes(\'vocals\') ? \'vocals\' : stemsList[0]}\n                   />\n                </div>\n             )}' + divToAdd
  );
}

if (!code.includes('<AudioEnhancer onClose={() => setShowAudioEnhancer(false)} />')) {
  code = code.replace(
    '{showSpectrogram && (',
    '{showAudioEnhancer && <AudioEnhancer onClose={() => setShowAudioEnhancer(false)} />}\n\n       {showSpectrogram && ('
  );
}

fs.writeFileSync(file, code);
console.log("StemStudio patched");
