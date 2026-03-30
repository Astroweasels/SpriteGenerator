import React, { useState } from 'react';
import type { Color } from '../types';
import { colorToHex, hexToColor } from '../utils/spriteUtils';
import './ColorPalette.css';

interface ColorPaletteProps {
  currentColor: Color;
  onColorChange: (color: Color) => void;
}

// Comprehensive color palette for pixel art / 2D game sprites
const DEFAULT_PALETTE: string[] = [
  // Greyscale
  '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080',
  '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#f2f2f2', '#ffffff',
  // Reds
  '#330000', '#660000', '#990000', '#cc0000', '#ff0000', '#ff3333',
  '#ff6666', '#ff9999', '#ffcccc',
  // Oranges
  '#331a00', '#663300', '#994d00', '#cc6600', '#ff8000', '#ff9933',
  '#ffb366', '#ffcc99',
  // Yellows
  '#333300', '#666600', '#999900', '#cccc00', '#ffff00', '#ffff33',
  '#ffff66', '#ffff99',
  // Greens
  '#003300', '#006600', '#009900', '#00cc00', '#00ff00', '#33ff33',
  '#66ff66', '#99ff99', '#ccffcc',
  // Cyans
  '#003333', '#006666', '#009999', '#00cccc', '#00ffff', '#33ffff',
  '#66ffff', '#99ffff',
  // Blues
  '#000033', '#000066', '#000099', '#0000cc', '#0000ff', '#3333ff',
  '#6666ff', '#9999ff', '#ccccff',
  // Purples
  '#330033', '#660066', '#990099', '#cc00cc', '#ff00ff', '#ff33ff',
  '#ff66ff', '#ff99ff',
  // Pinks
  '#330019', '#660033', '#99004d', '#cc0066', '#ff0080', '#ff3399',
  '#ff66b3', '#ff99cc',
  // Skin tones
  '#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac', '#ffe0bd',
  // Game essentials
  '#2b1b0e', '#5c3a1e', '#8b6914', '#b8860b', '#daa520', '#ffd700',
  '#7b2d26', '#a0522d', '#cd853f', '#d2691e',
  // Fantasy colors
  '#1a0533', '#2d0057', '#4b0082', '#6a0dad', '#8a2be2', '#9370db',
  '#7cfc00', '#00fa9a', '#00ced1', '#4169e1', '#dc143c', '#ff4500',
];

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  currentColor,
  onColorChange,
}) => {
  const [customColors, setCustomColors] = useState<string[]>([]);
  const currentHex = colorToHex(currentColor);

  const handleCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const color = hexToColor(hex);
    onColorChange(color);

    if (!customColors.includes(hex) && !DEFAULT_PALETTE.includes(hex)) {
      setCustomColors(prev => [...prev.slice(-11), hex]);
    }
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange({ ...currentColor, a: parseInt(e.target.value) });
  };

  return (
    <div className="color-palette">
      <div className="color-current">
        <div
          className="color-preview"
          style={{ backgroundColor: colorToHex(currentColor), opacity: currentColor.a / 255 }}
        />
        <div className="color-info">
          <input
            type="color"
            value={currentHex}
            onChange={handleCustomColor}
            className="color-picker-input"
            title="Pick custom color"
          />
          <span className="color-hex">{currentHex.toUpperCase()}</span>
        </div>
        <div className="alpha-control">
          <label>A:</label>
          <input
            type="range"
            min="0"
            max="255"
            value={currentColor.a}
            onChange={handleAlphaChange}
            className="alpha-slider"
          />
          <span className="alpha-value">{currentColor.a}</span>
        </div>
      </div>

      <div className="color-grid">
        {DEFAULT_PALETTE.map((hex, i) => (
          <button
            key={`default-${i}`}
            className={`color-swatch ${currentHex === hex ? 'active' : ''}`}
            style={{ backgroundColor: hex }}
            onClick={() => onColorChange(hexToColor(hex))}
            title={hex}
          />
        ))}
        {customColors.map((hex, i) => (
          <button
            key={`custom-${i}`}
            className={`color-swatch custom ${currentHex === hex ? 'active' : ''}`}
            style={{ backgroundColor: hex }}
            onClick={() => onColorChange(hexToColor(hex))}
            title={`Custom: ${hex}`}
          />
        ))}
      </div>
    </div>
  );
};
