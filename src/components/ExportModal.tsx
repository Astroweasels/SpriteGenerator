import React, { useState } from 'react';
import { SpriteSheet } from '../types';
import { exportFrameAsPNG, exportSpriteSheetAsPNG, downloadDataURL } from '../utils/exportUtils';
import './ExportModal.css';

interface ExportModalProps {
  spriteSheet: SpriteSheet;
  activeFrameIndex: number;
  onClose: () => void;
}

type ExportTarget = 'current-frame' | 'all-frames' | 'sprite-sheet';

export const ExportModal: React.FC<ExportModalProps> = ({
  spriteSheet,
  activeFrameIndex,
  onClose,
}) => {
  const [target, setTarget] = useState<ExportTarget>('sprite-sheet');
  const [scale, setScale] = useState(1);
  const [columns, setColumns] = useState(spriteSheet.frames.length);
  const [fileName, setFileName] = useState('sprite');

  const handleExport = () => {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'sprite';

    switch (target) {
      case 'current-frame': {
        const dataURL = exportFrameAsPNG(
          spriteSheet.frames[activeFrameIndex],
          spriteSheet.width,
          spriteSheet.height,
          scale
        );
        downloadDataURL(dataURL, `${sanitizedName}_frame${activeFrameIndex + 1}.png`);
        break;
      }
      case 'all-frames': {
        spriteSheet.frames.forEach((frame, i) => {
          const dataURL = exportFrameAsPNG(frame, spriteSheet.width, spriteSheet.height, scale);
          downloadDataURL(dataURL, `${sanitizedName}_frame${i + 1}.png`);
        });
        break;
      }
      case 'sprite-sheet': {
        const dataURL = exportSpriteSheetAsPNG(spriteSheet, scale, columns);
        downloadDataURL(dataURL, `${sanitizedName}_sheet.png`);
        break;
      }
    }
    onClose();
  };

  // Preview dimensions
  const getPreviewInfo = () => {
    switch (target) {
      case 'current-frame':
        return `${spriteSheet.width * scale}×${spriteSheet.height * scale}px`;
      case 'all-frames':
        return `${spriteSheet.frames.length} files, each ${spriteSheet.width * scale}×${spriteSheet.height * scale}px`;
      case 'sprite-sheet': {
        const cols = Math.min(columns, spriteSheet.frames.length);
        const rows = Math.ceil(spriteSheet.frames.length / cols);
        return `${cols * spriteSheet.width * scale}×${rows * spriteSheet.height * scale}px (${cols}×${rows} grid)`;
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Export Sprite</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>File Name</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="filename-input"
              placeholder="sprite"
            />
          </div>

          <div className="form-group">
            <label>Export Target</label>
            <div className="export-targets">
              <button
                className={`export-target ${target === 'current-frame' ? 'active' : ''}`}
                onClick={() => setTarget('current-frame')}
              >
                <span className="target-icon">🖼️</span>
                <span>Current Frame</span>
              </button>
              <button
                className={`export-target ${target === 'all-frames' ? 'active' : ''}`}
                onClick={() => setTarget('all-frames')}
              >
                <span className="target-icon">📁</span>
                <span>All Frames (Individual)</span>
              </button>
              <button
                className={`export-target ${target === 'sprite-sheet' ? 'active' : ''}`}
                onClick={() => setTarget('sprite-sheet')}
              >
                <span className="target-icon">📋</span>
                <span>Sprite Sheet</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Scale: {scale}x ({spriteSheet.width * scale}×{spriteSheet.height * scale}px per frame)</label>
            <input
              type="range"
              min="1"
              max="10"
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value))}
              className="scale-slider"
            />
          </div>

          {target === 'sprite-sheet' && (
            <div className="form-group">
              <label>Columns: {columns}</label>
              <input
                type="range"
                min="1"
                max={spriteSheet.frames.length}
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value))}
                className="columns-slider"
              />
            </div>
          )}

          <div className="export-preview-info">
            <span className="preview-label">Output:</span>
            <span className="preview-dims">{getPreviewInfo()}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleExport}>
            📥 Download PNG
          </button>
        </div>
      </div>
    </div>
  );
};
