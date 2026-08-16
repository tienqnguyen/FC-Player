const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" onError={() => setError(true)} title={title} />;
};`;

const replacement = targetStr + `\n\nconst CreatorAvatar = ({ alb }: { alb: any }) => {
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

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched CreatorAvatar definition");
