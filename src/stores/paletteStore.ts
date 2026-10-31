import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { palette } from '../constants/paint'

type PaletteStore = {
  colors: string[]
  selectedIndex: number
  selectColor: (index: number) => void
  updateSelectedColor: (color: string) => void
}

export const usePaletteStore = create<PaletteStore>()(
  persist(
    (set, get) => ({
      colors: [...palette],
      selectedIndex: 9,
      selectColor: (index) => set({ selectedIndex: index }),
      updateSelectedColor: (color) => {
        const { colors, selectedIndex } = get()
        set({ colors: colors.map((entry, index) => index === selectedIndex ? color : entry) })
      },
    }),
    { name: 'webpainter-color-palette' },
  ),
)
