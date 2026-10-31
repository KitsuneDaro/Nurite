import React from 'react';

export const CanvasArea: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden min-h-[400px]">
      <div className="absolute top-3 left-4 text-xs font-mono text-slate-500">
        Canvas: 1024x1024 (1:1)
      </div>
      
      {/* 1024x1024固定を想定した中央のビューポートフレーム */}
      <div className="w-full max-w-[600px] aspect-square bg-slate-900 border border-slate-800 rounded-lg shadow-2xl flex items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
        <span className="text-slate-600 text-sm font-medium z-10">
          Three.js Canvas Render Target (1024x1024)
        </span>
      </div>
    </div>
  );
};