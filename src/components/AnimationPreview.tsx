import React, { useRef, useEffect, useState } from 'react';
import type { SpriteSheet } from '../types';
import { renderFrameToCanvas } from '../utils/exportUtils';
import './AnimationPreview.css';

interface AnimationPreviewProps {
  spriteSheet: SpriteSheet;
}

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({ spriteSheet }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [fps, setFps] = useState(8);
  const [currentFrame, setCurrentFrame] = useState(0);
  const previewScale = 3;

  useEffect(() => {
    if (!playing || spriteSheet.frames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % spriteSheet.frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [playing, fps, spriteSheet.frames.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = spriteSheet.width * previewScale;
    const h = spriteSheet.height * previewScale;
    ctx.clearRect(0, 0, w, h);

    // Dark background
    ctx.fillStyle = '#111122';
    ctx.fillRect(0, 0, w, h);

    const frame = spriteSheet.frames[currentFrame % spriteSheet.frames.length];
    if (frame) {
      renderFrameToCanvas(ctx, frame, spriteSheet.width, spriteSheet.height, previewScale);
    }
  }, [currentFrame, spriteSheet, previewScale]);

  return (
    <div className="animation-preview">
      <div className="preview-header">
        <span className="panel-title">Preview</span>
        <span className="frame-counter">
          {currentFrame + 1}/{spriteSheet.frames.length}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={spriteSheet.width * previewScale}
        height={spriteSheet.height * previewScale}
        className="preview-canvas"
      />
      <div className="preview-controls">
        <button
          className={`preview-btn ${playing ? 'active' : ''}`}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="fps-control">
          <label>FPS:</label>
          <input
            type="range"
            min="1"
            max="24"
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
          />
          <span>{fps}</span>
        </div>
      </div>
    </div>
  );
};
