
import React, { useState } from 'react';
import type { SpriteSheet } from '../types';
import { exportFrameAsPNG, exportSpriteSheetAsPNG, exportSpriteSheetPack, downloadDataURL } from '../utils/exportUtils';
import type { ExportFormat } from '../utils/exportUtils';
import { createAssetPackZip } from '../utils/zipUtils';
import './ExportModal.css';


interface ExportModalProps {
  spriteSheet: SpriteSheet;
  activeFrameIndex: number;
  onClose: () => void;
  backgrounds?: { composite: string; layers: { name: string; dataUrl: string }[] };
  music?: { base64: string; filename: string };
  sfx?: { base64: string; filename: string };
}

type ExportTarget = 'current-frame' | 'all-frames' | 'sprite-sheet' | 'sprite-sheet-pack' | 'asset-pack';

export const ExportModal: React.FC<ExportModalProps> = ({
  spriteSheet,
  activeFrameIndex,
  onClose,
}) => {
  const [target, setTarget] = useState<ExportTarget>('sprite-sheet');
  const [scale, setScale] = useState(1);
  const [columns, setColumns] = useState(spriteSheet.frames.length);
  const [fileName, setFileName] = useState('sprite');
  const [perSequence, setPerSequence] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('generic');

  const handleExport = async () => {
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
      case 'sprite-sheet-pack': {
        exportSpriteSheetPack(spriteSheet, scale, columns, sanitizedName, perSequence, exportFormat);
        break;
      }
      case 'asset-pack': {
        // Build manifest and engine formats
        const manifest = JSON.stringify({/* ...minimal manifest for now... */}, null, 2);
        // For now, use the same PNG and manifest as sprite-sheet-pack
        const spriteSheetPng = exportSpriteSheetAsPNG(spriteSheet, scale, columns);
        // TODO: Get engine formats from exportUtils if needed
        const engineFormats: Record<string, string> = {};
        // Compose asset pack
        const zipBlob = await createAssetPackZip({
          spriteSheetPng,
          manifestJson: manifest,
          engineFormats,
          backgrounds,
          music,
          sfx,
          fileName: sanitizedName,
        });
        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        downloadDataURL(url, `${sanitizedName}_asset_pack.zip`);
        URL.revokeObjectURL(url);
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
      case 'sprite-sheet-pack': {
        const formatLabel = { generic: 'JSON manifest', phaser: 'Phaser 3 Atlas JSON', godot: 'Godot .tres', css: 'CSS Sprite Sheet' }[exportFormat];
        if (perSequence) {
          const seqCount = spriteSheet.sequences.length || 1;
          return `PNG + ${formatLabel} (${seqCount} sequence${seqCount !== 1 ? 's' : ''}, grouped by row)`;
        }
        const cols = Math.min(columns, spriteSheet.frames.length);
        const rows = Math.ceil(spriteSheet.frames.length / cols);
        return `PNG + ${formatLabel} (${cols}×${rows} grid)`;
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
              <button
                className={`export-target ${target === 'sprite-sheet-pack' ? 'active' : ''}`}
                onClick={() => setTarget('sprite-sheet-pack')}
              >
                <span className="target-icon">📦</span>
                <span>Sprite Sheet Pack (PNG + JSON)</span>
              </button>
              <button
                className={`export-target ${target === 'asset-pack' ? 'active' : ''}`}
                onClick={() => setTarget('asset-pack')}
              >
                <span className="target-icon">🗂️</span>
                <span>Asset Pack (ZIP)</span>
              </button>
              </button>
              <button
                className={`export-target ${target === 'sprite-sheet' ? 'active' : ''}`}
                onClick={() => setTarget('sprite-sheet')}
              >
                <span className="target-icon">📋</span>
                <span>Sprite Sheet</span>
              </button>
              <button
                className={`export-target ${target === 'sprite-sheet-pack' ? 'active' : ''}`}
                onClick={() => setTarget('sprite-sheet-pack')}
              >
                <span className="target-icon">📦</span>
                <span>Sprite Sheet Pack (PNG + JSON)</span>
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

          {target === 'sprite-sheet-pack' && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={perSequence}
                  onChange={(e) => setPerSequence(e.target.checked)}
                />
                Organize by animation sequence (one row per sequence)
              </label>
            </div>
          )}

          {target === 'sprite-sheet-pack' && (
            <div className="form-group">
              <label>Engine Format</label>
              <div className="format-grid">
                <button
                  className={`format-btn ${exportFormat === 'generic' ? 'active' : ''}`}
                  onClick={() => setExportFormat('generic')}
                >
                  <span className="format-icon">📄</span>
                  <span className="format-label">Generic JSON</span>
                  <span className="format-desc">TexturePacker compatible</span>
                </button>
                <button
                  className={`format-btn ${exportFormat === 'phaser' ? 'active' : ''}`}
                  onClick={() => setExportFormat('phaser')}
                >
                  <span className="format-icon">⚡</span>
                  <span className="format-label">Phaser 3</span>
                  <span className="format-desc">Multi-atlas JSON</span>
                </button>
                <button
                  className={`format-btn ${exportFormat === 'godot' ? 'active' : ''}`}
                  onClick={() => setExportFormat('godot')}
                >
                  <span className="format-icon">🤖</span>
                  <span className="format-label">Godot 4</span>
                  <span className="format-desc">SpriteFrames .tres</span>
                </button>
                <button
                  className={`format-btn ${exportFormat === 'css' ? 'active' : ''}`}
                  onClick={() => setExportFormat('css')}
                >
                  <span className="format-icon">🎨</span>
                  <span className="format-label">CSS Sprites</span>
                  <span className="format-desc">Web animations</span>
                </button>
              </div>
            </div>
          )}

          {(target === 'sprite-sheet' || (target === 'sprite-sheet-pack' && !perSequence)) && (
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
            📥 {target === 'sprite-sheet-pack' ? 'Download Pack' : 'Download PNG'}
          </button>
        </div>
      </div>
    </div>
  );
};
