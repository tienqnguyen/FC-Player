import audioBufferToWav from "audiobuffer-to-wav";

export async function decodeAudioFromUrl(
  url: string,
  onProgress?: (msg: string) => void
): Promise<AudioBuffer> {
  let arrayBuffer: ArrayBuffer;
  try {
    onProgress?.("Đang tải dữ liệu bài hát từ Suno...");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    arrayBuffer = await res.arrayBuffer();
  } catch (_err) {
    onProgress?.("Đang kết nối qua proxy máy chủ...");
    const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) {
      throw new Error(`Không thể kết nối đến luồng âm thanh (Mã ${proxyRes.status})`);
    }
    arrayBuffer = await proxyRes.arrayBuffer();
  }

  onProgress?.("Đang giải mã tín hiệu âm thanh...");
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  return new Promise<AudioBuffer>((resolve, reject) => {
    audioCtx.decodeAudioData(
      arrayBuffer,
      (buf) => resolve(buf),
      (e) => reject(e || new Error("Giải mã âm thanh thất bại."))
    );
  });
}

export function bufferToWavBlob(buffer: AudioBuffer): Blob {
  const wav = audioBufferToWav(buffer);
  return new Blob([new DataView(wav)], { type: "audio/wav" });
}

export async function bufferToMp3Blob(buffer: AudioBuffer, bitrate = 256): Promise<Blob> {
  let lame = (window as any).lamejs;
  if (!lame) {
    try {
      lame = await import("lamejs");
    } catch (_) {}
  }
  const Mp3Encoder = lame?.Mp3Encoder;
  if (!Mp3Encoder) {
    // If lamejs is not available, safely fall back to standard WAV
    return bufferToWavBlob(buffer);
  }

  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new Mp3Encoder(channels, sampleRate, bitrate);
  const mp3Data: any[] = [];
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;
  const sampleBlockSize = 1152;

  const leftChunk = new Int16Array(sampleBlockSize);
  const rightChunk = new Int16Array(sampleBlockSize);

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const end = Math.min(left.length, i + sampleBlockSize);
    const chunkLength = end - i;

    const lChunk = chunkLength === sampleBlockSize ? leftChunk : new Int16Array(chunkLength);
    const rChunk = chunkLength === sampleBlockSize ? rightChunk : new Int16Array(chunkLength);

    for (let j = 0; j < chunkLength; j++) {
      lChunk[j] = Math.max(-1, Math.min(1, left[i + j])) * 0x7fff;
      if (channels > 1) {
        rChunk[j] = Math.max(-1, Math.min(1, right[i + j])) * 0x7fff;
      }
    }

    const mp3buf = channels === 1 ? mp3encoder.encodeBuffer(lChunk) : mp3encoder.encodeBuffer(lChunk, rChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Int8Array(mp3buf));
  }
  return new Blob(mp3Data, { type: "audio/mp3" });
}

export async function convertClientSide(
  url: string,
  targetFormat: "mp3" | "wav",
  onProgress?: (progress: number, statusText: string) => void
): Promise<Blob> {
  onProgress?.(35, "Đang tải dữ liệu bài hát...");
  const audioBuffer = await decodeAudioFromUrl(url, (msg) => onProgress?.(55, msg));

  onProgress?.(75, `Đang xử lý xuất định dạng ${targetFormat.toUpperCase()}...`);
  let resultBlob: Blob;
  if (targetFormat === "wav") {
    resultBlob = bufferToWavBlob(audioBuffer);
  } else {
    resultBlob = await bufferToMp3Blob(audioBuffer, 256);
  }

  onProgress?.(100, "Chuyển đổi hoàn tất!");
  return resultBlob;
}
