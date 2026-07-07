const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/export default function StemStudio\(\{\s+stemUrls,\s+songTitle,\s+originalDuration,\s+onClose,\s+isEmbedded,\s+isCompactUI,\s+stemmixStatus \= "ready",\s+stemmixError \= null,\s+onRetrySeparate,\s+separationMode \= "webgpu",\s+onSetSeparationMode\s+\}\: StemStudioProps\) \{/, `export default function StemStudio({ 
  stemUrls, 
  songTitle, 
  originalDuration, 
  onClose, 
  isEmbedded, 
  isCompactUI,
  stemmixStatus = "ready",
  stemmixError = null,
  onRetrySeparate,
  separationMode = "webgpu",
  onSetSeparationMode,
  onStemLoadError
}: StemStudioProps) {`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
