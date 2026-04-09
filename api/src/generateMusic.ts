// Procedural music generator

export interface MusicRequest {
  style: string;
  mood: string;
  lengthSeconds: number;
  tempo?: number;
  seed?: number;
}

export interface MusicResponse {
  audio: string; // base64 data URI
  format: string;
}

// Seeded RNG (mulberry32)
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Scales by mood (base frequencies in Hz)
const SCALES: Record<string, number[]> = {
  upbeat:    [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88], // C major
  energetic: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88],
  mysterious:[220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 415.30], // A natural minor
  dark:      [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 415.30],
  sad:       [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16], // C minor
  relaxing:  [261.63, 293.66, 329.63, 392.00, 440.00],                  // C pentatonic
  random:    [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88],
};

function buildWav(samples: Int16Array, sampleRate: number): Buffer {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);              // PCM
  buf.writeUInt16LE(1, 22);              // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);              // block align
  buf.writeUInt16LE(16, 34);             // bits per sample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(samples[i], 44 + i * 2);
  }

  return buf;
}

export async function generateProceduralMusic(req: MusicRequest): Promise<MusicResponse> {
  const { style, mood, lengthSeconds, tempo = 120, seed } = req;
  const sampleRate = 22050;
  const rng = seededRng(seed ?? Date.now());

  const totalSamples = Math.floor(sampleRate * lengthSeconds);
  const samples = new Int16Array(totalSamples);

  const scale = SCALES[mood] ?? SCALES.upbeat;
  const noteSamples = Math.floor(sampleRate * (60 / tempo) * 0.5); // eighth notes
  const isChiptune = style === 'chiptune';
  const isAmbient = style === 'ambient';
  const amplitude = isAmbient ? 8000 : 14000;

  let i = 0;
  while (i < totalSamples) {
    const freq = scale[Math.floor(rng() * scale.length)];
    const noteLen = isAmbient
      ? Math.floor(noteSamples * (2 + rng() * 4))
      : Math.floor(noteSamples * (0.5 + rng() * 1.5));
    const end = Math.min(i + noteLen, totalSamples);

    for (let j = i; j < end; j++) {
      const t = (j - i) / sampleRate;
      const attackSamples = sampleRate * 0.01;
      const releaseSamples = sampleRate * 0.05;
      const envelope =
        Math.min(1, (j - i) / attackSamples) *
        Math.min(1, (end - j) / releaseSamples);

      let sample: number;
      if (isChiptune) {
        sample = (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1) * amplitude * envelope;
      } else {
        sample = Math.sin(2 * Math.PI * freq * t) * amplitude * envelope;
      }

      samples[j] = Math.max(-32767, Math.min(32767, samples[j] + sample));
    }

    const gap = isAmbient ? 0 : Math.floor(noteSamples * 0.1);
    i = end + gap;
  }

  const wav = buildWav(samples, sampleRate);
  return {
    audio: `data:audio/wav;base64,${wav.toString('base64')}`,
    format: 'wav',
  };
}
