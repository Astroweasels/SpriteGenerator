import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { SpriteSheet, SpriteFrame } from '../types';
import { renderFrameToCanvas } from '../utils/exportUtils';
import './AnimationPreview.css';

interface AnimationPreviewProps {
  spriteSheet: SpriteSheet;
  activeSequenceId: string;
}

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({ spriteSheet, activeSequenceId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [fps, setFps] = useState(8);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [prevSequenceId, setPrevSequenceId] = useState(activeSequenceId);
  const previewScale = 3;

  // Reset frame counter when sequence changes (render-time update avoids double render from useEffect)
  if (prevSequenceId !== activeSequenceId) {
    setPrevSequenceId(activeSequenceId);
    setCurrentFrame(0);
  }

  // Resolve frames for active sequence
  const seqFrames: SpriteFrame[] = useMemo(() => {
    const seq = spriteSheet.sequences.find(s => s.id === activeSequenceId);
    if (!seq) return spriteSheet.frames;
    return seq.frameIds
      .map(id => spriteSheet.frames.find(f => f.id === id))
      .filter(Boolean) as SpriteFrame[];
  }, [spriteSheet, activeSequenceId]);

  const seqName = spriteSheet.sequences.find(s => s.id === activeSequenceId)?.name ?? 'All';

  useEffect(() => {
    if (!playing || seqFrames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % seqFrames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [playing, fps, seqFrames.length]);

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

    const frame = seqFrames[currentFrame % seqFrames.length];
    if (frame) {
      renderFrameToCanvas(ctx, frame, spriteSheet.width, spriteSheet.height, previewScale);
    }
  }, [currentFrame, seqFrames, spriteSheet.width, spriteSheet.height, previewScale]);

  return (
    <div className="animation-preview">
      <div className="preview-header">
        <span className="panel-title">Preview &middot; {seqName}</span>
        <span className="frame-counter">
          {currentFrame + 1}/{seqFrames.length}
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
