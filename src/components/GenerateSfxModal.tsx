import React, { useState } from 'react';
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

  const params: GenerateSfxParams = { category, style, lengthSeconds };

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setAudioUrl(null);
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
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `sfx_${category}_${style}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDownload(audioUrl, format, params);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="generate-sfx-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔊 Generate SFX</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleGenerate}>
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

          {audioUrl && (
            <div className="sfx-preview">
              <audio controls src={audioUrl} />
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {audioUrl && (
              <button type="button" className="btn-secondary" onClick={handleDownload}>
                Download
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Generating...' : audioUrl ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
