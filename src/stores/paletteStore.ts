import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { palette } from '../constants/paint'

type PaletteStore = {
  colors: string[]
  selectedIndex: number
  selectColor: (index: number) => void
  updateSelectedColor: (color: string) => void
  addColor: (color: string) => void
  removeSelectedColor: () => string | null
}

type PersistedPaletteState = Pick<PaletteStore, 'colors' | 'selectedIndex'>

function isPersistedPaletteState(value: unknown): value is PersistedPaletteState {
  return typeof value === 'object'
    && value !== null
    && 'colors' in value
    && Array.isArray(value.colors)
    && value.colors.every((color) => typeof color === 'string')
    && 'selectedIndex' in value
    && typeof value.selectedIndex === 'number'
}

export const usePaletteStore = create<PaletteStore>()(
  persist<PaletteStore, [], [], PersistedPaletteState>(
    (set, get) => ({
      colors: [...palette],
      selectedIndex: 9,
      selectColor: (index) => set({ selectedIndex: index }),
      updateSelectedColor: (color) => {
        const { colors, selectedIndex } = get()
        set({ colors: colors.map((entry, index) => index === selectedIndex ? color : entry) })
      },
      addColor: (color) => {
        const colors = get().colors
        set({ colors: [...colors, color], selectedIndex: colors.length })
      },
      removeSelectedColor: () => {
        const { colors, selectedIndex } = get()
        if (colors.length <= 1) return null

        const nextColors = colors.filter((_, index) => index !== selectedIndex)
        const nextSelectedIndex = Math.min(selectedIndex, nextColors.length - 1)
        set({ colors: nextColors, selectedIndex: nextSelectedIndex })
        return nextColors[nextSelectedIndex]
      },
    }),
    {
      name: 'webpainter-color-palette',
      version: 1,
      migrate: (persistedState, version) => {
        if (!isPersistedPaletteState(persistedState)) {
          return { colors: [...palette], selectedIndex: 9 }
        }

        const hasLegacyDefaultPalette = version === 0
          && persistedState.colors.length === 1
          && persistedState.colors[0].toLowerCase() === '#ff0000'

        return hasLegacyDefaultPalette
          ? { colors: [...palette], selectedIndex: 9 }
          : persistedState
      },
    },
  ),
)
