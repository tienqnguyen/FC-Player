const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regexImage = /const FallbackImage = \(\{ src, alt, className, title \}: any\) => \{[\s\S]*?return \([\s\S]*?<\/img>[\s\S]*?\);\n\};/;
const match = content.match(regexImage);
if (match) {
  const replacement = match[0] + `\n\nconst CreatorAvatar = ({ alb }: { alb: any }) => {
  const [error, setError] = useState(false);
  const gradient = getFallbackGradient(alb.username);

  if (alb.avatar && !error) {
    return (
      <img
        src={alb.avatar}
        alt={alb.displayName}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <div className={\`absolute inset-0 w-full h-full bg-gradient-to-br \${gradient} flex items-center justify-center transition-all duration-500 group-hover:scale-110\`}>
      <span className="text-2xl font-black text-white/40 drop-shadow-md">{alb.avatarSub}</span>
    </div>
  );
};`;
  content = content.replace(match[0], replacement);
}

const targetStr = `{alb.avatar ? (
                           <img src={alb.avatar} alt={alb.displayName} className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                         ) : (
                           <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                              <span className="text-2xl font-black text-white/20">{alb.avatarSub}</span>
                           </div>
                         )}`;

content = content.replace(targetStr, `<CreatorAvatar alb={alb} />`);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched CreatorAvatar");
