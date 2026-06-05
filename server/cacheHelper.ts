import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface CacheItem<T> {
  timestamp: number;
  data: T;
}

export function getCacheKey(prefix: string, key: string): string {
  // sanitize key for valid filename
  const safeKey = Buffer.from(key).toString('base64').replace(/[/+=]/g, '_');
  return path.join(CACHE_DIR, `${prefix}_${safeKey}.json`);
}

export async function getCachedData<T>(prefix: string, key: string): Promise<T | null> {
  const cachePath = getCacheKey(prefix, key);
  try {
    if (fs.existsSync(cachePath)) {
      const p = await fs.promises.readFile(cachePath, 'utf-8');
      const item: CacheItem<T> = JSON.parse(p);
      
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - item.timestamp > THREE_DAYS_MS) {
        // Expired
        return null;
      }
      return item.data;
    }
  } catch (error) {
    console.warn(`[Cache] Error reading cache for ${prefix}:${key}`, error);
  }
  return null;
}

export async function setCachedData<T>(prefix: string, key: string, data: T): Promise<void> {
  const cachePath = getCacheKey(prefix, key);
  try {
    const item: CacheItem<T> = {
      timestamp: Date.now(),
      data
    };
    await fs.promises.writeFile(cachePath, JSON.stringify(item), 'utf-8');
  } catch (error) {
    console.warn(`[Cache] Error writing cache for ${prefix}:${key}`, error);
  }
}

export async function invalidateCache(prefix: string, key: string): Promise<void> {
  const cachePath = getCacheKey(prefix, key);
  try {
    if (fs.existsSync(cachePath)) {
      await fs.promises.unlink(cachePath);
    }
  } catch (error) {
    console.warn(`[Cache] Error invalidating cache for ${prefix}:${key}`, error);
  }
}
