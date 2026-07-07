const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Move the transcriptLines useMemo to inside the component.
// The useMemo block is at the end of the file.
const useMemoMatch = content.match(/  const transcriptLines = useMemo\(\(\) => \{[\s\S]*?\}, \[cohereTranscript, duration\]\);\n/);
if (useMemoMatch) {
  content = content.replace(useMemoMatch[0], ''); // remove from end
  // Insert inside component, right before `useEffect(() => {` or similar.
  const insertIndex = content.indexOf('  useEffect(() => {');
  content = content.slice(0, insertIndex) + useMemoMatch[0] + '\n' + content.slice(insertIndex);
}

// 2. Fix the unbalanced tags.
// Let's look at the area around line 1770 where esbuild reported Unterminated regular expression.
/*
1768|                  ))}
1769|               </div>
1770|            </div>
   |                  ^
1771|  
1772|               )}
*/
// The mixer section was changed to:
/*
             {expandedSections.mixer && (
             <div className="flex flex-col gap-2.5">
...
             )}
          </div>
          {/* SUBTITLES UI * /}
*/
// Let's replace the unbalanced closing tags.
