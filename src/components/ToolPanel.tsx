import React from 'react';
import { usePaintStore } from '../store/usePaintStore';
import type { BrushShape, BrushType } from '../store/usePaintStore';
import { Eraser, Circle, Square, Minus } from 'lucide-react';

export const ToolPanel: React.FC = () => {
  const {
    brushShape,
    setBrushShape,
    brushType,
    setBrushType,
    brushSize,
    setBrushSize,
    isEraser,
    toggleEraser,
  } = usePaintStore();

  const shapes: { id: BrushShape; label: string; icon: React.ReactNode }[] = [
    { id: 'round', label: '丸筆', icon: <Circle size={18} /> },
    { id: 'flat', label: '平筆', icon: <Minus size={18} className="rotate-45" /> },
    { id: 'square', label: '四角筆', icon: <Square size={18} /> },
  ];

  const types: { id: BrushType; label: string }[] = [
    { id: 'normal', label: 'ノーマル' },
    { id: 'oil', label: '油彩（厚塗り）' },
    { id: 'watercolor', label: '水彩' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 border-zinc-800 text-zinc-300 text-sm">
      {/* 消しゴム */}
      <div>
        <button
          onClick={toggleEraser}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
            isEraser
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/20'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
          }`}
        >
          <Eraser size={18} />
          <span>消しゴム</span>
        </button>
      </div>

      <hr className="border-zinc-800" />

      {/* ペン形状 */}
      <div>
        <label className="text-xs text-zinc-500 font-semibold mb-2 block">ブラシ形状</label>
        <div className="grid grid-cols-3 gap-1.5">
          {shapes.map((s) => (
            <button
              key={s.id}
              onClick={() => setBrushShape(s.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg gap-1 transition-colors ${
                brushShape === s.id && !isEraser
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              {s.icon}
              <span className="text-[10px]">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ペン種類 */}
      <div>
        <label className="text-xs text-zinc-500 font-semibold mb-2 block">質感・種類</label>
        <div className="flex flex-col gap-1">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setBrushType(t.id)}
              className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                brushType === t.id && !isEraser
                  ? 'bg-zinc-700 text-white border-l-2 border-blue-500'
                  : 'hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-zinc-800" />

      {/* ペン太さ */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-zinc-500 font-semibold">太さ</label>
          <span className="text-xs font-mono text-zinc-400">{brushSize}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full accent-blue-500 bg-zinc-800 cursor-pointer"
        />
      </div>
    </div>
  );
};