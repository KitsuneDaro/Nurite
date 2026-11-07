import { useEffect, useRef, useState } from 'react'
import type { ToolOption } from '../../../types'
import './ToolOptionGroup.css'

type ToolOptionGroupProps<Id extends string> = {
  title: string
  className: string
  options: readonly ToolOption<Id>[]
  selected: Id
  onSelect: (id: Id) => void
  unavailable?: readonly Id[]
}

export function ToolOptionGroup<Id extends string>({
  title,
  className,
  options,
  selected,
  onSelect,
  unavailable = [],
}: ToolOptionGroupProps<Id>) {
  const [shakingOption, setShakingOption] = useState<Id | null>(null)
  const animationFrame = useRef<number | null>(null)
  const shakeTimeout = useRef<number | null>(null)

  useEffect(() => () => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current)
    if (shakeTimeout.current !== null) window.clearTimeout(shakeTimeout.current)
  }, [])

  const handleSelect = (id: Id, isUnavailable: boolean) => {
    if (!isUnavailable) {
      onSelect(id)
      return
    }

    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current)
    if (shakeTimeout.current !== null) window.clearTimeout(shakeTimeout.current)
    setShakingOption(null)
    animationFrame.current = requestAnimationFrame(() => {
      setShakingOption(id)
      shakeTimeout.current = window.setTimeout(() => setShakingOption(null), 420)
    })
  }

  return (
    <section className="control-section tool-option-group">
      <div className="section-title">{title}</div>
      <div className={`choice-row ${className}`}>
        {options.map(({ id, label, Icon, iconSize }) => {
          const isUnavailable = unavailable.includes(id)
          const unavailableLabel = `${label}（開発中のため使用できません）`
          return (
            <button
              key={id}
              className={[
                'tool-choice',
                selected === id ? 'selected' : '',
                isUnavailable ? 'unavailable' : '',
                shakingOption === id ? 'unavailable-shake' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleSelect(id, isUnavailable)}
              aria-label={isUnavailable ? unavailableLabel : label}
              aria-pressed={selected === id}
              aria-disabled={isUnavailable}
              title={isUnavailable ? unavailableLabel : label}
            >
              <Icon size={iconSize} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
