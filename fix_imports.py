import re

with open('src/components/SunoLyricDownloader.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace all imports block at the top
new_imports = "import React, { useState } from 'react';\nimport { Download, Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';"
code = re.sub(r"import React from 'react';\s*import {[^}]+} from 'lucide-react';", new_imports, code)

with open('src/components/SunoLyricDownloader.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
