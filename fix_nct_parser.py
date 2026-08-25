import re

with open('server/nctParser.ts', 'r') as f:
    content = f.read()

target = """  const nctUrl = await expandNctUrl(rawUrl);
  // 1. Try DIRECT fetch first (super-fast, avoids proxy overhead if not geoblocked)"""
replacement = """  let nctUrl = await expandNctUrl(rawUrl);
  
  // Fix NCT short links that incorrectly have .html appended, causing 302 redirects to home page
  if (nctUrl.includes("/song/") && nctUrl.endsWith(".html")) {
    nctUrl = nctUrl.replace(".html", "");
  }
  
  // 1. Try DIRECT fetch first (super-fast, avoids proxy overhead if not geoblocked)"""

content = content.replace(target, replacement)

with open('server/nctParser.ts', 'w') as f:
    f.write(content)
