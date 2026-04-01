import React from 'react';
import './HelpModal.css';

interface HelpModalProps {
  onClose: () => void;
}

const sections = [
  { id: 'header', label: 'Header Buttons' },
  { id: 'presets', label: 'Preset Bar' },
  { id: 'toolbar', label: 'Drawing Tools' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'colors', label: 'Color Palette' },
  { id: 'layers', label: 'Layers' },
  { id: 'preview', label: 'Animation Preview' },
  { id: 'sequences', label: 'Sequences & Frames' },
  { id: 'export', label: 'Exporting' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts' },
  { id: 'api', label: 'API & Agent Integration' },
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>❓ Help &amp; Guide</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Table of Contents */}
          <div className="help-toc">
            <span className="help-toc-title">Contents</span>
            {sections.map(({ id, label }) => (
              <a key={id} href={`#help-${id}`}>{label}</a>
            ))}
          </div>

          {/* Header Buttons */}
          <div className="help-section" id="help-header">
            <h3>📄 Header Buttons</h3>
            <table className="help-table">
              <thead>
                <tr><th>Button</th><th>What it does</th></tr>
              </thead>
              <tbody>
                <tr><td>📄 New</td><td>Create a blank canvas. Choose width and height (8–128 px).</td></tr>
                <tr><td>📂 Import PNG</td><td>Load a PNG file onto the active layer. The canvas resizes to fit (up to 128×128). Great for tweaking API-generated sprites.</td></tr>
                <tr><td>🎲 Generate Assets</td><td>Open the generator dialog — pick style, size, color scheme, and complexity to auto-create a sprite.</td></tr>
                <tr><td>📥 Export</td><td>Save your work as PNG (single frame, all frames, or sprite sheet).</td></tr>
                <tr><td>❓ Help</td><td>You're here! This guide.</td></tr>
                <tr><td>🔌 API</td><td>View API documentation for developers and AI agents.</td></tr>
                <tr><td>🚀 About</td><td>Learn about the project — why it was built, how it works, and what makes it different.</td></tr>
                <tr><td>🎵 Music</td><td>Toggle procedurally generated ambient music. A volume slider appears when playing.</td></tr>
              </tbody>
            </table>
          </div>

          {/* Preset Bar */}
          <div className="help-section" id="help-presets">
            <h3>🎭 Preset Bar</h3>
            <p>
              The row of character chips below the toolbar. Click any preset (Adventurer, Knight, Mage, etc.)
              to instantly generate a fully animated character with all sequences. A "Random" chip picks a
              random template for you.
            </p>
            <p>
              Use the inline controls to adjust <strong>size</strong>, <strong>complexity</strong>,
              <strong>color scheme</strong>, and <strong>symmetry</strong> before clicking a preset.
              Hit the 🔄 button to regenerate the same preset with new random variations.
            </p>
          </div>

          {/* Drawing Tools */}
          <div className="help-section" id="help-toolbar">
            <h3>🛠️ Drawing Tools</h3>
            <table className="help-table">
              <thead>
                <tr><th>Tool</th><th>Shortcut</th><th>How to use</th></tr>
              </thead>
              <tbody>
                <tr><td>✏️ Pencil</td><td><span className="help-kbd">B</span></td><td>Click or drag to draw pixels in the current color.</td></tr>
                <tr><td>🧹 Eraser</td><td><span className="help-kbd">E</span></td><td>Click or drag to erase pixels (make transparent).</td></tr>
                <tr><td>🪣 Fill</td><td><span className="help-kbd">G</span></td><td>Click to flood-fill a contiguous region with the current color.</td></tr>
                <tr><td>💧 Eyedropper</td><td><span className="help-kbd">I</span></td><td>Click any pixel to pick its color as the current color.</td></tr>
                <tr><td>📏 Line</td><td><span className="help-kbd">L</span></td><td>Click and drag to draw a straight line.</td></tr>
                <tr><td>⬜ Rectangle</td><td><span className="help-kbd">R</span></td><td>Click and drag to draw a rectangle outline.</td></tr>
                <tr><td>⭕ Circle</td><td><span className="help-kbd">C</span></td><td>Click and drag to draw a circle outline.</td></tr>
                <tr><td>⬚ Select</td><td><span className="help-kbd">S</span></td><td>Click and drag to select a rectangular region.</td></tr>
                <tr><td>✥ Move</td><td><span className="help-kbd">M</span></td><td>Drag to move selected pixels. Lifts pixels on first drag.</td></tr>
              </tbody>
            </table>
            <p>
              The toolbar also has <strong>Undo / Redo</strong> buttons, a <strong>grid toggle</strong>
              (the ⊞ icon), and a <strong>zoom dropdown</strong> showing the current pixel zoom level.
            </p>
            <p>
              <strong>Brush Size:</strong> When the Pencil or Eraser is selected, a "Brush" section
              appears with five size buttons (1×1 up to 5×5). Click one to paint or erase in larger
              square blocks — handy for filling large areas quickly.
            </p>
            <p>
              <strong>Canvas Size:</strong> In the View section you'll find width and height controls
              (8–128 px, in steps of 8). Changing the size preserves your existing pixels — the canvas
              simply grows or shrinks around them.
            </p>
          </div>

          {/* Canvas */}
          <div className="help-section" id="help-canvas">
            <h3>🖼️ Canvas</h3>
            <p>
              The main drawing area in the center. This is where your sprite appears. The checkerboard
              pattern represents transparent pixels.
            </p>
            <p>
              <strong>Zoom:</strong> Use the <strong>scroll wheel</strong> while hovering over the canvas
              to zoom in and out. The zoom level is also shown in the toolbar dropdown.
            </p>
            <p>
              The canvas auto-fits when you generate a sprite or resize the bottom panel. You can drag
              the <strong>resize handle</strong> (the horizontal bar between the canvas and the
              sequences panel) up or down to give more room to either area.
            </p>
          </div>

          {/* Color Palette */}
          <div className="help-section" id="help-colors">
            <h3>🎨 Color Palette</h3>
            <p>
              The left panel shows your color picker. Click the large color square or use the sliders
              to choose your drawing color. The currently selected color is shown at the top.
            </p>
            <div className="help-tip">
              <strong>Tip:</strong> Use the 💧 Eyedropper tool (<span className="help-kbd">I</span>)
              to pick a color directly from the canvas.
            </div>
            <h4>🎨 Color Cycle</h4>
            <p>
              Enable <strong>Color Cycle</strong> to paint with up to 7 colors in sequence. When you
              drag with the pencil tool, each brush stamp uses the next color in the cycle.
            </p>
            <table className="help-table">
              <thead>
                <tr><th>Control</th><th>What it does</th></tr>
              </thead>
              <tbody>
                <tr><td>ON / OFF</td><td>Toggle color cycling mode</td></tr>
                <tr><td>+ button</td><td>Add the current color to the cycle (max 7)</td></tr>
                <tr><td>Click a slot</td><td>Remove that color from the cycle</td></tr>
                <tr><td>Clear</td><td>Remove all colors from the cycle</td></tr>
              </tbody>
            </table>
          </div>

          {/* Layers */}
          <div className="help-section" id="help-layers">
            <h3>📚 Layers</h3>
            <p>
              Layers are like transparent sheets stacked on top of each other. Draw different parts
              of your sprite on separate layers and edit each independently.
            </p>
            <table className="help-table">
              <thead>
                <tr><th>Control</th><th>What it does</th></tr>
              </thead>
              <tbody>
                <tr><td>👁️</td><td>Toggle layer visibility — hide without deleting</td></tr>
                <tr><td>Opacity slider</td><td>Fade the layer from fully transparent to fully opaque</td></tr>
                <tr><td>↑ ↓ Arrows</td><td>Reorder layers — move above or below others</td></tr>
                <tr><td>⧉ Duplicate</td><td>Create a copy of the layer</td></tr>
                <tr><td>⤓ Merge Down</td><td>Combine this layer with the one below it</td></tr>
                <tr><td>🗑️ Clear</td><td>Erase all pixels on this layer</td></tr>
                <tr><td>✕ Delete</td><td>Remove the layer entirely</td></tr>
                <tr><td>+ Add</td><td>Create a new blank transparent layer on top</td></tr>
              </tbody>
            </table>
            <div className="help-tip">
              <strong>Tip:</strong> Layers higher in the list are drawn on top. If you're just doing
              simple edits, you can ignore layers entirely — everything works fine on the single
              default layer.
            </div>
          </div>

          {/* Animation Preview */}
          <div className="help-section" id="help-preview">
            <h3>▶️ Animation Preview</h3>
            <p>
              The small preview box in the top-right shows an animated loop of the currently selected
              sequence. Use this to quickly check how your walk cycle or attack animation looks in motion.
            </p>
          </div>

          {/* Sequences & Frames */}
          <div className="help-section" id="help-sequences">
            <h3>🎬 Sequences &amp; Frames</h3>
            <p>
              The bottom panel organizes your frames into <strong>sequences</strong> (animation groups).
              Each sequence (e.g. "Walk", "Idle", "Attack Slash") contains its own set of frames
              that play as an animation.
            </p>
            <table className="help-table">
              <thead>
                <tr><th>Action</th><th>How</th></tr>
              </thead>
              <tbody>
                <tr><td>Select a frame</td><td>Click any frame thumbnail to edit it on the canvas</td></tr>
                <tr><td>Switch sequence</td><td>Click a sequence row to select it and see its frames</td></tr>
                <tr><td>Add frame</td><td>Click "+ Frame" inside a sequence</td></tr>
                <tr><td>Add sequence</td><td>Click "+ Sequence" at the top of the panel</td></tr>
                <tr><td>Copy to new sequence</td><td>Click "📋 Copy → New Seq" to duplicate the current frame into a new sequence</td></tr>
                <tr><td>Rename</td><td>Click on a sequence or frame name to type a new name</td></tr>
                <tr><td>Reorder frames</td><td>Drag and drop frame thumbnails, or use the ◀ ▶ arrows</td></tr>
                <tr><td>Delete</td><td>Click ✕ on a frame or 🗑️ on a sequence</td></tr>
              </tbody>
            </table>
            <p>
              You can <strong>drag the resize handle</strong> between the canvas and this panel to
              make it taller or shorter.
            </p>
          </div>

          {/* Exporting */}
          <div className="help-section" id="help-export">
            <h3>📥 Exporting</h3>
            <p>
              Click <strong>📥 Export</strong> in the header to save your sprites. You can export:
            </p>
            <table className="help-table">
              <thead>
                <tr><th>Option</th><th>What you get</th></tr>
              </thead>
              <tbody>
                <tr><td>Current Frame</td><td>A single PNG of the frame you're currently editing</td></tr>
                <tr><td>All Frames</td><td>Separate PNG files for every frame (downloaded as individual files)</td></tr>
                <tr><td>Sprite Sheet</td><td>All frames combined into one horizontal strip PNG — ready for game engines</td></tr>
              </tbody>
            </table>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="help-section" id="help-shortcuts">
            <h3>⌨️ Keyboard Shortcuts</h3>
            <table className="help-table">
              <thead>
                <tr><th>Key</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr><td><span className="help-kbd">B</span></td><td>Pencil tool</td></tr>
                <tr><td><span className="help-kbd">E</span></td><td>Eraser tool</td></tr>
                <tr><td><span className="help-kbd">G</span></td><td>Fill tool</td></tr>
                <tr><td><span className="help-kbd">I</span></td><td>Eyedropper tool</td></tr>
                <tr><td><span className="help-kbd">L</span></td><td>Line tool</td></tr>
                <tr><td><span className="help-kbd">R</span></td><td>Rectangle tool</td></tr>
                <tr><td><span className="help-kbd">C</span></td><td>Circle tool</td></tr>
                <tr><td><span className="help-kbd">S</span></td><td>Select tool</td></tr>
                <tr><td><span className="help-kbd">M</span></td><td>Move tool</td></tr>
                <tr><td><span className="help-kbd">Ctrl+C</span></td><td>Copy selected pixels</td></tr>
                <tr><td><span className="help-kbd">Ctrl+X</span></td><td>Cut selected pixels</td></tr>
                <tr><td><span className="help-kbd">Ctrl+V</span></td><td>Paste clipboard (in select/move mode)</td></tr>
                <tr><td><span className="help-kbd">Delete</span></td><td>Clear selected pixels</td></tr>
                <tr><td><span className="help-kbd">Escape</span></td><td>Deselect / commit floating pixels</td></tr>
                <tr><td><span className="help-kbd">Arrow Keys</span></td><td>Nudge selection 1 pixel</td></tr>
                <tr><td><span className="help-kbd">Scroll Wheel</span></td><td>Zoom in / out on canvas</td></tr>
              </tbody>
            </table>
          </div>

          {/* API */}
          <div className="help-section" id="help-api">
            <h3>🔌 API &amp; Agent Integration</h3>
            <p>
              AstroSprite has a full REST API (7 endpoints) that lets AI agents and developers
              generate, draw, import, export, and manage sprites programmatically. Click the{' '}
              <strong>🔌 API</strong> button in the header for full documentation and Swagger UI.
            </p>
            <table className="help-table">
              <thead>
                <tr><th>Endpoint</th><th>Purpose</th></tr>
              </thead>
              <tbody>
                <tr><td><code>POST /generate</code></td><td>Generate sprites from templates, styles, colors</td></tr>
                <tr><td><code>POST /draw</code></td><td>Pencil, eraser, fill, line, rect, circle + color cycle</td></tr>
                <tr><td><code>POST /import</code></td><td>Import a base64 PNG as a sprite</td></tr>
                <tr><td><code>POST /export</code></td><td>Render sprite data to PNG frames & sheet</td></tr>
                <tr><td><code>POST /layers</code></td><td>Add, delete, duplicate, merge, reorder layers</td></tr>
                <tr><td><code>POST /frames</code></td><td>Add, delete, duplicate animation frames</td></tr>
                <tr><td><code>POST /resize</code></td><td>Resize the canvas</td></tr>
              </tbody>
            </table>
            <div className="help-tip">
              <strong>For AI agents:</strong> Every editing endpoint returns a <code>sprite</code>{' '}
              object that can be passed into the next call. Agents can generate → inspect → re-draw
              or re-import → export, all without server-side state.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
