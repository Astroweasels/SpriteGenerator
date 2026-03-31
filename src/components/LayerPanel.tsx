import React, { useState } from 'react';
import type { Layer } from '../types';
import './LayerPanel.css';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onMergeDown: (id: string) => void;
  onClearLayer: (id: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleVisibility,
  onRenameLayer,
  onOpacityChange,
  onMoveLayer,
  onMergeDown,
  onClearLayer,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <span className="panel-title">
          Layers
          <button
            className="layer-info-btn"
            onClick={() => setShowInfo(!showInfo)}
            title="What are layers?"
          >
            ⓘ
          </button>
        </span>
        <button className="layer-add-btn" onClick={onAddLayer} title="Add Layer">
          + Add
        </button>
      </div>

      {showInfo && (
        <div className="layer-info-box">
          <p>
            <strong>Layers</strong> are like transparent sheets stacked on top of each other.
            Draw different parts on separate layers and edit each one without affecting the rest.
          </p>
          <table className="layer-info-table">
            <tbody>
              <tr><td>👁️</td><td>Toggle layer visibility on/off</td></tr>
              <tr><td>Slider</td><td>Adjust layer opacity (transparency)</td></tr>
              <tr><td>↑ ↓</td><td>Move layer up or down in the stack</td></tr>
              <tr><td>⧉</td><td>Duplicate the layer</td></tr>
              <tr><td>⤓</td><td>Merge this layer into the one below</td></tr>
              <tr><td>🗑️</td><td>Clear all pixels on this layer</td></tr>
              <tr><td>✕</td><td>Delete the layer</td></tr>
            </tbody>
          </table>
          <p className="layer-info-tip">Layers higher in the list are drawn on top. You can ignore layers entirely — everything works fine on the default layer.</p>
        </div>
      )}

      <div className="layer-list">
        {[...layers].reverse().map((layer, reversedIndex) => {
          const actualIndex = layers.length - 1 - reversedIndex;
          return (
            <div
              key={layer.id}
              className={`layer-item ${layer.id === activeLayerId ? 'active' : ''}`}
              onClick={() => onSelectLayer(layer.id)}
            >
              <button
                className={`layer-visibility ${layer.visible ? 'visible' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                title={layer.visible ? 'Hide' : 'Show'}
              >
                {layer.visible ? '👁️' : '🚫'}
              </button>

              <input
                className="layer-name"
                value={layer.name}
                onChange={(e) => onRenameLayer(layer.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />

              <div className="layer-opacity">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) => onOpacityChange(layer.id, parseInt(e.target.value) / 100)}
                  onClick={(e) => e.stopPropagation()}
                  title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
                />
              </div>

              <div className="layer-actions">
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'up'); }}
                  disabled={actualIndex === layers.length - 1}
                  title="Move Up"
                >↑</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'down'); }}
                  disabled={actualIndex === 0}
                  title="Move Down"
                >↓</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
                  title="Duplicate"
                >⧉</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMergeDown(layer.id); }}
                  disabled={actualIndex === 0}
                  title="Merge Down"
                >⤓</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onClearLayer(layer.id); }}
                  title="Clear Layer"
                >🗑️</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                  disabled={layers.length <= 1}
                  title="Delete Layer"
                  className="delete-btn"
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
