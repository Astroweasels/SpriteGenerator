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

interface PixelCanvasProps {
  frame: SpriteFrame;
  width: number;
  height: number;
  currentColor: Color;
  currentTool: Tool;
  gridVisible: boolean;
  zoom: number;
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
  onPixelsChanged,
  onColorPicked,
  onSaveUndo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<[number, number] | null>(null);
  const [previewPixels, setPreviewPixels] = useState<[number, number][]>([]);

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
  }, [frame, width, height, pixelSize, canvasWidth, canvasHeight, gridVisible, previewPixels, currentColor]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeLayer) return;
    const [x, y] = getPixelCoords(e);
    setIsDrawing(true);
    onSaveUndo?.();

    switch (currentTool) {
      case 'pencil': {
        const newPixels = new Map(activeLayer.pixels);
        newPixels.set(pixelKey(x, y), currentColor);
        onPixelsChanged(activeLayer.id, newPixels);
        break;
      }
      case 'eraser': {
        const newPixels = new Map(activeLayer.pixels);
        newPixels.delete(pixelKey(x, y));
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
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeLayer) return;
    const [x, y] = getPixelCoords(e);

    switch (currentTool) {
      case 'pencil': {
        const newPixels = new Map(activeLayer.pixels);
        newPixels.set(pixelKey(x, y), currentColor);
        onPixelsChanged(activeLayer.id, newPixels);
        break;
      }
      case 'eraser': {
        const newPixels = new Map(activeLayer.pixels);
        newPixels.delete(pixelKey(x, y));
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

    setIsDrawing(false);
    setStartPos(null);
    setPreviewPixels([]);
  };

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
        onMouseLeave={() => {
          setIsDrawing(false);
          setStartPos(null);
          setPreviewPixels([]);
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};
