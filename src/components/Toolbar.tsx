import React from 'react';
import type { Tool } from '../types';
import { MusicPlayer } from './MusicPlayer';
import './Toolbar.css';

interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  gridVisible: boolean;
  onToggleGrid: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  onCanvasResize: (w: number, h: number) => void;
}

const TOOLS: { tool: Tool; label: string; icon: string; shortcut: string }[] = [
  { tool: 'pencil', label: 'Pencil', icon: '✏️', shortcut: 'B' },
  { tool: 'eraser', label: 'Eraser', icon: '🧹', shortcut: 'E' },
  { tool: 'fill', label: 'Fill', icon: '🪣', shortcut: 'G' },
  { tool: 'eyedropper', label: 'Eyedropper', icon: '💧', shortcut: 'I' },
  { tool: 'line', label: 'Line', icon: '📏', shortcut: 'L' },
  { tool: 'rect', label: 'Rectangle', icon: '⬜', shortcut: 'R' },
  { tool: 'circle', label: 'Circle', icon: '⭕', shortcut: 'C' },
  { tool: 'select', label: 'Select', icon: '⬚', shortcut: 'S' },
  { tool: 'move', label: 'Move', icon: '✥', shortcut: 'M' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  gridVisible,
  onToggleGrid,
  zoom,
  onZoomChange,
  brushSize,
  onBrushSizeChange,
  canvasWidth,
  canvasHeight,
  onCanvasResize,
}) => {
  const showBrushSize = currentTool === 'pencil' || currentTool === 'eraser';

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Tools</span>
        <div className="tool-buttons">
          {TOOLS.map(({ tool, label, icon, shortcut }) => (
            <button
              key={tool}
              className={`tool-btn ${currentTool === tool ? 'active' : ''}`}
              onClick={() => onToolChange(tool)}
              title={`${label} (${shortcut})`}
            >
              <span className="tool-icon">{icon}</span>
              <span className="tool-name">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showBrushSize && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-section">
            <span className="toolbar-label">Brush</span>
            <div className="brush-size-control">
              {[1, 2, 3, 4, 5].map((size) => (
                <button
                  key={size}
                  className={`brush-size-btn ${brushSize === size ? 'active' : ''}`}
                  onClick={() => onBrushSizeChange(size)}
                  title={`${size}×${size} brush`}
                >
                  <span
                    className="brush-size-dot"
                    style={{ width: 4 + size * 3, height: 4 + size * 3 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="toolbar-label">Actions</span>
        <div className="tool-buttons">
          <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            ↩️ Undo
          </button>
          <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            ↪️ Redo
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="toolbar-label">View</span>
        <div className="tool-buttons">
          <button
            className={`tool-btn ${gridVisible ? 'active' : ''}`}
            onClick={onToggleGrid}
            title="Toggle Grid"
          >
            🔲 Grid
          </button>
          <div className="zoom-control">
            <button className="zoom-btn" onClick={() => onZoomChange(Math.max(2, zoom - 2))}>−</button>
            <span className="zoom-label">🔍 {zoom}x</span>
            <button className="zoom-btn" onClick={() => onZoomChange(Math.min(32, zoom + 2))}>+</button>
          </div>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="toolbar-label">Canvas</span>
        <div className="canvas-size-control">
          <span className="canvas-dim-label">W</span>
          <button className="canvas-dim-btn" onClick={() => onCanvasResize(Math.max(8, canvasWidth - 8), canvasHeight)}>−</button>
          <span className="canvas-dim-value">{canvasWidth}</span>
          <button className="canvas-dim-btn" onClick={() => onCanvasResize(Math.min(128, canvasWidth + 8), canvasHeight)}>+</button>
          <span className="canvas-size-x">×</span>
          <span className="canvas-dim-label">H</span>
          <button className="canvas-dim-btn" onClick={() => onCanvasResize(canvasWidth, Math.max(8, canvasHeight - 8))}>−</button>
          <span className="canvas-dim-value">{canvasHeight}</span>
          <button className="canvas-dim-btn" onClick={() => onCanvasResize(canvasWidth, Math.min(128, canvasHeight + 8))}>+</button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="toolbar-label">Music</span>
        <MusicPlayer />
      </div>
    </div>
  );
};
