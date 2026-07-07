const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/export default function StemStudio\(\{\n   stemUrls,\n   songTitle,\n   originalDuration,\n   onClose,\n   isEmbedded,\n   isCompactUI,\n   stemmixStatus,\n   stemmixError,\n   onRetrySeparate,\n   separationMode,\n   onSetSeparationMode\n\}\: StemStudioProps\) \{/, `export default function StemStudio({
   stemUrls,
   songTitle,
   originalDuration,
   onClose,
   isEmbedded,
   isCompactUI,
   stemmixStatus,
   stemmixError,
   onRetrySeparate,
   separationMode,
   onSetSeparationMode,
   onStemLoadError
}: StemStudioProps) {`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
