import React from 'react';
import { usePaintStore } from '../store/usePaintStore';
import { 
  Circle, Square, Minus, 
  Droplet, Paintbrush, Sparkles, 
  Eraser, Undo2, Redo2, Save, FolderOpen 
} from 'lucide-react';

export const PaintTools: React.FC = () => {
  const { 
    brushShape, setBrushShape, 
    brushType, setBrushType, 
    isEraser, toggleEraser 
  } = usePaintStore();

  return (
    <div className="flex flex-col gap-4 bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-800 text-slate-200">
      {/* ツールバータイトル */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Paint Tools</h2>
        
        {/* ブラシ形状 */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">Brush Shapes</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setBrushShape('round')}
              className={`p-2 flex items-center justify-center rounded-lg border ${brushShape === 'round' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
              title="Round Brush"
            >
              <Circle size={18} />
            </button>
            <button 
              onClick={() => setBrushShape('flat')}
              className={`p-2 flex items-center justify-center rounded-lg border ${brushShape === 'flat' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
              title="Flat Brush"
            >
              <Minus size={18} />
            </button>
            <button 
              onClick={() => setBrushShape('square')}
              className={`p-2 flex items-center justify-center rounded-lg border ${brushShape === 'square' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
              title="Square Brush"
            >
              <Square size={18} />
            </button>
          </div>
        </div>

        {/* ペン種類選択 */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">Paint Types</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setBrushType('normal')}
              className={`p-2 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs ${brushType === 'normal' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
            >
              <Paintbrush size={16} />
              <span>Normal</span>
            </button>
            <button 
              onClick={() => setBrushType('oil')}
              className={`p-2 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs ${brushType === 'oil' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
            >
              <Droplet size={16} />
              <span>Oil</span>
            </button>
            <button 
              onClick={() => setBrushType('watercolor')}
              className={`p-2 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs ${brushType === 'watercolor' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
            >
              <Sparkles size={16} />
              <span>Water</span>
            </button>
          </div>
        </div>

        {/* 消しゴムトグル */}
        <div className="mb-3">
          <button 
            onClick={toggleEraser}
            className={`w-full py-2 px-3 flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${isEraser ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'}`}
          >
            <Eraser size={18} />
            <span>Eraser {isEraser ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* システム関連（Undo/Redo、Save/Loadを独立したボタンとして配置） */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">History & Files</h2>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium">
            <Undo2 size={16} /> Undo
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium">
            <Redo2 size={16} /> Redo
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium">
            <Save size={16} /> Save
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium">
            <FolderOpen size={16} /> Load
          </button>
        </div>
      </div>
    </div>
  );
};