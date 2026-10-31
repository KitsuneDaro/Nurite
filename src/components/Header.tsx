import React from 'react';
import { Undo2, Redo2, Save, FolderOpen, Palette as PaletteIcon } from 'lucide-react';
import { usePaintStore } from '../store/usePaintStore';

export const Header: React.FC = () => {
  const { undo, redo, saveCanvas, loadCanvas, canUndo, canRedo, currentColor, setColorModalOpen } =
    usePaintStore();

  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between text-zinc-200 select-none z-10">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Impasto Paint
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile color preview button */}
        <button
          onClick={() => setColorModalOpen(true)}
          className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700 text-xs"
        >
          <div className="w-4 h-4 rounded-full border border-zinc-600" style={{ backgroundColor: currentColor }} />
          <PaletteIcon size={14} />
        </button>

        <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 hover:bg-zinc-800 rounded-lg disabled:opacity-40 transition-colors"
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 hover:bg-zinc-800 rounded-lg disabled:opacity-40 transition-colors"
          title="Redo"
        >
          <Redo2 size={18} />
        </button>

        <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

        <button
          onClick={saveCanvas}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors"
        >
          <Save size={14} />
          <span className="hidden sm:inline">Save</span>
        </button>
        <button
          onClick={loadCanvas}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors"
        >
          <FolderOpen size={14} />
          <span className="hidden sm:inline">Load</span>
        </button>
      </div>
    </header>
  );
};