import fs from "node:fs/promises";
import path from "node:path";

const COOKIES_FILE_PATH = path.resolve(process.cwd(), "youtube-cookies.txt");

function splitCookieLine(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // We want to extract up to 7 Netscape cookie fields:
  // domain, subdomains, path, secure, expiration, name, value.
  const fields: string[] = [];
  let remaining = trimmed;

  for (let i = 0; i < 6; i++) {
    const match = remaining.match(/\s+/);
    if (!match) break;
    const index = match.index!;
    const length = match[0].length;
    
    fields.push(remaining.substring(0, index));
    remaining = remaining.substring(index + length);
  }
  if (remaining) {
    fields.push(remaining);
  }

  if (fields.length >= 6) {
    return fields;
  }
  return null;
}

export function normalizeNetscapeCookieFile(rawInput: string): string {
  const lines = rawInput.split(/\r?\n/);
  const outputLines: string[] = [
    "# Netscape HTTP Cookie File",
    "# This is a system-normalized cookie file to prevent yt-dlp parsing errors",
    ""
  ];

  let hasCookies = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Preserve comments that are not HTTPOnly lines
    if (trimmed.startsWith("#") && !trimmed.startsWith("#HttpOnly_")) {
      if (!trimmed.includes("Netscape HTTP Cookie File")) {
        outputLines.push(trimmed);
      }
      continue;
    }

    const fields = splitCookieLine(trimmed);
    if (fields) {
      if (fields.length === 7) {
        outputLines.push(fields.join("\t"));
        hasCookies = true;
      } else if (fields.length === 6) {
        // Synthesizing missing subdomain column (typically field index 1)
        const domain = fields[0];
        const hasSubdomain = domain.includes(".") && !domain.startsWith("#HttpOnly_") && !domain.startsWith("localhost");
        const flag = hasSubdomain ? "TRUE" : "FALSE";
        const normalized = [
          fields[0], // Domain
          flag,      // Subdomain flag
          fields[1], // Path
          fields[2], // Secure
          fields[3], // Expiration
          fields[4], // Name
          fields[5]  // Value
        ];
        outputLines.push(normalized.join("\t"));
        hasCookies = true;
      }
    }
  }

  return hasCookies ? outputLines.join("\n") + "\n" : "";
}

export function convertToNetscapeCookies(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return "";

  // 1. If it looks like a Netscape file or raw text table (either starts with a header, contains cookies or has spaces/tabs), normalize it
  if (
    trimmed.startsWith("#") ||
    trimmed.includes(".youtube.com") ||
    trimmed.includes("youtube.com\t") ||
    trimmed.includes("youtube.com ")
  ) {
    const normalized = normalizeNetscapeCookieFile(trimmed);
    if (normalized) {
      return normalized;
    }
  }

  let output = "# Netscape HTTP Cookie File\n# This is a generated file to bypass bot restrictions\n\n";
  let generated = false;

  // 2. Check if JSON format
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
          generated = true;
        }
      }
    } catch (e: any) {
      console.warn("[Youtube Cookie Helper] Could not parse pasted cookies as JSON, trying key-value:", e.message);
    }
  }

  // 3. Try raw string parsing (Cookie header or key-value format)
  if (!generated) {
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
      generated = true;
    }
  }

  if (generated) {
    const normalized = normalizeNetscapeCookieFile(output);
    if (normalized) {
      return normalized;
    }
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
