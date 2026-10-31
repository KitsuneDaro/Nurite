import { Brush, Palette } from 'lucide-react'
import './MobilePanelNav.css'

export type MobilePanel = 'tools' | 'color' | null

type MobilePanelNavProps = {
  activePanel: MobilePanel
  onPanelSelect: (panel: MobilePanel) => void
}

export function MobilePanelNav({ activePanel, onPanelSelect }: MobilePanelNavProps) {
  function togglePanel(panel: Exclude<MobilePanel, null>) {
    onPanelSelect(activePanel === panel ? null : panel)
  }

  return (
    <nav className="mobile-panel-nav" aria-label="パネル">
      <button
        className={activePanel === 'tools' ? 'active' : ''}
        onClick={() => togglePanel('tools')}
        aria-pressed={activePanel === 'tools'}
      >
        <Brush size={19} />
        <span>ツール</span>
      </button>
      <button
        className={activePanel === 'color' ? 'active' : ''}
        onClick={() => togglePanel('color')}
        aria-pressed={activePanel === 'color'}
      >
        <Palette size={19} />
        <span>カラー</span>
      </button>
    </nav>
  )
}
