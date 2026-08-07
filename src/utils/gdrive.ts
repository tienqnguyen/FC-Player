export function parseGdriveFolderId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  
  const trimmed = urlOrId.trim();
  
  // If it's just an ID (alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  
  try {
    const url = new URL(trimmed);
    
    // Pattern: /folders/ID
    const foldersMatch = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (foldersMatch) return foldersMatch[1];
    
    // Pattern: id=ID in query params
    const idParam = url.searchParams.get("id");
    if (idParam) return idParam;
    
  } catch (err) {
    // Not a valid URL
  }
  
  return null;
}
