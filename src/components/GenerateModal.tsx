import React, { useState } from 'react';
import type { RandomGenOptions } from '../types';
import { TEMPLATES, TEMPLATE_NAMES } from '../utils/templates';
import './GenerateModal.css';

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
    generatePoses: true,
    poseCount: 4,
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
              {(['humanoid', 'creature', 'mech', 'abstract'] as const).map((style) => (
                <button
                  key={style}
                  className={`style-card ${options.style === style ? 'active' : ''}`}
                  onClick={() => setOptions({ ...options, style })}
                >
                  <span className="style-icon">
                    {style === 'humanoid' ? '🧑' : style === 'creature' ? '🐉' : style === 'mech' ? '🤖' : '🔮'}
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

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={options.generatePoses}
                onChange={(e) => setOptions({ ...options, generatePoses: e.target.checked })}
              />
              Generate Pose Variations (Sprite Sheet)
            </label>
          </div>

          {options.generatePoses && (
            <div className="form-group">
              <label>Number of Poses: {options.poseCount}</label>
              <input
                type="range"
                min="1"
                max="7"
                value={options.poseCount}
                onChange={(e) => setOptions({ ...options, poseCount: parseInt(e.target.value) })}
                className="pose-slider"
              />
              <div className="pose-labels">
                <span>Walk, Arms Up, Crouch, Jump, Attack...</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleGenerate}>
            🎲 Generate Sprite
          </button>
        </div>
      </div>
    </div>
  );
};
