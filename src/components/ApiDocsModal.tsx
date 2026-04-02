import React from 'react';
import './ApiDocsModal.css';

interface ApiDocsModalProps {
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://p0r6geqh15.execute-api.us-east-2.amazonaws.com/prod';

const EXAMPLE_REQUEST = `{
  "style": "humanoid",
  "size": 32,
  "template": "mage",
  "weapon": "staff",
  "selectedSequences": ["Idle", "Walk", "Attack Slash"],
  "colorOverrides": {
    "tunic": [
      {"r":60, "g":20, "b":90},
      {"r":100,"g":40, "b":140},
      {"r":160,"g":80, "b":200}
    ],
    "accent": [
      {"r":200,"g":180,"b":40},
      {"r":240,"g":220,"b":80}
    ],
    "outline": {"r":30,"g":10,"b":50}
  }
}`;

const EXAMPLE_RESPONSE = `{
  "success": true,
  "spriteSheet": {
    "width": 32,  "height": 32,  "frameCount": 9,
    "frameNames": ["Idle 1","Idle 2",...,"Attack Slash 3"],
    "sequences": [
      { "name": "Idle",         "frameIndices": [0,1,2] },
      { "name": "Walk",         "frameIndices": [3,4,5,6] },
      { "name": "Attack Slash", "frameIndices": [7,8] }
    ]
  },
  "frames": ["data:image/png;base64,...", ...],
  "sheet":  "data:image/png;base64,..."
}`;

const EXAMPLE_DRAW = `{
  "sprite": { "width": 32, "height": 32,
    "frames": [{ "name": "Frame 1",
      "layers": [{ "name": "Layer 1",
        "visible": true, "opacity": 1, "pixels": {} }] }] },
  "frameIndex": 0,
  "layerIndex": 0,
  "operations": [
    { "tool": "pencil", "color": [255,0,0,255],
      "points": [[5,5],[6,5],[7,5]], "brushSize": 1 },
    { "tool": "rect", "color": [0,0,255,255],
      "x1": 10, "y1": 10, "x2": 20, "y2": 20, "filled": true },
    { "tool": "circle", "color": [0,255,0,255],
      "cx": 16, "cy": 16, "radius": 6, "filled": false }
  ]
}`;

const EXAMPLE_CYCLE = `{
  "sprite": { ... },
  "frameIndex": 0,
  "layerIndex": 0,
  "operations": [{
    "tool": "pencil",
    "points": [[0,16],[1,16],[2,16],[3,16],[4,16],[5,16],[6,16]],
    "colorCycle": [
      [255,0,0,255], [255,127,0,255], [255,255,0,255],
      [0,255,0,255], [0,0,255,255], [75,0,130,255], [148,0,211,255]
    ]
  }]
}`;

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="api-docs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔌 API &amp; Agent Integration</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Quick links */}
          <div className="api-section">
            <h3>Quick Links</h3>
            <div className="api-link-row">
              <a
                className="api-link-btn"
                href={`${API_BASE}/docs`}
                target="_blank"
                rel="noopener noreferrer"
              >
                📘 Swagger UI (Try it live)
              </a>
              <a
                className="api-link-btn"
                href={`${API_BASE}/openapi.yaml`}
                target="_blank"
                rel="noopener noreferrer"
              >
                📄 OpenAPI Spec
              </a>
            </div>
          </div>

          {/* Endpoint */}
          <div className="api-section">
            <h3>Endpoints</h3>
            <div className="api-endpoint-box">
              <span className="api-method post">POST</span>
              <span className="api-url">{API_BASE}/generate</span>
            </div>
            <p>Generate a sprite from templates, styles, and color overrides.</p>

            <div className="api-endpoint-box">
              <span className="api-method post">POST</span>
              <span className="api-url">{API_BASE}/draw</span>
            </div>
            <p>Apply drawing operations (pencil, eraser, fill, line, rect, circle) to a sprite.</p>

            <div className="api-endpoint-box">
              <span className="api-method post">POST</span>
              <span className="api-url">{API_BASE}/import</span>
            </div>
            <p>Import a base64 PNG image as a sprite.</p>

            <div className="api-endpoint-box">
              <span className="api-method post">POST</span>
              <span className="api-url">{API_BASE}/export</span>
            </div>
            <p>Render sprite data to PNG frames and a combined sheet.</p>

            <div className="api-endpoint-box">
              <span className="api-method post">POST</span>
              <span className="api-url">{API_BASE}/layers</span>
            </div>
            <p>Add, delete, duplicate, merge, reorder, rename layers, or set visibility/opacity.</p>

            <div className="api-endpoint-box">
              <span className="api-method post">POST</span>
              <span className="api-url">{API_BASE}/frames</span>
            </div>
            <p>Add, delete, or duplicate animation frames.</p>

            <div className="api-endpoint-box">
              <span className="api-method post">POST</span>
              <span className="api-url">{API_BASE}/resize</span>
            </div>
            <p>Resize the canvas. Pixels outside the new bounds are cropped.</p>
          </div>

          {/* Parameters */}
          <div className="api-section">
            <h3>Request Parameters</h3>
            <table className="api-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>style</code></td>
                  <td>string</td>
                  <td>Yes</td>
                  <td>humanoid · creature · mech · abstract</td>
                </tr>
                <tr>
                  <td><code>size</code></td>
                  <td>int</td>
                  <td>Yes</td>
                  <td>Frame size in px (8–128, square)</td>
                </tr>
                <tr>
                  <td><code>template</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td>adventurer · knight · mage · rogue · warrior · ranger · paladin · necromancer · pirate · robot</td>
                </tr>
                <tr>
                  <td><code>weapon</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td>sword · dagger · bow · staff · none</td>
                </tr>
                <tr>
                  <td><code>selectedSequences</code></td>
                  <td>string[]</td>
                  <td>No</td>
                  <td>Idle · Walk · Jump · Attack Slash · Attack Thrust · Attack Overhead</td>
                </tr>
                <tr>
                  <td><code>colorOverrides</code></td>
                  <td>object</td>
                  <td>No</td>
                  <td>Per-region RGB colors (see below)</td>
                </tr>
                <tr>
                  <td><code>colorScheme</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td>random · warm · cool · monochrome · complementary · earth · neon · pastel</td>
                </tr>
                <tr>
                  <td><code>complexity</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td>simple (4 colors) · medium (6) · complex (8)</td>
                </tr>
                <tr>
                  <td><code>symmetrical</code></td>
                  <td>bool</td>
                  <td>No</td>
                  <td>Mirror horizontally (default: true)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Color overrides */}
          <div className="api-section">
            <h3>Color Override Regions</h3>
            <p>
              Each region accepts 1–3 RGB objects (dark → light gradient).
              The <code>outline</code> region is a single RGB color.
            </p>
            <table className="api-table">
              <thead>
                <tr><th>Region</th><th>Body Area</th></tr>
              </thead>
              <tbody>
                <tr><td><code>hair</code></td><td>Top-of-head pixels</td></tr>
                <tr><td><code>skin</code></td><td>Face and exposed skin</td></tr>
                <tr><td><code>tunic</code></td><td>Main chest / torso armor</td></tr>
                <tr><td><code>arms</code></td><td>Sleeves / arm guards</td></tr>
                <tr><td><code>legs</code></td><td>Trousers / leg armor</td></tr>
                <tr><td><code>feet</code></td><td>Boots / shoes</td></tr>
                <tr><td><code>accent</code></td><td>Belt, trim, decorations</td></tr>
                <tr><td><code>outline</code></td><td>Single outline color</td></tr>
              </tbody>
            </table>
          </div>

          {/* Example request */}
          <div className="api-section">
            <h3>Example Request — "Purple Mage with Staff"</h3>
            <div className="api-code-block">{EXAMPLE_REQUEST}</div>
          </div>

          {/* Example response */}
          <div className="api-section">
            <h3>Example Response</h3>
            <div className="api-code-block">{EXAMPLE_RESPONSE}</div>
            <p>
              Each entry in <code>frames</code> is a <code>data:image/png;base64,…</code> URI.
              Decode and save as PNG files. The <code>sequences</code> array maps animation
              names to frame indices so you can split them in your game engine.
            </p>
          </div>

          {/* AI agent integration */}
          <div className="api-section">
            <h3>🤖 AI Agent Integration</h3>
            <div className="api-tip">
              <strong>For AI agents:</strong> Feed the{' '}
              <a href={`${API_BASE}/openapi.yaml`} target="_blank" rel="noopener noreferrer">
                OpenAPI spec
              </a>{' '}
              to any tool-calling framework (LangChain, CrewAI, OpenAI function calling, etc.)
              to auto-generate the tool schema. The agent translates natural language descriptions
              like "fire mage with orange robes" into the correct API parameters.
            </div>
            <p>
              <strong>How an agent should use this:</strong>
            </p>
            <table className="api-table">
              <thead>
                <tr><th>Step</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Parse user description → extract character type, colors, weapon, animations</td></tr>
                <tr><td>2</td><td><code>POST /generate</code> with a template and color overrides</td></tr>
                <tr><td>3</td><td>If the result needs edits, <code>POST /draw</code> with the returned <code>sprite</code> object</td></tr>
                <tr><td>4</td><td>Or <code>POST /import</code> to bring in a different PNG instead</td></tr>
                <tr><td>5</td><td>Use <code>/layers</code>, <code>/frames</code>, <code>/resize</code> for structural changes</td></tr>
                <tr><td>6</td><td><code>POST /export</code> to get final PNGs at desired scale</td></tr>
              </tbody>
            </table>
            <div className="api-tip">
              <strong>Round-trip pattern:</strong> Every editing endpoint returns a <code>sprite</code>{' '}
              object. Pass it into the next request to chain operations without any server-side state.
            </div>
          </div>

          {/* Draw examples */}
          <div className="api-section">
            <h3>Draw Example — Pencil, Rect, Circle</h3>
            <div className="api-code-block">{EXAMPLE_DRAW}</div>
          </div>

          <div className="api-section">
            <h3>Color Cycle Example — Rainbow Pencil</h3>
            <p>
              Use <code>colorCycle</code> instead of <code>color</code> on the pencil tool.
              Each point uses the next color in the array (wrapping around).
            </p>
            <div className="api-code-block">{EXAMPLE_CYCLE}</div>
          </div>

          {/* Draw tools reference */}
          <div className="api-section">
            <h3>Drawing Tools Reference</h3>
            <table className="api-table">
              <thead>
                <tr><th>Tool</th><th>Required Fields</th><th>Optional</th></tr>
              </thead>
              <tbody>
                <tr><td><code>pencil</code></td><td><code>points</code>, <code>color</code></td><td><code>brushSize</code>, <code>colorCycle</code></td></tr>
                <tr><td><code>eraser</code></td><td><code>points</code></td><td><code>brushSize</code></td></tr>
                <tr><td><code>fill</code></td><td><code>x</code>, <code>y</code>, <code>color</code></td><td>—</td></tr>
                <tr><td><code>line</code></td><td><code>x1</code>, <code>y1</code>, <code>x2</code>, <code>y2</code>, <code>color</code></td><td>—</td></tr>
                <tr><td><code>rect</code></td><td><code>x1</code>, <code>y1</code>, <code>x2</code>, <code>y2</code>, <code>color</code></td><td><code>filled</code></td></tr>
                <tr><td><code>circle</code></td><td><code>cx</code>, <code>cy</code>, <code>radius</code>, <code>color</code></td><td><code>filled</code></td></tr>
              </tbody>
            </table>
          </div>

          {/* Layer actions */}
          <div className="api-section">
            <h3>Layer Actions Reference</h3>
            <table className="api-table">
              <thead>
                <tr><th>Action</th><th>Required Fields</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>add</code></td><td>—</td><td>Add a new empty layer. Optional <code>name</code>.</td></tr>
                <tr><td><code>delete</code></td><td><code>layerIndex</code></td><td>Remove a layer (cannot delete the last one).</td></tr>
                <tr><td><code>duplicate</code></td><td><code>layerIndex</code></td><td>Clone a layer.</td></tr>
                <tr><td><code>merge</code></td><td><code>layerIndex</code> ≥ 1</td><td>Merge the layer down into the one below.</td></tr>
                <tr><td><code>reorder</code></td><td><code>layerIndex</code>, <code>targetIndex</code></td><td>Move a layer to a new position.</td></tr>
                <tr><td><code>rename</code></td><td><code>layerIndex</code>, <code>name</code></td><td>Rename a layer.</td></tr>
                <tr><td><code>visibility</code></td><td><code>layerIndex</code>, <code>visible</code></td><td>Show or hide a layer.</td></tr>
                <tr><td><code>opacity</code></td><td><code>layerIndex</code>, <code>opacity</code></td><td>Set opacity (0–1).</td></tr>
              </tbody>
            </table>
          </div>

          {/* cURL example */}
          <div className="api-section">
            <h3>cURL Quick Test</h3>
            <div className="api-code-block">{`curl -X POST ${API_BASE}/generate \\
  -H "Content-Type: application/json" \\
  -d '{"style":"humanoid","size":32,"template":"knight","weapon":"sword","selectedSequences":["Idle","Walk"]}'`}</div>
          </div>

          {/* Pixel art drawing guide */}
          <div className="api-section">
            <h3>🎨 Pixel Art Drawing Guide (for AI Agents)</h3>
            <p>
              The OpenAPI spec includes a comprehensive guide that teaches AI agents how to
              compose pixel art characters from scratch using the draw tools. It covers:
            </p>
            <table className="api-table">
              <thead>
                <tr><th>Topic</th><th>What it teaches</th></tr>
              </thead>
              <tbody>
                <tr><td>Body proportions</td><td>Head, torso, arms, legs sizing as fractions of canvas size</td></tr>
                <tr><td>Body parts how-to</td><td>How to draw heads (circle), eyes (single pixels), hair styles, wiggly arms, tails, wings</td></tr>
                <tr><td>Non-humanoid shapes</td><td>Blob, spider, snake, bird, mech — what tools to use</td></tr>
                <tr><td>Special effects</td><td>Fire, lightning, aura, smoke using colorCycle and transparency</td></tr>
                <tr><td>Color guidelines</td><td>Outline darkening, shading, skin tones, metal/armor palettes</td></tr>
                <tr><td>Composition workflow</td><td>Step-by-step example drawing a custom creature from description</td></tr>
              </tbody>
            </table>
            <div className="api-tip">
              <strong>Agents:</strong> Read the full guide in the{' '}
              <a href={`${API_BASE}/openapi.yaml`} target="_blank" rel="noopener noreferrer">
                OpenAPI spec
              </a>{' '}
              under "Pixel Art Drawing Guide for AI Agents". It has exact coordinate formulas
              and a worked example for drawing a custom creature with 4 arms and fire effects.
            </div>
            <h4>Humanoid Proportions Quick Reference (32×32 canvas)</h4>
            <table className="api-table">
              <thead>
                <tr><th>Part</th><th>Y range</th><th>Width from center</th></tr>
              </thead>
              <tbody>
                <tr><td>Head</td><td>y=2..8</td><td>±4px</td></tr>
                <tr><td>Neck</td><td>y=8..9</td><td>±1px</td></tr>
                <tr><td>Torso</td><td>y=10..19</td><td>±6px</td></tr>
                <tr><td>Arms</td><td>y=10..17</td><td>at ±7px</td></tr>
                <tr><td>Legs</td><td>y=20..28</td><td>±3px (with 2px gap)</td></tr>
                <tr><td>Feet</td><td>y=29..31</td><td>±3px</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
