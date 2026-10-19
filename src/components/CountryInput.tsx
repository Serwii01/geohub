import { useState } from 'react'
import { COUNTRIES, findCountry, searchCountries, type Country } from '../data/countries'

interface Props {
  onSubmit: (c: Country) => void
  pool?: Country[]
  exclude?: Set<string>
  placeholder?: string
  disabled?: boolean
  /** Pone el cursor en el campo al aparecer (p. ej. al empezar una ronda nueva) */
  autoFocus?: boolean
}

export function CountryInput({
  onSubmit,
  pool = COUNTRIES,
  exclude,
  placeholder = 'Escribe un país…',
  disabled,
  autoFocus,
}: Props) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const suggestions = searchCountries(text, pool, 8).filter((c) => !exclude?.has(c.code)).slice(0, 6)

  function submit(c: Country | undefined) {
    if (!c || exclude?.has(c.code)) return
    onSubmit(c)
    setText('')
    setActive(0)
  }

  return (
    <div className="country-input">
      <input
        value={text}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            submit(suggestions[active] ?? findCountry(text, pool))
          } else if (e.key === 'Escape') {
            setText('')
          }
        }}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((c, i) => (
            <li
              key={c.code}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault()
                submit(c)
              }}
              onMouseEnter={() => setActive(i)}
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
