// Procedural sound effect generator

export interface SfxRequest {
  category: string;
  style: string;
  lengthSeconds: number;
  seed?: number;
}

export interface SfxResponse {
  audio: string; // base64 data URI
  format: string;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildWav(samples: Int16Array, sampleRate: number): Buffer {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buf;
}

// Frequency sweep from startHz to endHz over the given samples
function sweep(samples: Int16Array, start: number, startHz: number, endHz: number, amplitude: number, waveform: 'sine' | 'square' | 'noise', rng: () => number) {
  const n = samples.length - start;
  for (let i = 0; i < n; i++) {
    const t = i / 22050;
    const freq = startHz + (endHz - startHz) * (i / n);
    const envelope = Math.max(0, 1 - i / n);
    let sample: number;
    if (waveform === 'noise') {
      sample = (rng() * 2 - 1) * amplitude * envelope;
    } else if (waveform === 'square') {
      sample = (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1) * amplitude * envelope;
    } else {
      sample = Math.sin(2 * Math.PI * freq * t) * amplitude * envelope;
    }
    samples[start + i] = Math.max(-32767, Math.min(32767, samples[start + i] + sample));
  }
}

export async function generateProceduralSfx(req: SfxRequest): Promise<SfxResponse> {
  const { category, style, lengthSeconds, seed } = req;
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * lengthSeconds);
  const samples = new Int16Array(totalSamples);
  const rng = seededRng(seed ?? Date.now());

  const isRetro = style === 'retro' || style === 'glitch';
  const waveform: 'sine' | 'square' | 'noise' = isRetro ? 'square' : 'sine';
  const amp = 20000;

  switch (category) {
    case 'jump':
      // Rising pitch sweep
      sweep(samples, 0, 200, 800, amp, waveform, rng);
      break;
    case 'hit':
      // Short noise burst, then a low thud
      sweep(samples, 0, Math.floor(totalSamples * 0.3), 300, 80, amp, 'noise', rng);
      sweep(samples, Math.floor(totalSamples * 0.1), 80, 40, amp * 0.6, waveform, rng);
      break;
    case 'pickup':
      // Three-note ascending arpeggio
      { const third = Math.floor(totalSamples / 3);
        sweep(samples, 0,       523, 523, amp, waveform, rng);
        sweep(samples, third,   659, 659, amp, waveform, rng);
        sweep(samples, third*2, 784, 784, amp, waveform, rng); }
      break;
    case 'ui':
      // Short high beep
      sweep(samples, 0, 880, 880, amp * 0.6, waveform, rng);
      break;
    case 'explosion':
      // Heavy descending noise
      sweep(samples, 0, totalSamples, 60, 20, amp, 'noise', rng);
      sweep(samples, 0, 120, 40, amp * 0.5, waveform, rng);
      break;
    case 'powerup':
      // Rapid ascending sweep
      sweep(samples, 0, totalSamples, 200, 1200, amp, waveform, rng);
      break;
    case 'shoot':
      // Sharp high-pitched decay
      sweep(samples, 0, totalSamples, 1200, 300, amp, waveform, rng);
      break;
    default: {
      // Random: pick a random sweep
      const startFreq = 100 + rng() * 400;
      const endFreq = 100 + rng() * 1000;
      sweep(samples, 0, totalSamples, startFreq, endFreq, amp, waveform, rng);
    }
  }

  const wav = buildWav(samples, sampleRate);
  return {
    audio: `data:audio/wav;base64,${wav.toString('base64')}`,
    format: 'wav',
  };
}
