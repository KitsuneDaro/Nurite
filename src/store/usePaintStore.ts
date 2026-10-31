import { create } from 'zustand';
import type { BrushShape, BrushType } from '../types';

interface PaintState {
  color: string;
  setColor: (color: string) => void;
  palette: string[];
  brushShape: BrushShape;
  setBrushShape: (shape: BrushShape) => void;
  brushType: BrushType;
  setBrushType: (type: BrushType) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  isEraser: boolean;
  toggleEraser: () => void;
}

export const usePaintStore = create<PaintState>((set) => ({
  color: '#3b82f6',
  setColor: (color) => set({ color }),
  palette: [
    '#ffffff', '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8',
    '#c084fc', '#f472b6', '#94a3b8', '#334155', '#1e293b', '#0f172a', '#000000', '#10b981'
  ],
  brushShape: 'round',
  setBrushShape: (brushShape) => set({ brushShape }),
  brushType: 'oil',
  setBrushType: (brushType) => set({ brushType }),
  brushSize: 30,
  setBrushSize: (brushSize) => set({ brushSize }),
  isEraser: false,
  toggleEraser: () => set((state) => ({ isEraser: !state.isEraser })),
}));