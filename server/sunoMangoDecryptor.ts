import crypto from "crypto";
import { Readable, Transform } from "stream";

export interface MangoLicenseResponse {
  key: string;
  iv: string;
  glt: string;
}

export interface MangoKeys {
  contentKey: Buffer;
  contentIv: Buffer;
}

/**
 * Request encrypted Mango DRM license keys from Suno API
 */
export async function getMangoLicense(songId: string): Promise<MangoLicenseResponse> {
  const rightsUrl = "https://studio-api.prod.suno.com/api/mango/rights";
  const payload = {
    content_params: {
      content_id: songId,
      content_type: "clip"
    }
  };

  const res = await fetch(rightsUrl, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Content-Type": "application/json",
      "Referer": "https://suno.com/",
      "Origin": "https://suno.com"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Suno Mango license request failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data || !data.key || !data.iv || !data.glt) {
    throw new Error("Invalid license response received from Suno Mango API");
  }

  return {
    key: data.key,
    iv: data.iv,
    glt: data.glt
  };
}

/**
 * Unwrap key or IV using AES-256-GCM with SHA256 of GLT as user key
 */
export function unwrapMangoData(wrappedB64: string, glt: string, songId: string): Buffer {
  const userKey = crypto.createHash("sha256").update(glt, "utf-8").digest();
  const aad = Buffer.from(songId, "utf-8");
  const wrapped = Buffer.from(wrappedB64, "base64");

  if (wrapped.length < 28) {
    throw new Error("Wrapped data too short for AES-GCM (nonce + tag)");
  }

  const nonce = wrapped.subarray(0, 12);
  const tag = wrapped.subarray(wrapped.length - 16);
  const ciphertext = wrapped.subarray(12, wrapped.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", userKey, nonce);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Fetches and unwraps content encryption key and initialization vector for a song
 */
export async function getMangoDecryptionKeys(songId: string): Promise<MangoKeys> {
  const license = await getMangoLicense(songId);
  const contentKey = unwrapMangoData(license.key, license.glt, songId);
  const contentIv = unwrapMangoData(license.iv, license.glt, songId);

  return { contentKey, contentIv };
}

/**
 * Creates an AES-128-CTR Decipher transform stream
 */
export function createMangoDecipherTransform(contentKey: Buffer, contentIv: Buffer): Transform {
  const algo = contentKey.length === 16 ? "aes-128-ctr" : "aes-256-ctr";
  return crypto.createDecipheriv(algo, contentKey, contentIv);
}

/**
 * Fetches encrypted M4A from CloudFront and returns a deciphered audio Readable stream
 */
export async function getDecryptedAudioStream(
  songId: string,
  customM4aUrl?: string
): Promise<{ stream: Readable; contentLength?: number }> {
  const m4aUrl = customM4aUrl || `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${songId}.m4a`;
  
  // 1. Get unwrapped keys
  const { contentKey, contentIv } = await getMangoDecryptionKeys(songId);

  // 2. Fetch encrypted stream from CloudFront
  const m4aRes = await fetch(m4aUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Referer": "https://suno.com/",
      "Origin": "https://suno.com"
    }
  });

  if (!m4aRes.ok || !m4aRes.body) {
    throw new Error(`Failed to fetch CloudFront M4A stream (HTTP ${m4aRes.status})`);
  }

  const lengthHeader = m4aRes.headers.get("content-length");
  const contentLength = lengthHeader ? parseInt(lengthHeader, 10) : undefined;

  // 3. Create AES-128-CTR decipher and pipe
  const decipher = createMangoDecipherTransform(contentKey, contentIv);
  const webReadable = Readable.fromWeb(m4aRes.body as any);
  
  const decryptedStream = webReadable.pipe(decipher);
  return { stream: decryptedStream, contentLength };
}

/**
 * Downloads and deciphers complete M4A audio buffer in-memory
 */
export async function getDecryptedAudioBuffer(
  songId: string,
  customM4aUrl?: string
): Promise<Buffer> {
  const { contentKey, contentIv } = await getMangoDecryptionKeys(songId);
  const m4aUrl = customM4aUrl || `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${songId}.m4a`;

  const m4aRes = await fetch(m4aUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "https://suno.com/"
    }
  });

  if (!m4aRes.ok) {
    throw new Error(`Failed to fetch audio stream from CloudFront (${m4aRes.status})`);
  }

  const encryptedBuf = Buffer.from(await m4aRes.arrayBuffer());
  if (encryptedBuf.length < 1000) {
    throw new Error("Downloaded audio data is empty or too small");
  }

  const algo = contentKey.length === 16 ? "aes-128-ctr" : "aes-256-ctr";
  const decipher = crypto.createDecipheriv(algo, contentKey, contentIv);
  return Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
}
