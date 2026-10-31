import type { LucideIcon } from 'lucide-react'
import '../Panel.css'

type PanelHeadingProps = {
  eyebrow: string
  title: string
  actionLabel: string
  ActionIcon: LucideIcon
  className?: string
}

export function PanelHeading({
  eyebrow,
  title,
  actionLabel,
  ActionIcon,
  className = '',
}: PanelHeadingProps) {
  return (
    <div className={`panel-heading ${className}`.trim()}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <button className="icon-button subtle-button" aria-label={actionLabel}>
        <ActionIcon size={17} />
      </button>
    </div>
  )
}
