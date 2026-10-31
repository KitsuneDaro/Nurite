import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { usePaintStore } from '../store/usePaintStore';

export const ColorPanel: React.FC = () => {
  const { color, setColor, palette, brushSize, setBrushSize } = usePaintStore();

  return (
    <div className="flex flex-col gap-4 bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-800 text-slate-200">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Color Picker</h2>
        <div className="flex justify-center mb-3">
          {/* react-colorful によるピッカー */}
          <div className="w-full max-w-[220px]">
            <HexColorPicker color={color} onChange={setColor} style={{ width: '100%', height: '160px' }} />
          </div>
        </div>
      </div>

      {/* カラーパレット (ピッカーの下に配置) */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Color Palette</h2>
        <div className="grid grid-cols-8 gap-1.5">
          {palette.map((hex, index) => (
            <button
              key={index}
              onClick={() => setColor(hex)}
              className={`w-full aspect-square rounded-md border transition-transform hover:scale-105 ${color.toLowerCase() === hex.toLowerCase() ? 'border-white ring-2 ring-blue-500 scale-105' : 'border-slate-700'}`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* ブラシサイズスライダー */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Brush Size</span>
          <span className="font-mono text-slate-200">{brushSize}px</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="100" 
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer bg-slate-800 rounded-lg h-2"
        />
      </div>
    </div>
  );
};