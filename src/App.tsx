import React from 'react';
import { Header } from './components/Header';
import { ToolPanel } from './components/ToolPanel';
import { ColorPanel } from './components/ColorPanel';
import { CanvasArea } from './components/CanvasArea';
import { usePaintStore } from './store/usePaintStore';
import { X } from 'lucide-react';

export function App() {
  const { isColorModalOpen, setColorModalOpen } = usePaintStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
      {/* トップナビゲーション */}
      <Header />

      {/* メインレイアウト */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* PC: 左サイドパネル（ツール＆ペン） */}
        <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800 bg-zinc-900 z-10 overflow-y-auto">
          <ToolPanel />
        </aside>

        {/* 中央: キャンバス領域 */}
        <main className="flex-1 flex flex-col relative">
          <CanvasArea />

          {/* スマホ用: ボトムツールバー */}
          <div className="md:hidden bg-zinc-900 border-t border-zinc-800 p-2">
            <ToolPanel />
          </div>
        </main>

        {/* PC: 右サイドパネル（カラー関連） */}
        <aside className="hidden md:flex w-64 flex-col border-l border-zinc-800 bg-zinc-900 z-10 overflow-y-auto">
          <ColorPanel />
        </aside>
      </div>

      {/* スマホ用カラーモーダル */}
      {isColorModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:hidden animate-fade-in">
          <div className="bg-zinc-900 w-full rounded-t-2xl border-t border-zinc-800 p-4 pb-8 relative shadow-2xl">
            <button
              onClick={() => setColorModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-sm font-bold text-zinc-200 mb-4">カラー・パレット選択</h3>
            <ColorPanel />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;