import fs from "node:fs/promises";
import path from "node:path";

const COOKIES_FILE_PATH = path.resolve(process.cwd(), "youtube-cookies.txt");

export function convertToNetscapeCookies(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return "";

  // Standard Netscape HTTP Cookie File header
  let output = "# Netscape HTTP Cookie File\n# This is a generated file to bypass bot restrictions\n\n";

  if (trimmed.startsWith("# Netscape HTTP Cookie File")) {
    return trimmed;
  }

  // Check if JSON format
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        let count = 0;
        for (const item of parsed) {
          const domain = item.domain || ".youtube.com";
          const flag = domain.startsWith(".") ? "TRUE" : "FALSE";
          const itemPath = item.path || "/";
          const secure = item.secure ? "TRUE" : "FALSE";
          const expiration = Math.round(item.expirationDate || item.expiry || item.expires || (Date.now() / 1000 + 365 * 24 * 60 * 60));
          const name = item.name || "";
          const value = item.value || "";
          if (name && value) {
            output += `${domain}\t${flag}\t${itemPath}\t${secure}\t${expiration}\t${name}\t${value}\n`;
            count++;
          }
        }
        if (count > 0) {
          return output;
        }
      }
    } catch (e: any) {
      console.warn("[Youtube Cookie Helper] Could not parse pasted cookies as JSON, trying key-value:", e.message);
    }
  }

  // Try raw string parsing (Cookie header or key-value format)
  let cookieHeader = trimmed;
  if (/^cookie\s*:/i.test(cookieHeader)) {
    cookieHeader = cookieHeader.replace(/^cookie\s*:\s*/i, "");
  }

  const pairs = cookieHeader.split(";");
  let foundPairs = false;
  for (const pair of pairs) {
    const parts = pair.split("=");
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join("=").trim();
      if (name && value) {
        foundPairs = true;
        const domain = ".youtube.com";
        const flag = "TRUE";
        const itemPath = "/";
        const secure = "TRUE";
        const expiration = Math.round(Date.now() / 1000 + 365 * 24 * 60 * 60);
        output += `${domain}\t${flag}\t${itemPath}\t${secure}\t${expiration}\t${name}\t${value}\n`;
      }
    }
  }

  if (foundPairs) {
    return output;
  }

  return rawInput;
}

export async function saveYoutubeCookies(rawInput: string): Promise<boolean> {
  const converted = convertToNetscapeCookies(rawInput);
  if (!converted) {
    // If empty input, delete the existing cookies file
    try {
      await fs.unlink(COOKIES_FILE_PATH);
    } catch {}
    return false;
  }

  await fs.writeFile(COOKIES_FILE_PATH, converted, "utf-8");
  return true;
}

export async function getYoutubeCookiesStatus(): Promise<{ loaded: boolean; length: number; preview: string }> {
  try {
    const data = await fs.readFile(COOKIES_FILE_PATH, "utf-8");
    const lines = data.split("\n").filter(l => l.trim() && !l.startsWith("#"));
    
    // Mask some sensitive values for security preview
    const previewLength = Math.min(data.length, 120);
    const rawPreview = data.substring(0, previewLength);
    const maskedPreview = rawPreview.replace(/[a-zA-Z0-9]{8,}/g, (match) => {
      return match.substring(0, 3) + "***" + match.substring(match.length - 3);
    });

    return {
      loaded: true,
      length: lines.length,
      preview: maskedPreview + (data.length > previewLength ? "..." : "")
    };
  } catch {
    return {
      loaded: false,
      length: 0,
      preview: ""
    };
  }
}

export async function deleteYoutubeCookies(): Promise<void> {
  try {
    await fs.unlink(COOKIES_FILE_PATH);
  } catch {}
}

export async function hasYoutubeCookies(): Promise<boolean> {
  try {
    await fs.access(COOKIES_FILE_PATH);
    return true;
  } catch {
    return false;
  }
}

export function getCookiesFilePath(): string {
  return COOKIES_FILE_PATH;
}
