import type { ToolOption } from '../../../types'
import './ToolOptionGroup.css'

type ToolOptionGroupProps<Id extends string> = {
  title: string
  className: string
  options: readonly ToolOption<Id>[]
  selected: Id
  onSelect: (id: Id) => void
}

export function ToolOptionGroup<Id extends string>({
  title,
  className,
  options,
  selected,
  onSelect,
}: ToolOptionGroupProps<Id>) {
  return (
    <section className="control-section tool-option-group">
      <div className="section-title">{title}</div>
      <div className={`choice-row ${className}`}>
        {options.map(({ id, label, Icon, iconSize }) => (
          <button
            key={id}
            className={`tool-choice ${selected === id ? 'selected' : ''}`}
            onClick={() => onSelect(id)}
            aria-label={label}
            aria-pressed={selected === id}
            title={label}
          >
            <Icon size={iconSize} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
