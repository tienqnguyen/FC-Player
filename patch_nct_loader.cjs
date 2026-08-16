const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import { Loader2')) {
   content = content.replace(/import \{([^}]+)\} from "lucide-react";/, 'import { $1, Loader2 } from "lucide-react";');
}

fs.writeFileSync('src/App.tsx', content);
