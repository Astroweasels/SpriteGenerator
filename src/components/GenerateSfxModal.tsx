import React, { useState, useEffect, useRef, useCallback } from 'react';
import './GenerateSfxModal.css';

export type GenerateSfxParams = {
  category: string;
  style: string;
  lengthSeconds: number;
};

interface GenerateSfxModalProps {
  onClose: () => void;
  onDownload: (audioUrl: string, format: string, params: GenerateSfxParams) => void;
  apiBase: string;
}

const CATEGORIES = ['jump', 'hit', 'pickup', 'ui', 'explosion', 'powerup', 'shoot', 'random'];
const STYLES = ['retro', 'modern', 'organic', 'glitch', 'random'];

export const GenerateSfxModal: React.FC<GenerateSfxModalProps> = ({ onClose, onDownload, apiBase }) => {
  const [category, setCategory] = useState('jump');
  const [style, setStyle] = useState('retro');
  const [lengthSeconds, setLengthSeconds] = useState(0.5);
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

  const generateAudio = useCallback(async (params: GenerateSfxParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/generate-sfx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
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

  // Auto-play: re-generate after params change (debounced — shorter for SFX since they're brief)
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(() => {
      generateAudio({ category, style, lengthSeconds });
    }, 250);
    return () => clearTimeout(timer);
  }, [category, style, lengthSeconds, autoPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play new audio when it arrives
  useEffect(() => {
    if (audioUrl && autoPlay && audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generateAudio({ category, style, lengthSeconds });
  };

  const handleToggleAutoPlay = () => {
    if (autoPlay) {
      setAutoPlay(false);
      audioRef.current?.pause();
    } else {
      setAutoPlay(true);
      generateAudio({ category, style, lengthSeconds });
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `sfx_${category}_${style}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDownload(audioUrl, format, { category, style, lengthSeconds });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="generate-sfx-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔊 Generate SFX {autoPlay && <span className="auto-play-indicator">● LIVE</span>}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleManualGenerate}>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Style</label>
            <select value={style} onChange={e => setStyle(e.target.value)}>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Length (seconds)</label>
            <input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={lengthSeconds}
              onChange={e => setLengthSeconds(Number(e.target.value))}
            />
          </div>

          {error && <div className="sfx-error">{error}</div>}

          <div className="sfx-preview">
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
