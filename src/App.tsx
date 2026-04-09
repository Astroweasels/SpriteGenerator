import { useState, useCallback, useEffect, useRef } from 'react';
import { GenerateMusicModal, GenerateMusicParams } from './components/GenerateMusicModal';
import type { BackgroundResult } from './utils/generateBackground';
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
  pixelKey,
} from './utils/spriteUtils';
import { generateRandomSprite } from './utils/generateSprite';
import { PixelCanvas } from './components/PixelCanvas';
import type { PixelCanvasHandle } from './components/PixelCanvas';
import { Toolbar } from './components/Toolbar';
import { ColorPalette } from './components/ColorPalette';
import { LayerPanel } from './components/LayerPanel';
import { FramePanel } from './components/FramePanel';
import { AnimationPreview } from './components/AnimationPreview';
import { GenerateModal } from './components/GenerateModal';
import { BackgroundModal } from './components/BackgroundModal';
import { ExportModal } from './components/ExportModal';
import { ApiDocsModal } from './components/ApiDocsModal';
import { HelpModal } from './components/HelpModal';
import { AboutModal } from './components/AboutModal';
import { PresetBar } from './components/PresetBar';
import { importPng } from './utils/importUtils';
import './App.css';

function App() {
  const [spriteSheet, setSpriteSheet] = useState<SpriteSheet>(() => createSpriteSheet(32, 32));
  // Background edit mode state
  const [backgroundEdit, setBackgroundEdit] = useState<{
    result: BackgroundResult;
    layerIndex: number;
    spriteSheetBackup: SpriteSheet;
    activeFrameIndexBackup: number;
    activeSequenceIdBackup: string;
  } | null>(null);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [activeSequenceId, setActiveSequenceId] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<Color>({ r: 0, g: 0, b: 0, a: 255 });
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [gridVisible, setGridVisible] = useState(true);
  const [zoom, setZoom] = useState(16);
  const [brushSize, setBrushSize] = useState(1);
  const [colorCycleEnabled, setColorCycleEnabled] = useState(false);
  const [colorCycleColors, setColorCycleColors] = useState<Color[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [newWidth, setNewWidth] = useState(32);
  const [newHeight, setNewHeight] = useState(32);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [hasSelection, setHasSelection] = useState(false);
  const canvasAreaRef = useRef<HTMLElement>(null);
  const pixelCanvasRef = useRef<PixelCanvasHandle>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  const activeFrame = spriteSheet.frames[activeFrameIndex];

  // Ensure activeSequenceId is always valid
  const effectiveSequenceId = spriteSheet.sequences.find(s => s.id === activeSequenceId)
    ? activeSequenceId
    : spriteSheet.sequences[0]?.id ?? '';

  // ---- Auto-fit zoom to canvas area ----
  const computeFitZoom = useCallback((w: number, h: number) => {
    const el = canvasAreaRef.current;
    if (!el) return Math.max(4, Math.min(16, Math.floor(512 / Math.max(w, h))));
    // account for padding (16px each side) + border (4px)
    const availW = el.clientWidth - 36;
    const availH = el.clientHeight - 36;
    const fitZoom = Math.floor(Math.min(availW / w, availH / h));
    return Math.max(2, Math.min(32, fitZoom));
  }, []);

  // ---- Bottom panel resize drag handlers ----
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = bottomPanelHeight;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartYRef.current - ev.clientY;
      const newH = Math.max(60, Math.min(500, dragStartHeightRef.current + delta));
      setBottomPanelHeight(newH);
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [bottomPanelHeight]);

  // Re-fit zoom when bottom panel height changes
  useEffect(() => {
    // small delay so the layout has reflowed
    const id = setTimeout(() => {
      setZoom(() => computeFitZoom(spriteSheet.width, spriteSheet.height));
    }, 50);
    return () => clearTimeout(id);
  }, [bottomPanelHeight, computeFitZoom, spriteSheet.width, spriteSheet.height]);

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
      else if (e.key === 's' || e.key === 'S') setCurrentTool('select');
      else if (e.key === 'm' || e.key === 'M') setCurrentTool('move');
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

  const handleReorderFrameInSequence = (sequenceId: string, fromPos: number, toPos: number) => {
    setSpriteSheet(ss => {
      const seq = ss.sequences.find(s => s.id === sequenceId);
      if (!seq) return ss;
      if (toPos < 0 || toPos >= seq.frameIds.length) return ss;
      const newFrameIds = [...seq.frameIds];
      const [moved] = newFrameIds.splice(fromPos, 1);
      newFrameIds.splice(toPos, 0, moved);
      // Update active frame index to follow the moved frame
      const movedGlobalIndex = ss.frames.findIndex(f => f.id === moved);
      if (movedGlobalIndex >= 0) setActiveFrameIndex(movedGlobalIndex);
      return {
        ...ss,
        sequences: ss.sequences.map(s =>
          s.id === sequenceId ? { ...s, frameIds: newFrameIds } : s
        ),
      };
    });
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

  const handleCopyToNewSequence = () => {
    if (!activeFrame) return;
    const cloned = cloneFrame(activeFrame);
    const seq = createSequence(`Custom ${spriteSheet.sequences.length + 1}`, [cloned.id]);
    setSpriteSheet(ss => ({
      ...ss,
      frames: [...ss.frames, cloned],
      sequences: [...ss.sequences, seq],
    }));
    setActiveSequenceId(seq.id);
    setActiveFrameIndex(spriteSheet.frames.length);
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
    // auto-fit after a tick so the layout has settled
    requestAnimationFrame(() => setZoom(computeFitZoom(options.size, options.size)));
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
    requestAnimationFrame(() => setZoom(computeFitZoom(newWidth, newHeight)));
  };

  // ---- Resize canvas (preserves existing pixels) ----
  const handleCanvasResize = (w: number, h: number) => {
    setSpriteSheet(prev => ({ ...prev, width: w, height: h }));
    requestAnimationFrame(() => setZoom(computeFitZoom(w, h)));
  };

  // ---- Rotate entire frame 90° clockwise ----
  const handleRotateFrame = () => {
    const frame = spriteSheet.frames[activeFrameIndex];
    if (!frame) return;
    const layer = frame.layers.find(l => l.id === frame.activeLayerId);
    if (!layer) return;
    saveUndo();
    const oldW = spriteSheet.width;
    const oldH = spriteSheet.height;
    const rotated = new Map<string, Color>();
    for (const [key, color] of layer.pixels) {
      const [x, y] = key.split(',').map(Number);
      rotated.set(pixelKey(oldH - 1 - y, x), color);
    }
    setSpriteSheet(prev => ({
      ...prev,
      width: oldH,
      height: oldW,
      frames: prev.frames.map((f, i) => {
        if (i !== activeFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map(l =>
            l.id === frame.activeLayerId ? { ...l, pixels: rotated } : l
          ),
        };
      }),
    }));
    requestAnimationFrame(() => setZoom(computeFitZoom(oldH, oldW)));
  };

  // ---- PNG Import ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportPng = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { pixels, width: pw, height: ph } = await importPng(file, 128);
      saveUndo();
      // Resize canvas to match image
      setSpriteSheet(prev => {
        const frame = prev.frames[activeFrameIndex];
        if (!frame) return prev;
        const layer = frame.layers.find(l => l.id === frame.activeLayerId);
        if (!layer) return prev;
        return {
          ...prev,
          width: pw,
          height: ph,
          frames: prev.frames.map((f, i) => {
            if (i !== activeFrameIndex) return f;
            return {
              ...f,
              layers: f.layers.map(l =>
                l.id === frame.activeLayerId ? { ...l, pixels } : l
              ),
            };
          }),
        };
      });
      requestAnimationFrame(() => setZoom(computeFitZoom(pw, ph)));
    } catch {
      // silently ignore bad files
    }
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  // ---- Music Generation ----
  const handleGenerateMusic = async (params: GenerateMusicParams) => {
    setMusicLoading(true);
    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Failed to generate music');
      const data = await res.json();
      if (data && data.audio && data.format) {
        const link = document.createElement('a');
        link.href = data.audio;
        link.download = `music_${params.style}_${params.mood}.${data.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Music generation failed.');
      }
    } catch (e) {
      alert('Music generation failed.');
    } finally {
      setMusicLoading(false);
      setShowMusicModal(false);
    }
  };

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        style={{ display: 'none' }}
        onChange={handleImportPng}
      />
      <header className="app-header">
        <div className="header-brand">
          <span className="logo">🎮</span>
          <h1>AstroSprite</h1>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={() => setShowNewDialog(true)}>
            📄 New
          </button>
          <button className="header-btn import-btn" onClick={() => fileInputRef.current?.click()}>
            📂 Import PNG
          </button>
          <button className="header-btn export-btn" onClick={() => setShowExportModal(true)}>
            📥 Export
          </button>
          <button className="header-btn generate-btn" onClick={() => setShowGenerateModal(true)}>
            🎲 Generate Sprite
          </button>
          <button className="header-btn" onClick={() => setShowBackgroundModal(true)} style={{ background: 'linear-gradient(135deg, #1a3a22, #2a5a35)' }}>
            🌄 Background
          </button>
          <button className="header-btn" onClick={() => setShowMusicModal(true)}>
            🎼 Music
          </button>
          <button className="header-btn help-btn" onClick={() => setShowHelp(true)}>
                  {showMusicModal && (
                    <GenerateMusicModal
                      onClose={() => setShowMusicModal(false)}
                      onGenerate={handleGenerateMusic}
                      loading={musicLoading}
                    />
                  )}
            ❓ Help
          </button>
          <button className="header-btn api-btn" onClick={() => setShowApiDocs(true)}>
            🔌 API
          </button>
          <button className="header-btn about-btn" onClick={() => setShowAbout(true)}>
            🚀 About
          </button>
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
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        canvasWidth={spriteSheet.width}
        canvasHeight={spriteSheet.height}
        onCanvasResize={handleCanvasResize}
        onRotateSelection={() => pixelCanvasRef.current?.rotateSelection()}
        onRotateFrame={handleRotateFrame}
        hasSelection={hasSelection}
      />

      <PresetBar onApplyPreset={handleGenerate} />

      <div className="app-body">
        <aside className="left-panel">
          <ColorPalette
            currentColor={currentColor}
            onColorChange={setCurrentColor}
            colorCycleEnabled={colorCycleEnabled}
            onColorCycleEnabledChange={setColorCycleEnabled}
            colorCycleColors={colorCycleColors}
            onColorCycleColorsChange={setColorCycleColors}
          />
        </aside>

        <main className="canvas-area" ref={canvasAreaRef}>
          {activeFrame && (
            <PixelCanvas
              ref={pixelCanvasRef}
              frame={activeFrame}
              width={spriteSheet.width}
              height={spriteSheet.height}
              currentColor={currentColor}
              currentTool={currentTool}
              gridVisible={gridVisible}
              zoom={zoom}
              brushSize={brushSize}
              colorCycleEnabled={colorCycleEnabled}
              colorCycleColors={colorCycleColors}
              onZoomChange={setZoom}
              onPixelsChanged={handlePixelsChanged}
              onColorPicked={setCurrentColor}
              onSaveUndo={saveUndo}
              onSelectionChange={setHasSelection}
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

      <div className="resize-handle" onMouseDown={handleResizeStart}>
        <div className="resize-handle-bar" />
      </div>

      <FramePanel
        style={{ height: bottomPanelHeight }}
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
        onReorderFrameInSequence={handleReorderFrameInSequence}
        onRenameFrame={handleRenameFrame}
        onCopyToNewSequence={handleCopyToNewSequence}
      />

      {showGenerateModal && (
        <GenerateModal
          onGenerate={handleGenerate}
          onClose={() => setShowGenerateModal(false)}
        />
      )}

      {showBackgroundModal && (
        <BackgroundModal
          onClose={() => setShowBackgroundModal(false)}
          onEditBackgroundLayer={(
            result: BackgroundResult,
            layerIndex: number
          ) => {
            // Backup current sprite sheet and state
            setBackgroundEdit({
              result,
              layerIndex,
              spriteSheetBackup: spriteSheet,
              activeFrameIndexBackup: activeFrameIndex,
              activeSequenceIdBackup: activeSequenceId,
            });
            // Convert background layers to frames/layers for editing
            const frames = result.layers.map((layer, i) => ({
              id: `bg-frame-${i}`,
              name: layer.name,
              layers: [{
                id: `bg-layer-${i}`,
                name: layer.name,
                pixels: new Map(), // Will be filled by importPng below
                visible: true,
                opacity: 1,
              }],
              activeLayerId: `bg-layer-${i}`,
            }));
            // Import each PNG into the frame's layer
            Promise.all(result.layers.map(async (layer, i) => {
              const res = await fetch(layer.dataUrl);
              const blob = await res.blob();
              const file = new File([blob], `${layer.name}.png`, { type: 'image/png' });
              const { pixels } = await importPng(file, result.width);
              frames[i].layers[0].pixels = pixels;
            })).then(() => {
              setSpriteSheet({
                frames,
                sequences: [{
                  id: 'bg-seq',
                  name: 'Background Layers',
                  frameIds: frames.map(f => f.id),
                }],
                width: result.width,
                height: result.height,
              });
              setActiveFrameIndex(layerIndex);
              setActiveSequenceId('bg-seq');
              setShowBackgroundModal(false);
            });
          }}
        />
      )}
      {/* Show return to backgrounds button in background edit mode */}
      {backgroundEdit && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <button
            style={{ padding: '8px 20px', fontSize: 16, background: '#3355aa', color: '#fff', border: 'none', borderRadius: 8, boxShadow: '0 2px 8px #0006', cursor: 'pointer' }}
            onClick={() => {
              // Optionally, update the backgroundEdit.result with new data from spriteSheet
              // For now, just restore previous state
              setSpriteSheet(backgroundEdit.spriteSheetBackup);
              setActiveFrameIndex(backgroundEdit.activeFrameIndexBackup);
              setActiveSequenceId(backgroundEdit.activeSequenceIdBackup);
              setBackgroundEdit(null);
              setShowBackgroundModal(true);
            }}
          >
            ← Return to Backgrounds
          </button>
        </div>
      )}

      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}

      {showApiDocs && (
        <ApiDocsModal onClose={() => setShowApiDocs(false)} />
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
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
              <div className="form-group">
                <label style={{ fontSize: '12px', color: '#8888aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presets</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: '32×32 Sprite', w: 32, h: 32 },
                    { label: '64×64 Sprite', w: 64, h: 64 },
                    { label: '160×90 BG', w: 160, h: 90 },
                    { label: '320×180 BG', w: 320, h: 180 },
                    { label: '640×180 BG', w: 640, h: 180 },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setNewWidth(p.w); setNewHeight(p.h); }}
                      style={{
                        padding: '6px 12px', border: '1px solid #333355', borderRadius: '6px',
                        background: newWidth === p.w && newHeight === p.h ? '#3355aa' : '#1a1a2e',
                        color: newWidth === p.w && newHeight === p.h ? '#fff' : '#aaaacc',
                        cursor: 'pointer', fontSize: '12px',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
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
                    <option value={160}>160</option>
                    <option value={320}>320</option>
                    <option value={640}>640</option>
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
                    <option value={90}>90</option>
                    <option value={128}>128</option>
                    <option value={180}>180</option>
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
