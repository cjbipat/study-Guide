/**
 * AudioCache — keep generated pronunciation clips so we never ask a provider
 * for the same thing twice.
 *
 * Key: `<lang>:<voice>:<text>:<rate>`  e.g.  `zh-CN:default:吃:normal`
 *
 * Only clips that exist as data (neural TTS blobs) are cached. Browser
 * speechSynthesis produces nothing cacheable — it's regenerated instantly.
 */

import type { SpeakRequest } from "@/lib/language/audio/types";

export function audioCacheKey(req: SpeakRequest): string {
  const voice = req.voiceURI && req.voiceURI.trim() ? req.voiceURI : "default";
  return `${req.lang}:${voice}:${req.text}:${req.rate}`;
}

interface Entry {
  url: string;
  bytes: number;
  at: number;
}

const MAX_ENTRIES = 160;

export class AudioCache {
  private map = new Map<string, Entry>();

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): string | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    e.at = Date.now();
    // refresh LRU position
    this.map.delete(key);
    this.map.set(key, e);
    return e.url;
  }

  set(key: string, url: string, bytes = 0): void {
    if (this.map.has(key)) {
      this.revoke(key);
    }
    this.map.set(key, { url, bytes, at: Date.now() });
    this.evictIfNeeded();
  }

  private revoke(key: string): void {
    const e = this.map.get(key);
    if (e && e.url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(e.url);
      } catch {
        /* ignore */
      }
    }
    this.map.delete(key);
  }

  private evictIfNeeded(): void {
    while (this.map.size > MAX_ENTRIES) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.revoke(oldest);
    }
  }

  clear(): void {
    for (const key of [...this.map.keys()]) this.revoke(key);
  }

  get size(): number {
    return this.map.size;
  }
}

let cache: AudioCache | null = null;

export function getAudioCache(): AudioCache {
  if (!cache) cache = new AudioCache();
  return cache;
}
