import React, { useState } from 'react';
import type { RandomGenOptions } from '../types';
import { TEMPLATES, TEMPLATE_NAMES } from '../utils/templates';
import { POSE_SEQUENCE_NAMES } from '../utils/generateSprite';
import './PresetBar.css';

interface PresetBarProps {
  onApplyPreset: (options: RandomGenOptions) => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({ onApplyPreset }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);
  const [size, setSize] = useState(32);
  const [complexity, setComplexity] = useState<RandomGenOptions['complexity']>('medium');
  const [symmetrical, setSymmetrical] = useState(true);
  const [colorScheme, setColorScheme] = useState<RandomGenOptions['colorScheme']>('random');

  const applyPreset = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    onApplyPreset({
      style: 'humanoid',
      size,
      symmetrical,
      colorScheme,
      complexity,
      selectedPoses: [...POSE_SEQUENCE_NAMES],
      template: templateKey,
    });
  };

  const applyRandom = () => {
    setSelectedTemplate(undefined);
    onApplyPreset({
      style: 'humanoid',
      size,
      symmetrical,
      colorScheme,
      complexity,
      selectedPoses: [...POSE_SEQUENCE_NAMES],
    });
  };

  const regenerate = () => {
    onApplyPreset({
      style: 'humanoid',
      size,
      symmetrical,
      colorScheme,
      complexity,
      selectedPoses: [...POSE_SEQUENCE_NAMES],
      template: selectedTemplate,
    });
  };

  return (
    <div className="preset-bar">
      <div className="preset-bar-header" onClick={() => setExpanded(!expanded)}>
        <span className="preset-bar-title">⚔️ Character Presets</span>
        <span className="preset-bar-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="preset-bar-body">
          <div className="preset-chips">
            <button
              className={`preset-chip ${selectedTemplate === undefined ? 'active' : ''}`}
              onClick={applyRandom}
              title="Generate random humanoid"
            >
              <span className="preset-chip-icon">🎲</span>
              <span className="preset-chip-name">Random</span>
            </button>
            {TEMPLATE_NAMES.map((key) => {
              const tmpl = TEMPLATES[key];
              return (
                <button
                  key={key}
                  className={`preset-chip ${selectedTemplate === key ? 'active' : ''}`}
                  onClick={() => applyPreset(key)}
                  title={tmpl.description}
                >
                  <span className="preset-chip-swatch">
                    <span
                      className="swatch-dot"
                      style={{ background: `rgb(${tmpl.regions.tunic[0].r},${tmpl.regions.tunic[0].g},${tmpl.regions.tunic[0].b})` }}
                    />
                  </span>
                  <span className="preset-chip-name">{tmpl.name}</span>
                </button>
              );
            })}
          </div>

          <div className="preset-options">
            <div className="preset-opt">
              <label>Size</label>
              <select value={size} onChange={(e) => setSize(parseInt(e.target.value))}>
                <option value={16}>16×16</option>
                <option value={24}>24×24</option>
                <option value={32}>32×32</option>
                <option value={48}>48×48</option>
                <option value={64}>64×64</option>
              </select>
            </div>
            <div className="preset-opt">
              <label>Detail</label>
              <select value={complexity} onChange={(e) => setComplexity(e.target.value as RandomGenOptions['complexity'])}>
                <option value="simple">Simple</option>
                <option value="medium">Medium</option>
                <option value="complex">Complex</option>
              </select>
            </div>
            <div className="preset-opt">
              <label>Color</label>
              <select value={colorScheme} onChange={(e) => setColorScheme(e.target.value as RandomGenOptions['colorScheme'])}>
                <option value="random">Random</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
                <option value="monochrome">Mono</option>
                <option value="complementary">Complement</option>
                <option value="earth">Earth</option>
                <option value="neon">Neon</option>
                <option value="pastel">Pastel</option>
              </select>
            </div>
            <label className="preset-opt-check">
              <input
                type="checkbox"
                checked={symmetrical}
                onChange={(e) => setSymmetrical(e.target.checked)}
              />
              Sym
            </label>
            <button className="preset-regen-btn" onClick={regenerate} title="Re-generate with current settings">
              🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
