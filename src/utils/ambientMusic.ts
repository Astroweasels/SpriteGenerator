/**
 * Procedural ambient music generator using Web Audio API.
 * Creates gentle, evolving pads with selectable track presets.
 */

// Pentatonic note frequencies across several octaves (C, D, E, G, A)
const NOTES = [
  130.81, 146.83, 164.81, 196.00, 220.00,  // C3–A3
  261.63, 293.66, 329.63, 392.00, 440.00,  // C4–A4
  523.25, 587.33, 659.25, 783.99, 880.00,  // C5–A5
];

// Minor pentatonic (C, Eb, F, G, Bb)
const MINOR_NOTES = [
  130.81, 155.56, 174.61, 196.00, 233.08,
  261.63, 311.13, 349.23, 392.00, 466.16,
  523.25, 622.25, 698.46, 783.99, 932.33,
];

// Dorian-ish (D, E, F, A, B)
const DORIAN_NOTES = [
  146.83, 164.81, 174.61, 220.00, 246.94,
  293.66, 329.63, 349.23, 440.00, 493.88,
  587.33, 659.25, 698.46, 880.00, 987.77,
];

// Whole tone (dreamy/ethereal) (C, D, E, F#, G#, A#)
const WHOLETONE_NOTES = [
  130.81, 146.83, 164.81, 185.00, 207.65, 233.08,
  261.63, 293.66, 329.63, 369.99, 415.30, 466.16,
  523.25, 587.33, 659.25, 739.99, 830.61, 932.33,
];

// Major pentatonic, biased to higher octaves (C, D, E, G, A — octaves 4-6)
const MAJOR_HIGH_NOTES = [
  261.63, 293.66, 329.63, 392.00, 440.00,  // C4–A4
  523.25, 587.33, 659.25, 783.99, 880.00,  // C5–A5
  1046.50, 1174.66, 1318.51, 1567.98, 1760.00, // C6–A6
];

export interface TrackPreset {
  name: string;
  notes: number[];
  chordDuration: [number, number];   // [min, max] seconds
  chordCount: [number, number];      // [min, max] notes per chord
  melodyInterval: [number, number];  // [min, max] seconds between melody notes
  melodyDuration: [number, number];  // [min, max] seconds per note
  chordType: OscillatorType;
  melodyType: OscillatorType;
  chordVol: number;
  melodyVol: number;
}

export const TRACK_PRESETS: TrackPreset[] = [
  {
    name: 'Dreamy Pads',
    notes: NOTES,
    chordDuration: [6, 12],
    chordCount: [2, 3],
    melodyInterval: [3, 11],
    melodyDuration: [2, 5],
    chordType: 'sine',
    melodyType: 'sine',
    chordVol: 0.06,
    melodyVol: 0.025,
  },
  {
    name: 'Dark Forge',
    notes: MINOR_NOTES,
    chordDuration: [8, 16],
    chordCount: [2, 4],
    melodyInterval: [5, 14],
    melodyDuration: [3, 7],
    chordType: 'triangle',
    melodyType: 'sine',
    chordVol: 0.05,
    melodyVol: 0.02,
  },
  {
    name: 'Pixel Jazz',
    notes: DORIAN_NOTES,
    chordDuration: [3, 6],
    chordCount: [3, 4],
    melodyInterval: [1.5, 4],
    melodyDuration: [0.8, 2.5],
    chordType: 'triangle',
    melodyType: 'triangle',
    chordVol: 0.04,
    melodyVol: 0.03,
  },
  {
    name: 'Ethereal',
    notes: WHOLETONE_NOTES,
    chordDuration: [10, 20],
    chordCount: [2, 3],
    melodyInterval: [6, 16],
    melodyDuration: [4, 9],
    chordType: 'sine',
    melodyType: 'sine',
    chordVol: 0.05,
    melodyVol: 0.018,
  },
  {
    name: 'Happy Bits',
    notes: MAJOR_HIGH_NOTES,
    chordDuration: [2, 4],
    chordCount: [2, 3],
    melodyInterval: [0.8, 2.5],
    melodyDuration: [0.4, 1.2],
    chordType: 'triangle',
    melodyType: 'square',
    chordVol: 0.035,
    melodyVol: 0.02,
  },
];

export class AmbientMusic {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private timers: number[] = [];
  private activeOscs: OscillatorNode[] = [];
  private _volume = 0.3;
  private _trackIndex = 0;

  get volume(): number {
    return this._volume;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get trackIndex(): number {
    return this._trackIndex;
  }

  get trackName(): string {
    return TRACK_PRESETS[this._trackIndex].name;
  }

  private get track(): TrackPreset {
    return TRACK_PRESETS[this._trackIndex];
  }

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this._volume;
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(this._volume, this.ctx!.currentTime, 0.1);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.ensureCtx();
    this.isPlaying = true;
    this.scheduleChord();
    this.scheduleMelody();
  }

  stop() {
    this.isPlaying = false;
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.activeOscs.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.activeOscs = [];
  }

  destroy() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.gainNode = null;
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, vol: number, detune = 0) {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const now = this.ctx.currentTime;
    const attack = duration * 0.3;
    const release = duration * 0.4;

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(vol, now + attack);
    env.gain.setValueAtTime(vol, now + duration - release);
    env.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(env);
    env.connect(this.gainNode);

    osc.start(now);
    osc.stop(now + duration + 0.05);
    this.activeOscs.push(osc);
    osc.onended = () => {
      this.activeOscs = this.activeOscs.filter(o => o !== osc);
    };
  }

  setTrack(index: number) {
    this._trackIndex = index % TRACK_PRESETS.length;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  private scheduleChord() {
    if (!this.isPlaying) return;
    const t = this.track;

    const [minCount, maxCount] = t.chordCount;
    const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
    const [minDur, maxDur] = t.chordDuration;
    const duration = minDur + Math.random() * (maxDur - minDur);

    // Use lower 2/3 of notes for chords
    const chordPool = Math.floor(t.notes.length * 0.6);
    for (let i = 0; i < count; i++) {
      const note = t.notes[Math.floor(Math.random() * chordPool)];
      this.playTone(note, duration, t.chordType, t.chordVol, Math.random() * 10 - 5);
      // Add a subtle detuned layer for richness
      this.playTone(note, duration, t.chordType === 'sine' ? 'triangle' : 'sine', t.chordVol * 0.5, 5 + Math.random() * 5);
    }

    const next = (duration * 0.7 + Math.random() * 2) * 1000;
    this.timers.push(window.setTimeout(() => this.scheduleChord(), next));
  }

  private scheduleMelody() {
    if (!this.isPlaying) return;
    const t = this.track;

    // Use upper portion of notes for melody sparkles
    const melodyStart = Math.floor(t.notes.length * 0.5);
    const note = t.notes[melodyStart + Math.floor(Math.random() * (t.notes.length - melodyStart))];
    const [minDur, maxDur] = t.melodyDuration;
    const duration = minDur + Math.random() * (maxDur - minDur);
    this.playTone(note, duration, t.melodyType, t.melodyVol);

    const [minInt, maxInt] = t.melodyInterval;
    const next = (minInt + Math.random() * (maxInt - minInt)) * 1000;
    this.timers.push(window.setTimeout(() => this.scheduleMelody(), next));
  }
}
