import { Brush, Eraser, Pipette } from 'lucide-react'
import type { ToolType } from '../../../types'
import './ToolTypeSelector.css'

const toolOptions = [
  { id: 'brush', label: '筆', Icon: Brush },
  { id: 'eraser', label: '消しゴム', Icon: Eraser },
  { id: 'eyedropper', label: 'スポイト', Icon: Pipette },
] as const satisfies readonly {
  id: ToolType
  label: string
  Icon: typeof Brush
}[]

type ToolTypeSelectorProps = {
  selected: ToolType
  onChange: (toolType: ToolType) => void
}

export function ToolTypeSelector({ selected, onChange }: ToolTypeSelectorProps) {
  return (
    <fieldset className="tool-type-selector">
      <legend>ツールタイプ</legend>
      <div role="radiogroup" aria-label="ツールタイプ">
        {toolOptions.map(({ id, label, Icon }, index) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected === id}
            tabIndex={selected === id ? 0 : -1}
            className={`tool-type-option ${selected === id ? 'selected' : ''}`}
            onClick={() => onChange(id)}
            onKeyDown={(event) => {
              const nextIndex = event.key === 'ArrowRight' || event.key === 'ArrowDown'
                ? (index + 1) % toolOptions.length
                : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                  ? (index - 1 + toolOptions.length) % toolOptions.length
                  : -1
              if (nextIndex < 0) return
              event.preventDefault()
              const nextOption = toolOptions[nextIndex]
              if (!nextOption) return
              onChange(nextOption.id)
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]
                ?.focus()
            }}
            title={label}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
