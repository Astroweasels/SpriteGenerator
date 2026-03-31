import React, { useState, useEffect, useRef } from 'react';
import { AmbientMusic, TRACK_PRESETS } from '../utils/ambientMusic';
import './MusicPlayer.css';

export const MusicPlayer: React.FC = () => {
  const musicRef = useRef<AmbientMusic | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [trackIndex, setTrackIndex] = useState(0);

  useEffect(() => {
    musicRef.current = new AmbientMusic();
    return () => {
      musicRef.current?.destroy();
    };
  }, []);

  const toggle = () => {
    const m = musicRef.current;
    if (!m) return;
    if (playing) {
      m.stop();
      setPlaying(false);
    } else {
      m.start();
      setPlaying(true);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    musicRef.current?.setVolume(v);
  };

  const handleTune = () => {
    const next = (trackIndex + 1) % TRACK_PRESETS.length;
    setTrackIndex(next);
    musicRef.current?.setTrack(next);
  };

  return (
    <div className="music-player">
      <button
        className={`music-toggle ${playing ? 'playing' : ''}`}
        onClick={toggle}
        title={playing ? 'Pause ambient music' : 'Play ambient music'}
      >
        {playing ? '🎵' : '🔇'}
      </button>
      {playing && (
        <>
          <input
            className="music-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolume}
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
          <button
            className="music-tune"
            onClick={handleTune}
            title={`Track: ${TRACK_PRESETS[trackIndex].name}`}
          >
            🎶 {TRACK_PRESETS[trackIndex].name}
          </button>
        </>
      )}
    </div>
  );
};
