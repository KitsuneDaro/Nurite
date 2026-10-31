import { RotateCw } from 'lucide-react'
import './DirectionToggle.css'

type DirectionToggleProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function DirectionToggle({ enabled, onChange }: DirectionToggleProps) {
  return (
    <button
      className={`direction-toggle ${enabled ? 'is-on' : ''}`}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
    >
      <RotateCw size={17} />
      <span>方向追従</span>
      <span className={`toggle-track ${enabled ? 'checked' : ''}`}><span /></span>
    </button>
  )
}
