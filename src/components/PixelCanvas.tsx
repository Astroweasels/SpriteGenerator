import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Color, Tool, SpriteFrame } from '../types';
import {
  pixelKey,
  colorToCSS,
  TRANSPARENT,
  flattenLayers,
  floodFill,
  getLinePixels,
  getRectPixels,
  getCirclePixels,
} from '../utils/spriteUtils';
import './PixelCanvas.css';

interface Selection {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ClipboardData {
  pixels: Map<string, Color>;
  w: number;
  h: number;
}

interface PixelCanvasProps {
  frame: SpriteFrame;
  width: number;
  height: number;
  currentColor: Color;
  currentTool: Tool;
  gridVisible: boolean;
  zoom: number;
  brushSize: number;
  colorCycleEnabled: boolean;
  colorCycleColors: Color[];
  onZoomChange: (zoom: number) => void;
  onPixelsChanged: (layerId: string, pixels: Map<string, Color>) => void;
  onColorPicked?: (color: Color) => void;
  onSaveUndo?: () => void;
}

const CHECKERBOARD_LIGHT = '#cccccc';
const CHECKERBOARD_DARK = '#999999';

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  frame,
  width,
  height,
  currentColor,
  currentTool,
  gridVisible,
  zoom,
  brushSize,
  colorCycleEnabled,
  colorCycleColors,
  onZoomChange,
  onPixelsChanged,
  onColorPicked,
  onSaveUndo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<[number, number] | null>(null);
  const [previewPixels, setPreviewPixels] = useState<[number, number][]>([]);
  const colorCycleIndexRef = useRef(0);

  // Selection state
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectionPreview, setSelectionPreview] = useState<Selection | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [floatingPixels, setFloatingPixels] = useState<Map<string, Color> | null>(null);
  const [floatingOffset, setFloatingOffset] = useState<[number, number]>([0, 0]);
  const [moveStart, setMoveStart] = useState<[number, number] | null>(null);
  const marchOffsetRef = useRef(0);
  const marchAnimRef = useRef<number>(0);

  const pixelSize = zoom;
  const canvasWidth = width * pixelSize;
  const canvasHeight = height * pixelSize;

  const activeLayer = frame.layers.find(l => l.id === frame.activeLayerId);

  const getPixelCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / pixelSize);
      const y = Math.floor((e.clientY - rect.top) / pixelSize);
      return [Math.max(0, Math.min(width - 1, x)), Math.max(0, Math.min(height - 1, y))];
    },
    [pixelSize, width, height]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Checkerboard background
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? CHECKERBOARD_LIGHT : CHECKERBOARD_DARK;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw flattened layers
    const flattened = flattenLayers(frame.layers, width, height);
    for (const [key, color] of flattened) {
      if (color.a === 0) continue;
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = colorToCSS(color);
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }

    // Draw preview pixels (for shapes being drawn)
    if (previewPixels.length > 0) {
      ctx.fillStyle = colorToCSS(currentColor);
      ctx.globalAlpha = 0.5;
      for (const [x, y] of previewPixels) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Grid
    if (gridVisible && pixelSize >= 4) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(canvasWidth, y * pixelSize);
        ctx.stroke();
      }
    }

    // Draw floating pixels (being moved)
    if (floatingPixels) {
      for (const [key, color] of floatingPixels) {
        if (color.a === 0) continue;
        const [fx, fy] = key.split(',').map(Number);
        const wx = fx + floatingOffset[0];
        const wy = fy + floatingOffset[1];
        if (wx >= 0 && wx < width && wy >= 0 && wy < height) {
          ctx.fillStyle = colorToCSS(color);
          ctx.fillRect(wx * pixelSize, wy * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    // Draw selection rectangle (marching ants)
    const sel = selectionPreview || selection;
    if (sel) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        sel.x * pixelSize + 0.5, sel.y * pixelSize + 0.5,
        sel.w * pixelSize - 1, sel.h * pixelSize - 1
      );
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -marchOffsetRef.current;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(
        sel.x * pixelSize + 0.5, sel.y * pixelSize + 0.5,
        sel.w * pixelSize - 1, sel.h * pixelSize - 1
      );
      ctx.restore();
    }
  }, [frame, width, height, pixelSize, canvasWidth, canvasHeight, gridVisible, previewPixels, currentColor, selection, selectionPreview, floatingPixels, floatingOffset]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getDrawColor = useCallback((): Color => {
    if (colorCycleEnabled && colorCycleColors.length > 0) {
      const color = colorCycleColors[colorCycleIndexRef.current % colorCycleColors.length];
      colorCycleIndexRef.current = (colorCycleIndexRef.current + 1) % colorCycleColors.length;
      return color;
    }
    return currentColor;
  }, [colorCycleEnabled, colorCycleColors, currentColor]);

  const commitFloating = useCallback(() => {
    if (!floatingPixels || !activeLayer) return;
    const newPixels = new Map(activeLayer.pixels);
    for (const [key, color] of floatingPixels) {
      const [fx, fy] = key.split(',').map(Number);
      const nx = fx + floatingOffset[0];
      const ny = fy + floatingOffset[1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        newPixels.set(pixelKey(nx, ny), color);
      }
    }
    onPixelsChanged(activeLayer.id, newPixels);
    setFloatingPixels(null);
    setFloatingOffset([0, 0]);
  }, [floatingPixels, floatingOffset, activeLayer, width, height, onPixelsChanged]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeLayer) return;
    const [x, y] = getPixelCoords(e);
    setIsDrawing(true);
    onSaveUndo?.();

    switch (currentTool) {
      case 'pencil': {
        const newPixels = new Map(activeLayer.pixels);
        const drawColor = getDrawColor();
        const half = Math.floor(brushSize / 2);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = x + dx, py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              newPixels.set(pixelKey(px, py), drawColor);
            }
          }
        }
        onPixelsChanged(activeLayer.id, newPixels);
        break;
      }
      case 'eraser': {
        const newPixels = new Map(activeLayer.pixels);
        const half = Math.floor(brushSize / 2);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = x + dx, py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              newPixels.delete(pixelKey(px, py));
            }
          }
        }
        onPixelsChanged(activeLayer.id, newPixels);
        break;
      }
      case 'fill': {
        const newPixels = floodFill(activeLayer.pixels, x, y, currentColor, width, height);
        onPixelsChanged(activeLayer.id, newPixels);
        break;
      }
      case 'eyedropper': {
        const flattened = flattenLayers(frame.layers, width, height);
        const color = flattened.get(pixelKey(x, y)) || TRANSPARENT;
        onColorPicked?.(color.a > 0 ? color : currentColor);
        break;
      }
      case 'line':
      case 'rect':
      case 'circle':
        setStartPos([x, y]);
        break;
      case 'select': {
        commitFloating();
        setSelection(null);
        setSelectionPreview(null);
        setStartPos([x, y]);
        break;
      }
      case 'move': {
        if (selection && !floatingPixels) {
          const lifted = new Map<string, Color>();
          const newPixels = new Map(activeLayer.pixels);
          for (let sy = selection.y; sy < selection.y + selection.h; sy++) {
            for (let sx = selection.x; sx < selection.x + selection.w; sx++) {
              const key = pixelKey(sx, sy);
              const c = activeLayer.pixels.get(key);
              if (c) {
                lifted.set(pixelKey(sx - selection.x, sy - selection.y), c);
                newPixels.delete(key);
              }
            }
          }
          if (lifted.size > 0) {
            onPixelsChanged(activeLayer.id, newPixels);
            setFloatingPixels(lifted);
            setFloatingOffset([selection.x, selection.y]);
          }
        }
        if (selection) {
          setMoveStart([x, y]);
        }
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeLayer) return;
    const [x, y] = getPixelCoords(e);

    switch (currentTool) {
      case 'pencil': {
        const newPixels = new Map(activeLayer.pixels);
        const drawColor = getDrawColor();
        const half = Math.floor(brushSize / 2);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = x + dx, py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              newPixels.set(pixelKey(px, py), drawColor);
            }
          }
        }
        onPixelsChanged(activeLayer.id, newPixels);
        break;
      }
      case 'eraser': {
        const newPixels = new Map(activeLayer.pixels);
        const half = Math.floor(brushSize / 2);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = x + dx, py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              newPixels.delete(pixelKey(px, py));
            }
          }
        }
        onPixelsChanged(activeLayer.id, newPixels);
        break;
      }
      case 'line': {
        if (startPos) {
          setPreviewPixels(getLinePixels(startPos[0], startPos[1], x, y));
        }
        break;
      }
      case 'rect': {
        if (startPos) {
          setPreviewPixels(getRectPixels(startPos[0], startPos[1], x, y, e.shiftKey));
        }
        break;
      }
      case 'circle': {
        if (startPos) {
          const radius = Math.round(Math.sqrt(
            Math.pow(x - startPos[0], 2) + Math.pow(y - startPos[1], 2)
          ));
          setPreviewPixels(getCirclePixels(startPos[0], startPos[1], radius, e.shiftKey));
        }
        break;
      }
      case 'select': {
        if (startPos) {
          const sx = Math.min(startPos[0], x);
          const sy = Math.min(startPos[1], y);
          const ex = Math.max(startPos[0], x);
          const ey = Math.max(startPos[1], y);
          setSelectionPreview({ x: sx, y: sy, w: ex - sx + 1, h: ey - sy + 1 });
        }
        break;
      }
      case 'move': {
        if (moveStart && floatingPixels && selection) {
          const dx = x - moveStart[0];
          const dy = y - moveStart[1];
          if (dx !== 0 || dy !== 0) {
            setFloatingOffset(prev => [prev[0] + dx, prev[1] + dy]);
            setSelection(prev => prev ? { ...prev, x: prev.x + dx, y: prev.y + dy } : null);
            setMoveStart([x, y]);
          }
        }
        break;
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeLayer) return;
    const [x, y] = getPixelCoords(e);

    if (startPos && (currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle')) {
      const newPixels = new Map(activeLayer.pixels);
      let shapePixels: [number, number][] = [];

      switch (currentTool) {
        case 'line':
          shapePixels = getLinePixels(startPos[0], startPos[1], x, y);
          break;
        case 'rect':
          shapePixels = getRectPixels(startPos[0], startPos[1], x, y, e.shiftKey);
          break;
        case 'circle': {
          const radius = Math.round(Math.sqrt(
            Math.pow(x - startPos[0], 2) + Math.pow(y - startPos[1], 2)
          ));
          shapePixels = getCirclePixels(startPos[0], startPos[1], radius, e.shiftKey);
          break;
        }
      }

      for (const [px, py] of shapePixels) {
        if (px >= 0 && px < width && py >= 0 && py < height) {
          newPixels.set(pixelKey(px, py), currentColor);
        }
      }
      onPixelsChanged(activeLayer.id, newPixels);
    }

    // Select tool finalization
    if (currentTool === 'select' && startPos) {
      const sx = Math.min(startPos[0], x);
      const sy = Math.min(startPos[1], y);
      const ex = Math.max(startPos[0], x);
      const ey = Math.max(startPos[1], y);
      if (ex > sx || ey > sy) {
        setSelection({ x: sx, y: sy, w: ex - sx + 1, h: ey - sy + 1 });
      }
      setSelectionPreview(null);
    }

    // Move tool finalization
    if (currentTool === 'move') {
      setMoveStart(null);
    }

    setIsDrawing(false);
    setStartPos(null);
    setPreviewPixels([]);
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      const next = Math.max(2, Math.min(32, zoom + delta));
      if (next !== zoom) onZoomChange(next);
    },
    [zoom, onZoomChange]
  );

  // Marching ants animation
  useEffect(() => {
    if (!selection && !selectionPreview) return;
    const id = setInterval(() => {
      marchOffsetRef.current = (marchOffsetRef.current + 1) % 8;
      draw();
    }, 150);
    return () => clearInterval(id);
  }, [selection, selectionPreview, draw]);

  // Commit floating pixels when switching away from select/move
  useEffect(() => {
    if (currentTool !== 'select' && currentTool !== 'move') {
      commitFloating();
      setSelection(null);
      setSelectionPreview(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool]);

  // Keyboard shortcuts for selection operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeLayer) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Ctrl+C: Copy selection
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selection) {
        e.preventDefault();
        if (floatingPixels) {
          setClipboard({ pixels: new Map(floatingPixels), w: selection.w, h: selection.h });
        } else {
          const copied = new Map<string, Color>();
          for (let sy = selection.y; sy < selection.y + selection.h; sy++) {
            for (let sx = selection.x; sx < selection.x + selection.w; sx++) {
              const c = activeLayer.pixels.get(pixelKey(sx, sy));
              if (c) copied.set(pixelKey(sx - selection.x, sy - selection.y), c);
            }
          }
          setClipboard({ pixels: copied, w: selection.w, h: selection.h });
        }
        return;
      }

      // Ctrl+X: Cut selection
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selection) {
        e.preventDefault();
        onSaveUndo?.();
        if (floatingPixels) {
          setClipboard({ pixels: new Map(floatingPixels), w: selection.w, h: selection.h });
          setFloatingPixels(null);
          setFloatingOffset([0, 0]);
        } else {
          const copied = new Map<string, Color>();
          const newPixels = new Map(activeLayer.pixels);
          for (let sy = selection.y; sy < selection.y + selection.h; sy++) {
            for (let sx = selection.x; sx < selection.x + selection.w; sx++) {
              const key = pixelKey(sx, sy);
              const c = activeLayer.pixels.get(key);
              if (c) {
                copied.set(pixelKey(sx - selection.x, sy - selection.y), c);
                newPixels.delete(key);
              }
            }
          }
          onPixelsChanged(activeLayer.id, newPixels);
          setClipboard({ pixels: copied, w: selection.w, h: selection.h });
        }
        setSelection(null);
        return;
      }

      // Ctrl+V: Paste (only in select/move mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard && (currentTool === 'select' || currentTool === 'move')) {
        e.preventDefault();
        onSaveUndo?.();
        commitFloating();
        setFloatingPixels(new Map(clipboard.pixels));
        setFloatingOffset([0, 0]);
        setSelection({ x: 0, y: 0, w: clipboard.w, h: clipboard.h });
        return;
      }

      // Delete: clear selected pixels
      if (e.key === 'Delete' && selection) {
        e.preventDefault();
        onSaveUndo?.();
        if (floatingPixels) {
          setFloatingPixels(null);
          setFloatingOffset([0, 0]);
        } else {
          const newPixels = new Map(activeLayer.pixels);
          for (let sy = selection.y; sy < selection.y + selection.h; sy++) {
            for (let sx = selection.x; sx < selection.x + selection.w; sx++) {
              newPixels.delete(pixelKey(sx, sy));
            }
          }
          onPixelsChanged(activeLayer.id, newPixels);
        }
        setSelection(null);
        return;
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        commitFloating();
        setSelection(null);
        setSelectionPreview(null);
        return;
      }

      // Arrow keys: nudge selection
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selection) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        if (!floatingPixels) {
          onSaveUndo?.();
          const lifted = new Map<string, Color>();
          const newPixels = new Map(activeLayer.pixels);
          for (let sy = selection.y; sy < selection.y + selection.h; sy++) {
            for (let sx = selection.x; sx < selection.x + selection.w; sx++) {
              const key = pixelKey(sx, sy);
              const c = activeLayer.pixels.get(key);
              if (c) {
                lifted.set(pixelKey(sx - selection.x, sy - selection.y), c);
                newPixels.delete(key);
              }
            }
          }
          onPixelsChanged(activeLayer.id, newPixels);
          setFloatingPixels(lifted);
          setFloatingOffset([selection.x + dx, selection.y + dy]);
          setSelection({ ...selection, x: selection.x + dx, y: selection.y + dy });
        } else {
          setFloatingOffset(prev => [prev[0] + dx, prev[1] + dy]);
          setSelection(prev => prev ? { ...prev, x: prev.x + dx, y: prev.y + dy } : null);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLayer, selection, clipboard, floatingPixels, floatingOffset, commitFloating, onPixelsChanged, onSaveUndo, currentTool, width, height]);

  return (
    <div className="pixel-canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="pixel-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onMouseLeave={() => {
          setIsDrawing(false);
          setStartPos(null);
          setPreviewPixels([]);
          setSelectionPreview(null);
          setMoveStart(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};
