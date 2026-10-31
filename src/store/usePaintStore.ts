import { create } from 'zustand';

export type BrushShape = 'round' | 'flat' | 'square';
export type BrushType = 'normal' | 'oil' | 'watercolor';

interface PaintState {
  // Color
  currentColor: string;
  palette: string[];
  setCurrentColor: (color: string) => void;
  updatePaletteColor: (index: number, color: string) => void;
  selectedPaletteIndex: number;
  selectPaletteIndex: (index: number) => void;

  // Tool
  brushShape: BrushShape;
  setBrushShape: (shape: BrushShape) => void;
  brushType: BrushType;
  setBrushType: (type: BrushType) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  isEraser: boolean;
  toggleEraser: () => void;

  // System
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveCanvas: () => void;
  loadCanvas: () => void;

  // Mobile modal state
  isColorModalOpen: boolean;
  setColorModalOpen: (isOpen: boolean) => void;
}

export const usePaintStore = create<PaintState>((set, get) => ({
  currentColor: '#3b82f6',
  palette: ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
  selectedPaletteIndex: 3,
  setCurrentColor: (color) => {
    const { palette, selectedPaletteIndex } = get();
    const newPalette = [...palette];
    newPalette[selectedPaletteIndex] = color;
    set({ currentColor: color, palette: newPalette });
  },
  updatePaletteColor: (index, color) => {
    const { palette, selectedPaletteIndex } = get();
    const newPalette = [...palette];
    newPalette[index] = color;
    set({
      palette: newPalette,
      currentColor: index === selectedPaletteIndex ? color : get().currentColor,
    });
  },
  selectPaletteIndex: (index) => {
    set({
      selectedPaletteIndex: index,
      currentColor: get().palette[index],
    });
  },

  brushShape: 'round',
  setBrushShape: (brushShape) => set({ brushShape }),
  brushType: 'oil',
  setBrushType: (brushType) => set({ brushType }),
  brushSize: 20,
  setBrushSize: (brushSize) => set({ brushSize }),
  isEraser: false,
  toggleEraser: () => set((state) => ({ isEraser: !state.isEraser })),

  canUndo: false,
  canRedo: false,
  undo: () => console.log('Undo triggered'),
  redo: () => console.log('Redo triggered'),
  saveCanvas: () => console.log('Save triggered'),
  loadCanvas: () => console.log('Load triggered'),

  isColorModalOpen: false,
  setColorModalOpen: (isColorModalOpen) => set({ isColorModalOpen }),
}));