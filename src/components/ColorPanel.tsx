import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { usePaintStore } from '../store/usePaintStore';

export const ColorPanel: React.FC = () => {
  const { currentColor, setCurrentColor, palette, selectedPaletteIndex, selectPaletteIndex } =
    usePaintStore();

  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 text-zinc-300 select-none">
      <h3 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">カラー</h3>
      
      {/* カラーピッカー */}
      <div className="flex justify-center w-full">
        <div className="w-full max-w-[200px]">
          <HexColorPicker color={currentColor} onChange={setCurrentColor} />
        </div>
      </div>

      {/* カラーパレット */}
      <div>
        <label className="text-xs text-zinc-500 font-semibold mb-2 block">スウォッチパレット</label>
        <div className="grid grid-cols-4 gap-2">
          {palette.map((color, index) => (
            <button
              key={index}
              onClick={() => selectPaletteIndex(index)}
              className={`h-9 rounded-lg border-2 transition-all ${
                selectedPaletteIndex === index
                  ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105'
                  : 'border-zinc-700 hover:border-zinc-500'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};