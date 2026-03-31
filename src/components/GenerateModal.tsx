import React, { useState } from 'react';
import type { RandomGenOptions } from '../types';
import { TEMPLATES, TEMPLATE_NAMES } from '../utils/templates';
import { POSE_SEQUENCE_NAMES, OBJECT_VARIANTS } from '../utils/generateSprite';
import './GenerateModal.css';

// Sensible default color scheme per object variant
const OBJECT_COLOR_DEFAULTS: Record<number, RandomGenOptions['colorScheme']> = {
  0: 'earth',       // Pine Tree
  1: 'earth',       // Oak Tree
  2: 'earth',       // Bush
  3: 'monochrome',  // Rock
  4: 'warm',        // House
  5: 'warm',        // Chest
  6: 'earth',       // Barrel
  7: 'cool',        // Potion
  8: 'cool',        // Crystal
  9: 'warm',        // Campfire
};

interface GenerateModalProps {
  onGenerate: (options: RandomGenOptions) => void;
  onClose: () => void;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({ onGenerate, onClose }) => {
  const [options, setOptions] = useState<RandomGenOptions>({
    style: 'humanoid',
    size: 32,
    symmetrical: true,
    colorScheme: 'random',
    complexity: 'medium',
    selectedPoses: [...POSE_SEQUENCE_NAMES],
  });

  const handleGenerate = () => {
    onGenerate(options);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎲 Random Sprite Generator</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Sprite Style</label>
            <div className="style-cards">
              {(['humanoid', 'creature', 'mech', 'abstract', 'object'] as const).map((style) => (
                <button
                  key={style}
                  className={`style-card ${options.style === style ? 'active' : ''}`}
                  onClick={() => {
                    const update: Partial<RandomGenOptions> = { style };
                    if (style === 'object') {
                      update.colorScheme = 'earth';
                      update.objectVariant = undefined;
                    }
                    setOptions({ ...options, ...update });
                  }}
                >
                  <span className="style-icon">
                    {style === 'humanoid' ? '🧑' : style === 'creature' ? '🐉' : style === 'mech' ? '🤖' : style === 'object' ? '🌲' : '🔮'}
                  </span>
                  <span className="style-name">{style.charAt(0).toUpperCase() + style.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Canvas Size</label>
              <select
                value={options.size}
                onChange={(e) => setOptions({ ...options, size: parseInt(e.target.value) })}
              >
                <option value={16}>16×16</option>
                <option value={24}>24×24</option>
                <option value={32}>32×32</option>
                <option value={48}>48×48</option>
                <option value={64}>64×64</option>
              </select>
            </div>

            <div className="form-group">
              <label>Complexity</label>
              <select
                value={options.complexity}
                onChange={(e) => setOptions({ ...options, complexity: e.target.value as any })}
              >
                <option value="simple">Simple</option>
                <option value="medium">Medium</option>
                <option value="complex">Complex</option>
              </select>
            </div>
          </div>

          {options.style === 'object' && (
            <div className="form-group">
              <label>Object Type</label>
              <div className="object-variant-grid">
                {OBJECT_VARIANTS.map((obj) => (
                  <button
                    key={obj.id}
                    className={`object-variant-btn ${options.objectVariant === obj.id ? 'active' : ''}`}
                    onClick={() => setOptions({
                      ...options,
                      objectVariant: obj.id,
                      colorScheme: OBJECT_COLOR_DEFAULTS[obj.id] ?? 'earth',
                    })}
                  >
                    <span className="object-variant-icon">{obj.icon}</span>
                    <span className="object-variant-name">{obj.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {options.style === 'humanoid' && (
            <div className="form-group">
              <label>Character Template <span className="label-hint">(optional)</span></label>
              <div className="template-grid">
                <button
                  className={`template-btn ${!options.template ? 'active' : ''}`}
                  onClick={() => setOptions({ ...options, template: undefined })}
                >
                  <span className="template-icon">🎲</span>
                  <span className="template-name">Random</span>
                </button>
                {TEMPLATE_NAMES.map((key) => {
                  const tmpl = TEMPLATES[key];
                  return (
                    <button
                      key={key}
                      className={`template-btn ${options.template === key ? 'active' : ''}`}
                      onClick={() => setOptions({ ...options, template: key })}
                      title={tmpl.description}
                    >
                      <span className="template-swatch">
                        <span className="swatch-dot" style={{ background: `rgb(${tmpl.regions.tunic[0].r},${tmpl.regions.tunic[0].g},${tmpl.regions.tunic[0].b})` }} />
                        <span className="swatch-dot" style={{ background: `rgb(${tmpl.regions.hair[0].r},${tmpl.regions.hair[0].g},${tmpl.regions.hair[0].b})` }} />
                      </span>
                      <span className="template-name">{tmpl.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Color Scheme</label>
            <div className="scheme-grid">
              {(['random', 'warm', 'cool', 'monochrome', 'complementary', 'earth', 'neon', 'pastel'] as const).map((scheme) => (
                <button
                  key={scheme}
                  className={`scheme-btn ${options.colorScheme === scheme ? 'active' : ''}`}
                  onClick={() => setOptions({ ...options, colorScheme: scheme })}
                >
                  {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={options.symmetrical}
                onChange={(e) => setOptions({ ...options, symmetrical: e.target.checked })}
              />
              Symmetrical
            </label>
          </div>

          {options.style !== 'object' && (
          <div className="form-group">
            <label>Animation Sequences</label>
            <div className="pose-preset-grid">
              <label className="pose-preset-label all-label">
                <input
                  type="checkbox"
                  checked={options.selectedPoses.length === POSE_SEQUENCE_NAMES.length}
                  onChange={(e) => setOptions({
                    ...options,
                    selectedPoses: e.target.checked ? [...POSE_SEQUENCE_NAMES] : [],
                  })}
                />
                All
              </label>
              {POSE_SEQUENCE_NAMES.map((name) => {
                const checked = options.selectedPoses.includes(name);
                return (
                  <label key={name} className="pose-preset-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...options.selectedPoses, name]
                          : options.selectedPoses.filter((n) => n !== name);
                        setOptions({ ...options, selectedPoses: next });
                      }}
                    />
                    {name}
                  </label>
                );
              })}
            </div>
          </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={options.style === 'object' && options.objectVariant === undefined}
            title={options.style === 'object' && options.objectVariant === undefined ? 'Select an object type first' : ''}
          >
            {options.style === 'object' ? '🌲 Generate Object' : '🎲 Generate Sprite'}
          </button>
        </div>
      </div>
    </div>
  );
};
