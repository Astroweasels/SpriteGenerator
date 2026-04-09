import React, { useState } from 'react';
import './GenerateMusicModal.css';

interface GenerateMusicModalProps {
  onClose: () => void;
  onGenerate: (params: GenerateMusicParams) => void;
  loading?: boolean;
}

export interface GenerateMusicParams {
  style: string;
  mood: string;
  lengthSeconds: number;
  tempo?: number;
}

const STYLES = [
  'chiptune', 'orchestral', 'synthwave', 'lo-fi', 'jazz', 'rock', 'ambient', 'random',
];
const MOODS = [
  'upbeat', 'mysterious', 'dark', 'relaxing', 'energetic', 'sad', 'random',
];

export const GenerateMusicModal: React.FC<GenerateMusicModalProps> = ({ onClose, onGenerate, loading }) => {
  const [style, setStyle] = useState('chiptune');
  const [mood, setMood] = useState('upbeat');
  const [lengthSeconds, setLengthSeconds] = useState(12);
  const [tempo, setTempo] = useState(120);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ style, mood, lengthSeconds, tempo });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="generate-music-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎼 Generate Music</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
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
          <div className="form-group">
            <label>Length (seconds)</label>
            <input type="number" min={2} max={60} value={lengthSeconds} onChange={e => setLengthSeconds(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Tempo (BPM)</label>
            <input type="number" min={60} max={200} value={tempo} onChange={e => setTempo(Number(e.target.value))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
