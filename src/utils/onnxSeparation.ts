import * as ort from 'onnxruntime-web';
import { DemucsProcessor, CONSTANTS } from 'demucs-web';

// Configure ONNX Runtime to use more threads if supported
ort.env.wasm.numThreads = typeof SharedArrayBuffer !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 1;
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

let processorInstance: any = null;
const ONNX_CACHE_NAME = 'demucs-onnx-model-v1';

async function getCachedModel(url: string, onDownloadProgress?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  const cache = await caches.open(ONNX_CACHE_NAME);
  let response = await cache.match(url);
  
  if (!response) {
    console.log('Downloading model and caching it...');
    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) throw new Error('Failed to fetch model');
    
    const contentLength = fetchResponse.headers.get('Content-Length');
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = fetchResponse.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      let loadedSize = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedSize += value.length;
          if (onDownloadProgress && totalSize) {
            onDownloadProgress(loadedSize, totalSize);
          }
        }
      }
      
      const combined = new Uint8Array(loadedSize);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      const arrayBuffer = combined.buffer;
      const responseToCache = new Response(arrayBuffer, {
        headers: fetchResponse.headers
      });
      await cache.put(url, responseToCache);
      return arrayBuffer;
    } else {
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const responseToCache = new Response(arrayBuffer, {
        headers: fetchResponse.headers
      });
      await cache.put(url, responseToCache);
      return arrayBuffer;
    }
  } else {
    console.log('Model loaded from cache');
    if (onDownloadProgress) {
        const total = parseInt(response.headers.get('Content-Length') || '100', 10);
        onDownloadProgress(total, total);
    }
    return await response.arrayBuffer();
  }
}

export async function separateStemsWithONNX(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext,
  onProgress?: (progress: number) => void
) {
  // Detect backend
  let backend = 'wasm';
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        backend = 'webgpu';
        (ort.env as any).webgpu = { powerPreference: 'high-performance' };
      }
    } catch (e) {
      console.log('WebGPU not available, fallback to WASM');
    }
  }
  
  if (!processorInstance) {
      processorInstance = new DemucsProcessor({
        ort,
        onProgress: ({ progress, currentSegment, totalSegments }) => {
            if (onProgress) {
                // scale progress up to 90%
                onProgress(progress * 0.9);
            }
        },
        onLog: (phase, msg) => {
            console.log(`[Demucs ONNX] [${phase}] ${msg}`);
        },
        onDownloadProgress: (loaded, total) => {
            // No-op here since we handle download progress in getCachedModel now
        },
        sessionOptions: {
            enableCpuMemArena: false,
            enableMemPattern: false,
            executionProviders: backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm']
        }
      });
      console.log('Loading Demucs ONNX Model...');
      let lastLoggedPercent = -1;
      const modelBuffer = await getCachedModel(CONSTANTS.DEFAULT_MODEL_URL, (loaded, total) => {
         const percent = Math.floor((loaded / total) * 10);
         if (percent !== lastLoggedPercent) {
             lastLoggedPercent = percent;
             console.log(`Downloading model: ${(percent * 10).toFixed(1)}%`);
         }
      });
      await processorInstance.loadModel(modelBuffer);
  }

  // Get channel data
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.numberOfChannels > 1 
    ? audioBuffer.getChannelData(1) 
    : leftChannel;

  console.log('Starting separation...');
  const result = await processorInstance.separate(leftChannel, rightChannel);
  
  if (onProgress) onProgress(1);

  // Convert the output Float32Arrays back into AudioBuffers
  const makeAudioBuffer = (dL: Float32Array, dR: Float32Array): AudioBuffer => {
    const buf = audioContext.createBuffer(2, dL.length, audioBuffer.sampleRate);
    buf.copyToChannel(dL, 0);
    buf.copyToChannel(dR, 1);
    return buf;
  };

  // The tracks are ['drums', 'bass', 'other', 'vocals']
  return {
      vocals: makeAudioBuffer(result.vocals.left, result.vocals.right),
      bass: makeAudioBuffer(result.bass.left, result.bass.right),
      drums: makeAudioBuffer(result.drums.left, result.drums.right),
      other: makeAudioBuffer(result.other.left, result.other.right)
  };
}
