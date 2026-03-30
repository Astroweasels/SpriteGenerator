import React, { useRef, useEffect } from 'react';
import type { SpriteFrame, SpriteSheet } from '../types';
import { renderFrameToCanvas } from '../utils/exportUtils';
import './FramePanel.css';

interface FramePanelProps {
  spriteSheet: SpriteSheet;
  activeFrameIndex: number;
  activeSequenceId: string;
  onSelectFrame: (index: number) => void;
  onSelectSequence: (sequenceId: string) => void;
  onAddFrame: (sequenceId: string) => void;
  onAddSequence: () => void;
  onDeleteSequence: (sequenceId: string) => void;
  onRenameSequence: (sequenceId: string, name: string) => void;
  onDuplicateFrame: (index: number) => void;
  onDeleteFrame: (index: number) => void;
  onReorderFrame: (from: number, to: number) => void;
  onRenameFrame: (index: number, name: string) => void;
}

const FrameThumbnail: React.FC<{
  frame: SpriteFrame;
  width: number;
  height: number;
  size: number;
}> = ({ frame, width, height, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    // Checkerboard background
    const checkSize = Math.max(2, Math.floor(size / width));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#555' : '#444';
        ctx.fillRect(x * checkSize, y * checkSize, checkSize, checkSize);
      }
    }

    const scale = Math.floor(size / Math.max(width, height));
    renderFrameToCanvas(ctx, frame, width, height, scale);
  }, [frame, width, height, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="frame-thumbnail-canvas" />;
};

export const FramePanel: React.FC<FramePanelProps> = ({
  spriteSheet,
  activeFrameIndex,
  activeSequenceId,
  onSelectFrame,
  onSelectSequence,
  onAddFrame,
  onAddSequence,
  onDeleteSequence,
  onRenameSequence,
  onDuplicateFrame,
  onDeleteFrame,
  onReorderFrame,
  onRenameFrame,
}) => {
  return (
    <div className="frame-panel">
      <div className="frame-panel-header">
        <span className="panel-title">
          Sequences ({spriteSheet.sequences.length}) &middot; Frames ({spriteSheet.frames.length})
        </span>
        <button className="frame-add-btn" onClick={onAddSequence}>
          + Sequence
        </button>
      </div>

      <div className="sequence-list">
        {spriteSheet.sequences.map((seq) => {
          const isActive = seq.id === activeSequenceId;
          const seqFrames = seq.frameIds
            .map((id) => {
              const idx = spriteSheet.frames.findIndex((f) => f.id === id);
              return idx >= 0 ? { frame: spriteSheet.frames[idx], index: idx } : null;
            })
            .filter(Boolean) as { frame: SpriteFrame; index: number }[];

          return (
            <div
              key={seq.id}
              className={`sequence-row ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSequence(seq.id)}
            >
              <div className="sequence-header">
                <input
                  className="sequence-name-input"
                  value={seq.name}
                  onChange={(e) => onRenameSequence(seq.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="sequence-frame-count">{seqFrames.length} frames</span>
                <div className="sequence-actions">
                  <button
                    className="seq-action-btn"
                    onClick={(e) => { e.stopPropagation(); onAddFrame(seq.id); }}
                    title="Add frame to this sequence"
                  >+ Frame</button>
                  <button
                    className="seq-action-btn seq-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDeleteSequence(seq.id); }}
                    disabled={spriteSheet.sequences.length <= 1}
                    title="Delete sequence"
                  >✕</button>
                </div>
              </div>

              <div className="frame-list">
                {seqFrames.map(({ frame, index }) => (
                  <div
                    key={frame.id}
                    className={`frame-item ${index === activeFrameIndex ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onSelectSequence(seq.id); onSelectFrame(index); }}
                  >
                    <FrameThumbnail
                      frame={frame}
                      width={spriteSheet.width}
                      height={spriteSheet.height}
                      size={64}
                    />
                    <div className="frame-info">
                      <input
                        className="frame-name-input"
                        value={frame.name}
                        onChange={(e) => onRenameFrame(index, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="frame-index">#{index + 1}</span>
                    </div>
                    <div className="frame-actions">
                      <button
                        onClick={(e) => { e.stopPropagation(); onReorderFrame(index, index - 1); }}
                        disabled={index === 0}
                        title="Move Left"
                      >◀</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onReorderFrame(index, index + 1); }}
                        disabled={index === spriteSheet.frames.length - 1}
                        title="Move Right"
                      >▶</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicateFrame(index); }}
                        title="Duplicate Frame"
                      >⧉</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteFrame(index); }}
                        disabled={spriteSheet.frames.length <= 1}
                        title="Delete Frame"
                        className="frame-delete-btn"
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
