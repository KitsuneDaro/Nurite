import { Eraser } from 'lucide-react'
import './EraserToggle.css'

type EraserToggleProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function EraserToggle({ enabled, onChange }: EraserToggleProps) {
  return (
    <button
      className={`eraser-toggle ${enabled ? 'is-on' : ''}`}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
    >
      <Eraser size={18} />
      <span>消しゴム</span>
      <span className={`toggle-track ${enabled ? 'checked' : ''}`}><span /></span>
    </button>
  )
}
