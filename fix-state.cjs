const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const stateStr = `  const [expandedSections, setExpandedSections] = useState({
    mixer: true,
    transcript: true,
    masterFx: true,
    masterEq: true,
    aiCloud: true
  });
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };`;

const insertIndex = content.indexOf('const [isTranscribing, setIsTranscribing]');
content = content.slice(0, insertIndex) + stateStr + '\n' + content.slice(insertIndex);
fs.writeFileSync('src/components/StemStudio.tsx', content);
