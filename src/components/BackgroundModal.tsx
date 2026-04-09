import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { BackgroundOptions, BackgroundResult, EnvironmentType, TimeOfDay, WeatherType, Topography } from '../utils/generateBackground';
import { generateBackground } from '../utils/generateBackground';
import './BackgroundModal.css';
import './GenerateModal.css'; // reuse shared modal shell styles

interface BackgroundModalProps {
  onClose: () => void;
  onEditBackgroundLayer?: (result: BackgroundResult, layerIndex: number) => void;
}

// ── Environment metadata ──────────────────────────────────────────────────────

const ENVIRONMENTS: { id: EnvironmentType; icon: string; label: string }[] = [
  { id: 'forest',   icon: '🌲', label: 'Forest'   },
  { id: 'desert',   icon: '🏜️',  label: 'Desert'   },
  { id: 'cave',     icon: '🕳️',  label: 'Cave'     },
  { id: 'ocean',    icon: '🌊', label: 'Ocean'    },
  { id: 'ruins',    icon: '🏛️',  label: 'Ruins'    },
  { id: 'tundra',   icon: '🧊', label: 'Tundra'   },
  { id: 'volcanic', icon: '🌋', label: 'Volcanic' },
  { id: 'swamp',    icon: '🐊', label: 'Swamp'    },
  { id: 'plains',   icon: '🌾', label: 'Plains'   },
  { id: 'city',     icon: '🏙️',  label: 'City'     },
];

const TIMES: { id: TimeOfDay; label: string; icon: string }[] = [
  { id: 'day',   label: 'Day',   icon: '☀️' },
  { id: 'dusk',  label: 'Dusk',  icon: '🌅' },
  { id: 'night', label: 'Night', icon: '🌙' },
  { id: 'dawn',  label: 'Dawn',  icon: '🌄' },
];

const WEATHERS: { id: WeatherType; label: string; icon: string }[] = [
  { id: 'clear',  label: 'Clear',  icon: '✨' },
  { id: 'foggy',  label: 'Foggy',  icon: '🌫️' },
  { id: 'stormy', label: 'Storm',  icon: '⛈️' },
  { id: 'snowy',  label: 'Snowy',  icon: '❄️' },
  { id: 'rainy',  label: 'Rainy',  icon: '🌧️' },
];

const TOPOGRAPHIES: { id: Topography; label: string; icon: string }[] = [
  { id: 'flat',      label: 'Flat',      icon: '〰️' },
  { id: 'rolling',   label: 'Rolling',   icon: '🌊' },
  { id: 'mountains', label: 'Mountains', icon: '🏔️' },
  { id: 'jagged',    label: 'Jagged',    icon: '⛰️' },
];

// ── Speed tier for parallax CSS (0=static, 1=slowest, 4=fastest) ─────────────
function speedTier(scale: number): number {
  if (scale === 0) return 0;
  if (scale < 0.2) return 1;
  if (scale < 0.4) return 2;
  if (scale < 0.65) return 3;
  return 4;
}

// ── Download helpers ──────────────────────────────────────────────────────────

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function downloadZip(result: BackgroundResult, env: string): void {
  result.layers.forEach((layer, i) => {
    setTimeout(() => downloadDataUrl(layer.dataUrl, `${env}_${layer.name}.png`), i * 150);
  });
  setTimeout(() => downloadDataUrl(result.composite, `${env}_composite.png`), result.layers.length * 150);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BackgroundModal: React.FC<BackgroundModalProps> = ({ onClose, onEditInCanvas }) => {
  const [opts, setOpts] = useState<BackgroundOptions>({
    environment: 'forest',
    timeOfDay: 'day',
    weather: 'clear',
    layerCount: 4,
    pixelSize: 2,
    density: 'medium',
    tileable: true,
    outputWidth: 320,
  });

  const [result, setResult] = useState<BackgroundResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showGodot, setShowGodot] = useState(false);
  const [copied, setCopied] = useState(false);
  const genIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGenerate = useCallback((options: BackgroundOptions) => {
    setGenerating(true);
    const id = ++genIdRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (genIdRef.current !== id) return;
        try {
          const bg = generateBackground(options);
          setResult(bg);
        } finally {
          setGenerating(false);
        }
      });
    });
  }, []);

  // Auto-generate whenever options change (debounced 80ms)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleGenerate(opts), 80);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [opts, handleGenerate]);

  const handleCopyGodot = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.godotScene).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const set = <K extends keyof BackgroundOptions>(key: K, val: BackgroundOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: val }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bg-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🌄 Background Generator</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Environment */}
          <div className="form-group">
            <label>Environment</label>
            <div className="env-grid">
              {ENVIRONMENTS.map(env => (
                <button
                  key={env.id}
                  className={`env-btn ${opts.environment === env.id ? 'active' : ''}`}
                  onClick={() => set('environment', env.id)}
                >
                  <span className="env-icon">{env.icon}</span>
                  <span className="env-name">{env.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time of day */}
          <div className="form-group">
            <label>Time of Day</label>
            <div className="time-row">
              {TIMES.map(t => (
                <button
                  key={t.id}
                  className={`option-btn ${opts.timeOfDay === t.id ? 'active' : ''}`}
                  onClick={() => set('timeOfDay', t.id)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div className="form-group">
            <label>Weather</label>
            <div className="weather-row">
              {WEATHERS.map(w => (
                <button
                  key={w.id}
                  className={`option-btn ${opts.weather === w.id ? 'active' : ''}`}
                  onClick={() => set('weather', w.id)}
                >
                  {w.icon} {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topography */}
          {opts.environment !== 'cave' && opts.environment !== 'city' && (
            <div className="form-group">
              <label>Topography <span className="label-hint">(overrides biome default)</span></label>
              <div className="time-row">
                {TOPOGRAPHIES.map(t => (
                  <button
                    key={t.id}
                    className={`option-btn ${(opts.topography ?? '') === t.id ? 'active' : ''}`}
                    onClick={() => set('topography', opts.topography === t.id ? undefined : t.id)}
                    title={opts.topography === t.id ? 'Click to reset to biome default' : ''}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls row */}
          <div className="control-row">
            <div className="control-group">
              <label>Layers</label>
              <div className="btn-row">
                {([2, 3, 4] as const).map(n => (
                  <button
                    key={n}
                    className={`option-btn ${opts.layerCount === n ? 'active' : ''}`}
                    onClick={() => set('layerCount', n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Pixel Size</label>
              <div className="btn-row">
                {([2, 4] as const).map(s => (
                  <button
                    key={s}
                    className={`option-btn ${opts.pixelSize === s ? 'active' : ''}`}
                    onClick={() => set('pixelSize', s)}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Density</label>
              <div className="btn-row">
                {(['sparse', 'medium', 'dense'] as const).map(d => (
                  <button
                    key={d}
                    className={`option-btn ${opts.density === d ? 'active' : ''}`}
                    onClick={() => set('density', d)}
                    style={{ fontSize: '11px' }}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output width + tileable */}
          <div className="control-row">
            <div className="control-group">
              <label>Output Width</label>
              <div className="btn-row">
                {([160, 320, 640] as const).map(w => (
                  <button
                    key={w}
                    className={`option-btn ${opts.outputWidth === w ? 'active' : ''}`}
                    onClick={() => set('outputWidth', w)}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Tileable</label>
              <div className="btn-row">
                <button
                  className={`option-btn ${opts.tileable ? 'active' : ''}`}
                  onClick={() => set('tileable', true)}
                >
                  Yes
                </button>
                <button
                  className={`option-btn ${!opts.tileable ? 'active' : ''}`}
                  onClick={() => set('tileable', false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="form-group">
            <label>Preview</label>
            <div className={`bg-preview-area ${!result ? 'empty' : ''}`}>
              {!result && !generating && (
                <span>Hit Generate to see your background</span>
              )}
              {generating && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span className="bg-generating">Generating…</span>
                </div>
              )}
              {result && !generating && (
                <div className="bg-parallax-preview">
                  {result.layers.map((layer, i) => (
                    <div
                      key={i}
                      className="bg-parallax-layer"
                      data-speed={speedTier(layer.parallaxScale)}
                      style={{
                        backgroundImage: `url(${layer.dataUrl})`,
                        zIndex: i,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Layer thumbnails */}
          {result && !generating && (
            <div className="form-group">
              <div className="section-label">Individual Layers</div>
              <div className="layer-thumbs">
                {result.layers.map(layer => (
                  <div key={layer.name} className="layer-thumb">
                    <img
                      src={layer.dataUrl}
                      alt={layer.name}
                      style={{ border: '1px solid #44aa88', cursor: 'pointer' }}
                      onClick={() => downloadDataUrl(layer.dataUrl, `${opts.environment}_${layer.name}.png`)}
                      title="Click to download"
                    />
                    <span className="layer-thumb-label">{layer.name} (×{layer.parallaxScale.toFixed(2)})</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="copy-btn"
                        style={{ fontSize: '10px', padding: '3px 8px' }}
                        onClick={() => downloadDataUrl(layer.dataUrl, `${opts.environment}_${layer.name}.png`)}
                      >
                        ⬇ PNG
                      </button>
                      {onEditBackgroundLayer && (
                        <button
                          className="copy-btn"
                          style={{ fontSize: '10px', padding: '3px 8px', borderColor: '#44aa88', color: '#88ddaa' }}
                          onClick={() => onEditBackgroundLayer(result, result.layers.findIndex(l => l.name === layer.name))}
                          title="Edit this layer in the main editor"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          {result && !generating && (
            <div className="form-group">
              <div className="section-label">Export</div>
              <div className="export-row">
                <button
                  className="btn-secondary"
                  onClick={() => downloadDataUrl(result.composite, `${opts.environment}_composite.png`)}
                >
                  📥 Composite PNG
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { downloadZip(result, opts.environment); }}
                >
                  🗜️ All Layers (ZIP)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowGodot(g => !g)}
                >
                  🎮 Godot Scene
                </button>
              </div>
            </div>
          )}

          {/* Godot scene snippet */}
          {result && showGodot && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div className="section-label" style={{ marginBottom: 0 }}>Godot ParallaxBackground Snippet</div>
                <button className="copy-btn" onClick={handleCopyGodot}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <div className="godot-snippet">{result.godotScene}</div>
            </div>
          )}

        </div>

        <div className="modal-footer">
          {generating && <span className="bg-generating" style={{ marginRight: 'auto' }}>Updating…</span>}
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
