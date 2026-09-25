'use client'

import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/utils/format'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  name?: string
}

/**
 * Text input that displays a comma-formatted number while typing,
 * but always reports a plain numeric value via onChange.
 * Never stores or emits formatted strings — calculations and the
 * database only ever see raw numbers (e.g. 10000, not "10,000").
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onBlur, placeholder, className, disabled, id, name }, ref) => {
    const [display, setDisplay] = useState(value ? formatCurrencyInput(value) : '')
    const [focused, setFocused] = useState(false)

    // Keep display in sync when the underlying value changes externally
    // (e.g. switching to a different bill), but don't fight the user while typing.
    useEffect(() => {
      if (!focused) {
        setDisplay(value ? formatCurrencyInput(value) : '')
      }
    }, [value, focused])

    return (
      <Input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        value={display}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value
          setDisplay(raw)
          onChange(parseCurrencyInput(raw))
        }}
        onBlur={() => {
          setFocused(false)
          const numeric = parseCurrencyInput(display)
          setDisplay(numeric ? formatCurrencyInput(numeric) : '')
          onBlur?.()
        }}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
