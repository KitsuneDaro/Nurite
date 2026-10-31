import React from 'react';

export const CanvasArea: React.FC = () => {
  return (
    <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 1024x1024 固定を意識したキャンバス枠のプレースホルダー */}
      <div className="w-full max-w-[600px] aspect-square bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
        <div className="z-10 text-center p-6">
          <p className="text-zinc-400 font-medium text-sm">Three.js 描画キャンバス領域</p>
          <p className="text-zinc-600 text-xs mt-1">内部解像度: 1024 x 1024 px</p>
        </div>
      </div>
    </div>
  );
};