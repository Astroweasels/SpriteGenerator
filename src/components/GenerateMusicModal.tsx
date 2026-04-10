import React, { useState, useEffect, useRef, useCallback } from 'react';
import './GenerateMusicModal.css';

export type GenerateMusicParams = {
  style: string;
  mood: string;
  lengthSeconds: number;
  tempo?: number;
};

interface GenerateMusicModalProps {
  onClose: () => void;
  onDownload: (audioUrl: string, format: string, params: GenerateMusicParams) => void;
  apiBase: string;
}

const STYLES = ['chiptune', 'orchestral', 'synthwave', 'lo-fi', 'jazz', 'rock', 'ambient', 'random'];
const MOODS = ['upbeat', 'mysterious', 'dark', 'relaxing', 'energetic', 'sad', 'random'];

export const GenerateMusicModal: React.FC<GenerateMusicModalProps> = ({ onClose, onDownload, apiBase }) => {
  const [style, setStyle] = useState('chiptune');
  const [mood, setMood] = useState('upbeat');
  const [lengthSeconds, setLengthSeconds] = useState(12);
  const [tempo, setTempo] = useState(120);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [format, setFormat] = useState('wav');
  const [error, setError] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Keep audio volume in sync with slider
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const generateAudio = useCallback(async (params: GenerateMusicParams) => {
    const clamped: GenerateMusicParams = {
      ...params,
      lengthSeconds: Math.max(2, Math.min(60, params.lengthSeconds)),
      tempo: params.tempo !== undefined ? Math.max(60, Math.min(200, params.tempo)) : undefined,
    };
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/generate-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clamped),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data?.audio && data?.format) {
        setAudioUrl(data.audio);
        setFormat(data.format);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // Auto-play: re-generate after params change (debounced)
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(() => {
      generateAudio({ style, mood, lengthSeconds, tempo });
    }, 500);
    return () => clearTimeout(timer);
  }, [style, mood, lengthSeconds, tempo, autoPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play new audio when it arrives
  useEffect(() => {
    if (audioUrl && autoPlay && audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generateAudio({ style, mood, lengthSeconds, tempo });
  };

  const handleToggleAutoPlay = () => {
    if (autoPlay) {
      setAutoPlay(false);
      audioRef.current?.pause();
    } else {
      setAutoPlay(true);
      generateAudio({ style, mood, lengthSeconds, tempo });
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `music_${style}_${mood}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDownload(audioUrl, format, { style, mood, lengthSeconds, tempo });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="generate-music-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎼 Generate Music {autoPlay && <span className="auto-play-indicator">● LIVE</span>}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleManualGenerate}>
          <div className="form-group">
            <label>Style</label>
            <select value={style} onChange={e => setStyle(e.target.value)}>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Mood</label>
            <select value={mood} onChange={e => setMood(e.target.value)}>
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Length (seconds)</label>
              <input type="number" min={2} max={60} value={lengthSeconds} onChange={e => setLengthSeconds(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Tempo (BPM)</label>
              <input type="number" min={60} max={200} value={tempo} onChange={e => setTempo(Number(e.target.value))} />
            </div>
          </div>

          {error && <div className="music-error">{error}</div>}

          <div className="music-preview">
            <audio ref={audioRef} controls src={audioUrl ?? undefined} loop={autoPlay} />
            <div className="volume-row">
              <span className="vol-icon">🔈</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={e => setVolume(Number(e.target.value) / 100)}
                className="volume-slider"
              />
              <span className="vol-icon">🔊</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {audioUrl && (
              <button type="button" className="btn-secondary" onClick={handleDownload}>
                Download
              </button>
            )}
            <button
              type="button"
              className={`btn-autoplay ${autoPlay ? 'active' : ''}`}
              onClick={handleToggleAutoPlay}
              title={autoPlay ? 'Stop auto-play mode' : 'Enable auto-play — regenerates when you change options'}
            >
              {autoPlay ? (loading ? '⏳ Generating...' : '⏹ Stop') : '▶ Auto-play'}
            </button>
            {!autoPlay && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Generating...' : audioUrl ? 'Regenerate' : 'Generate'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
