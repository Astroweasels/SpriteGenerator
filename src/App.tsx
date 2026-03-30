import { useState, useCallback, useEffect } from 'react';
import type { Color, Tool, SpriteSheet, SpriteFrame, RandomGenOptions } from './types';
import {
  createSpriteSheet,
  createFrame,
  createLayer,
  createSequence,
  cloneFrame,
  cloneLayer,
  blendColor,
  serializeFrame,
  deserializeFrame,
} from './utils/spriteUtils';
import { generateRandomSprite } from './utils/generateSprite';
import { PixelCanvas } from './components/PixelCanvas';
import { Toolbar } from './components/Toolbar';
import { ColorPalette } from './components/ColorPalette';
import { LayerPanel } from './components/LayerPanel';
import { FramePanel } from './components/FramePanel';
import { AnimationPreview } from './components/AnimationPreview';
import { GenerateModal } from './components/GenerateModal';
import { ExportModal } from './components/ExportModal';
import './App.css';

function App() {
  const [spriteSheet, setSpriteSheet] = useState<SpriteSheet>(() => createSpriteSheet(32, 32));
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [activeSequenceId, setActiveSequenceId] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<Color>({ r: 0, g: 0, b: 0, a: 255 });
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [gridVisible, setGridVisible] = useState(true);
  const [zoom, setZoom] = useState(16);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newWidth, setNewWidth] = useState(32);
  const [newHeight, setNewHeight] = useState(32);

  const activeFrame = spriteSheet.frames[activeFrameIndex];

  // Ensure activeSequenceId is always valid
  const effectiveSequenceId = spriteSheet.sequences.find(s => s.id === activeSequenceId)
    ? activeSequenceId
    : spriteSheet.sequences[0]?.id ?? '';

  // ---- Undo/Redo ----
  const saveUndo = useCallback(() => {
    if (!activeFrame) return;
    setUndoStack(prev => [...prev.slice(-49), serializeFrame(activeFrame)]);
    setRedoStack([]);
  }, [activeFrame]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(rs => [...rs, serializeFrame(activeFrame)]);
    setUndoStack(us => us.slice(0, -1));
    const restored = deserializeFrame(prev);
    setSpriteSheet(ss => ({
      ...ss,
      frames: ss.frames.map((f, i) => (i === activeFrameIndex ? restored : f)),
    }));
  }, [undoStack, activeFrame, activeFrameIndex]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(us => [...us, serializeFrame(activeFrame)]);
    setRedoStack(rs => rs.slice(0, -1));
    const restored = deserializeFrame(next);
    setSpriteSheet(ss => ({
      ...ss,
      frames: ss.frames.map((f, i) => (i === activeFrameIndex ? restored : f)),
    }));
  }, [redoStack, activeFrame, activeFrameIndex]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      else if (e.key === 'b' || e.key === 'B') setCurrentTool('pencil');
      else if (e.key === 'e' || e.key === 'E') setCurrentTool('eraser');
      else if (e.key === 'g' || e.key === 'G') setCurrentTool('fill');
      else if (e.key === 'i' || e.key === 'I') setCurrentTool('eyedropper');
      else if (e.key === 'l' || e.key === 'L') setCurrentTool('line');
      else if (e.key === 'r' || e.key === 'R') setCurrentTool('rect');
      else if (e.key === 'c' || e.key === 'C') setCurrentTool('circle');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // ---- Pixel editing ----
  const handlePixelsChanged = useCallback(
    (layerId: string, pixels: Map<string, Color>) => {
      setSpriteSheet(ss => ({
        ...ss,
        frames: ss.frames.map((frame, i) => {
          if (i !== activeFrameIndex) return frame;
          return {
            ...frame,
            layers: frame.layers.map(layer =>
              layer.id === layerId ? { ...layer, pixels } : layer
            ),
          };
        }),
      }));
    },
    [activeFrameIndex]
  );

  // ---- Layer operations ----
  const updateActiveFrame = useCallback(
    (updater: (frame: SpriteFrame) => SpriteFrame) => {
      setSpriteSheet(ss => ({
        ...ss,
        frames: ss.frames.map((f, i) => (i === activeFrameIndex ? updater(f) : f)),
      }));
    },
    [activeFrameIndex]
  );

  const handleAddLayer = () => {
    saveUndo();
    updateActiveFrame(frame => {
      const newLayer = createLayer(`Layer ${frame.layers.length + 1}`);
      return { ...frame, layers: [...frame.layers, newLayer], activeLayerId: newLayer.id };
    });
  };

  const handleDeleteLayer = (id: string) => {
    saveUndo();
    updateActiveFrame(frame => {
      if (frame.layers.length <= 1) return frame;
      const filtered = frame.layers.filter(l => l.id !== id);
      return {
        ...frame,
        layers: filtered,
        activeLayerId: frame.activeLayerId === id ? filtered[filtered.length - 1].id : frame.activeLayerId,
      };
    });
  };

  const handleDuplicateLayer = (id: string) => {
    saveUndo();
    updateActiveFrame(frame => {
      const idx = frame.layers.findIndex(l => l.id === id);
      if (idx < 0) return frame;
      const cloned = cloneLayer(frame.layers[idx]);
      const newLayers = [...frame.layers];
      newLayers.splice(idx + 1, 0, cloned);
      return { ...frame, layers: newLayers, activeLayerId: cloned.id };
    });
  };

  const handleToggleVisibility = (id: string) => {
    updateActiveFrame(frame => ({
      ...frame,
      layers: frame.layers.map(l => (l.id === id ? { ...l, visible: !l.visible } : l)),
    }));
  };

  const handleRenameLayer = (id: string, name: string) => {
    updateActiveFrame(frame => ({
      ...frame,
      layers: frame.layers.map(l => (l.id === id ? { ...l, name } : l)),
    }));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    updateActiveFrame(frame => ({
      ...frame,
      layers: frame.layers.map(l => (l.id === id ? { ...l, opacity } : l)),
    }));
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    saveUndo();
    updateActiveFrame(frame => {
      const idx = frame.layers.findIndex(l => l.id === id);
      if (idx < 0) return frame;
      const newIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= frame.layers.length) return frame;
      const newLayers = [...frame.layers];
      [newLayers[idx], newLayers[newIdx]] = [newLayers[newIdx], newLayers[idx]];
      return { ...frame, layers: newLayers };
    });
  };

  const handleMergeDown = (id: string) => {
    saveUndo();
    updateActiveFrame(frame => {
      const idx = frame.layers.findIndex(l => l.id === id);
      if (idx <= 0) return frame;
      const top = frame.layers[idx];
      const bottom = frame.layers[idx - 1];
      const mergedPixels = new Map(bottom.pixels);
      for (const [key, color] of top.pixels) {
        const existing = mergedPixels.get(key);
        if (existing) {
          mergedPixels.set(key, blendColor(existing, color));
        } else {
          mergedPixels.set(key, color);
        }
      }
      const merged = { ...bottom, pixels: mergedPixels };
      const newLayers = frame.layers.filter((_, i) => i !== idx);
      newLayers[idx - 1] = merged;
      return {
        ...frame,
        layers: newLayers,
        activeLayerId: merged.id,
      };
    });
  };

  const handleClearLayer = (id: string) => {
    saveUndo();
    updateActiveFrame(frame => ({
      ...frame,
      layers: frame.layers.map(l => (l.id === id ? { ...l, pixels: new Map() } : l)),
    }));
  };

  // ---- Frame operations ----
  const handleAddFrame = (sequenceId: string) => {
    const newFrame = createFrame(`Frame ${spriteSheet.frames.length + 1}`);
    setSpriteSheet(ss => ({
      ...ss,
      frames: [...ss.frames, newFrame],
      sequences: ss.sequences.map(s =>
        s.id === sequenceId ? { ...s, frameIds: [...s.frameIds, newFrame.id] } : s
      ),
    }));
    setActiveFrameIndex(spriteSheet.frames.length);
    setActiveSequenceId(sequenceId);
  };

  const handleDuplicateFrame = (index: number) => {
    const original = spriteSheet.frames[index];
    const cloned = cloneFrame(original);
    const newFrames = [...spriteSheet.frames];
    newFrames.splice(index + 1, 0, cloned);
    // Add cloned frame after original in its sequence
    setSpriteSheet(ss => ({
      ...ss,
      frames: newFrames,
      sequences: ss.sequences.map(s => {
        const pos = s.frameIds.indexOf(original.id);
        if (pos < 0) return s;
        const ids = [...s.frameIds];
        ids.splice(pos + 1, 0, cloned.id);
        return { ...s, frameIds: ids };
      }),
    }));
    setActiveFrameIndex(index + 1);
  };

  const handleDeleteFrame = (index: number) => {
    if (spriteSheet.frames.length <= 1) return;
    const frameId = spriteSheet.frames[index].id;
    const newFrames = spriteSheet.frames.filter((_, i) => i !== index);
    setSpriteSheet(ss => ({
      ...ss,
      frames: newFrames,
      sequences: ss.sequences.map(s => ({
        ...s,
        frameIds: s.frameIds.filter(id => id !== frameId),
      })),
    }));
    setActiveFrameIndex(Math.min(activeFrameIndex, newFrames.length - 1));
  };

  const handleReorderFrame = (from: number, to: number) => {
    if (to < 0 || to >= spriteSheet.frames.length) return;
    const newFrames = [...spriteSheet.frames];
    const [moved] = newFrames.splice(from, 1);
    newFrames.splice(to, 0, moved);
    setSpriteSheet(ss => ({ ...ss, frames: newFrames }));
    setActiveFrameIndex(to);
  };

  const handleRenameFrame = (index: number, name: string) => {
    setSpriteSheet(ss => ({
      ...ss,
      frames: ss.frames.map((f, i) => (i === index ? { ...f, name } : f)),
    }));
  };

  // ---- Sequence operations ----
  const handleAddSequence = () => {
    const newFrame = createFrame('Frame 1');
    const seq = createSequence(`Sequence ${spriteSheet.sequences.length + 1}`, [newFrame.id]);
    setSpriteSheet(ss => ({
      ...ss,
      frames: [...ss.frames, newFrame],
      sequences: [...ss.sequences, seq],
    }));
    setActiveSequenceId(seq.id);
    setActiveFrameIndex(spriteSheet.frames.length); // select the new frame
  };

  const handleDeleteSequence = (sequenceId: string) => {
    if (spriteSheet.sequences.length <= 1) return;
    const seq = spriteSheet.sequences.find(s => s.id === sequenceId);
    if (!seq) return;
    // Remove the sequence's frames from the master list
    const idsToRemove = new Set(seq.frameIds);
    // But keep frames that are referenced by other sequences
    for (const otherSeq of spriteSheet.sequences) {
      if (otherSeq.id === sequenceId) continue;
      for (const fid of otherSeq.frameIds) idsToRemove.delete(fid);
    }
    const newFrames = spriteSheet.frames.filter(f => !idsToRemove.has(f.id));
    const newSequences = spriteSheet.sequences.filter(s => s.id !== sequenceId);
    setSpriteSheet(ss => ({ ...ss, frames: newFrames, sequences: newSequences }));
    setActiveSequenceId(newSequences[0].id);
    setActiveFrameIndex(0);
  };

  const handleRenameSequence = (sequenceId: string, name: string) => {
    setSpriteSheet(ss => ({
      ...ss,
      sequences: ss.sequences.map(s => (s.id === sequenceId ? { ...s, name } : s)),
    }));
  };

  // ---- Generation ----
  const handleGenerate = (options: RandomGenOptions) => {
    const generated = generateRandomSprite(options);
    setSpriteSheet(generated);
    setActiveFrameIndex(0);
    setActiveSequenceId(generated.sequences[0]?.id ?? '');
    setUndoStack([]);
    setRedoStack([]);
    setShowGenerateModal(false);
    setZoom(Math.max(4, Math.min(16, Math.floor(512 / options.size))));
  };

  // ---- New canvas ----
  const handleNewCanvas = () => {
    const sheet = createSpriteSheet(newWidth, newHeight);
    setSpriteSheet(sheet);
    setActiveFrameIndex(0);
    setActiveSequenceId(sheet.sequences[0]?.id ?? '');
    setUndoStack([]);
    setRedoStack([]);
    setShowNewDialog(false);
    setZoom(Math.max(4, Math.min(16, Math.floor(512 / Math.max(newWidth, newHeight)))));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="logo">🎮</span>
          <h1>SpriteForge</h1>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={() => setShowNewDialog(true)}>
            📄 New
          </button>
          <button className="header-btn generate-btn" onClick={() => setShowGenerateModal(true)}>
            🎲 Generate Random
          </button>
          <button className="header-btn export-btn" onClick={() => setShowExportModal(true)}>
            📥 Export
          </button>
          <span className="canvas-size">
            {spriteSheet.width}×{spriteSheet.height}
          </span>
        </div>
      </header>

      <Toolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        gridVisible={gridVisible}
        onToggleGrid={() => setGridVisible(!gridVisible)}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <div className="app-body">
        <aside className="left-panel">
          <ColorPalette currentColor={currentColor} onColorChange={setCurrentColor} />
        </aside>

        <main className="canvas-area">
          {activeFrame && (
            <PixelCanvas
              frame={activeFrame}
              width={spriteSheet.width}
              height={spriteSheet.height}
              currentColor={currentColor}
              currentTool={currentTool}
              gridVisible={gridVisible}
              zoom={zoom}
              onPixelsChanged={handlePixelsChanged}
              onColorPicked={setCurrentColor}
              onSaveUndo={saveUndo}
            />
          )}
        </main>

        <aside className="right-panel">
          <AnimationPreview spriteSheet={spriteSheet} activeSequenceId={effectiveSequenceId} />
          {activeFrame && (
            <LayerPanel
              layers={activeFrame.layers}
              activeLayerId={activeFrame.activeLayerId}
              onSelectLayer={(id) =>
                updateActiveFrame(f => ({ ...f, activeLayerId: id }))
              }
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
              onDuplicateLayer={handleDuplicateLayer}
              onToggleVisibility={handleToggleVisibility}
              onRenameLayer={handleRenameLayer}
              onOpacityChange={handleOpacityChange}
              onMoveLayer={handleMoveLayer}
              onMergeDown={handleMergeDown}
              onClearLayer={handleClearLayer}
            />
          )}
        </aside>
      </div>

      <FramePanel
        spriteSheet={spriteSheet}
        activeFrameIndex={activeFrameIndex}
        activeSequenceId={effectiveSequenceId}
        onSelectFrame={setActiveFrameIndex}
        onSelectSequence={setActiveSequenceId}
        onAddFrame={handleAddFrame}
        onAddSequence={handleAddSequence}
        onDeleteSequence={handleDeleteSequence}
        onRenameSequence={handleRenameSequence}
        onDuplicateFrame={handleDuplicateFrame}
        onDeleteFrame={handleDeleteFrame}
        onReorderFrame={handleReorderFrame}
        onRenameFrame={handleRenameFrame}
      />

      {showGenerateModal && (
        <GenerateModal
          onGenerate={handleGenerate}
          onClose={() => setShowGenerateModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          spriteSheet={spriteSheet}
          activeFrameIndex={activeFrameIndex}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showNewDialog && (
        <div className="modal-overlay" onClick={() => setShowNewDialog(false)}>
          <div className="new-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 New Canvas</h2>
              <button className="modal-close" onClick={() => setShowNewDialog(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Width</label>
                  <select value={newWidth} onChange={(e) => setNewWidth(parseInt(e.target.value))}>
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={24}>24</option>
                    <option value={32}>32</option>
                    <option value={48}>48</option>
                    <option value={64}>64</option>
                    <option value={128}>128</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Height</label>
                  <select value={newHeight} onChange={(e) => setNewHeight(parseInt(e.target.value))}>
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={24}>24</option>
                    <option value={32}>32</option>
                    <option value={48}>48</option>
                    <option value={64}>64</option>
                    <option value={128}>128</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewDialog(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleNewCanvas}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
