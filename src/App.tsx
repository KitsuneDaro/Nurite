import React from 'react';
import { PaintTools } from './components/PaintTools';
import { ColorPanel } from './components/ColorPanel';
import { CanvasArea } from './components/CanvasArea';

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* ヘッダーバー */}
      <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur">
        <h1 className="text-sm font-bold tracking-wide text-slate-200">Shader Paint Studio</h1>
        <div className="text-xs text-slate-400">Oil Paint Impasto Simulation</div>
      </header>

      {/* メインコンテンツ (レスポンシブ対応) */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 max-w-[1800px] w-full mx-auto">
        {/* PC用左サイドバー / スマホ用では下に並ぶ */}
        <aside className="order-2 lg:order-1 flex flex-col gap-4">
          <PaintTools />
        </aside>

        {/* 中央キャンバス */}
        <section className="order-1 lg:order-2 flex flex-col">
          <CanvasArea />
        </section>

        {/* PC用右サイドバー / スマホ用では上部（またはツール下）に並ぶ */}
        <aside className="order-3 lg:order-3 flex flex-col gap-4">
          <ColorPanel />
        </aside>
      </main>
    </div>
  );
}

export default App;