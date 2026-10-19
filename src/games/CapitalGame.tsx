import { useState } from 'react'
import { Quiz } from '../components/Quiz'
import { flagUrl } from '../data/countries'

type Mode = 'capital' | 'pais'

export default function CapitalGame() {
  const [mode, setMode] = useState<Mode>('capital')
  return (
    <Quiz
      gameId={`capitales-${mode}`}
      resetKey={mode}
      title="Capitales"
      subtitle="Relaciona cada país con su capital"
      filter={(c) => !!c.capital}
      question={mode === 'capital' ? '¿Cuál es la capital de…' : '¿De qué país es capital…'}
      toolbar={
        <div className="chips">
          <button className={`chip ${mode === 'capital' ? 'on' : ''}`} onClick={() => setMode('capital')}>
            País → Capital
          </button>
          <button className={`chip ${mode === 'pais' ? 'on' : ''}`} onClick={() => setMode('pais')}>
            Capital → País
          </button>
        </div>
      }
      prompt={(c) =>
        mode === 'capital' ? (
          <div className="prompt-country">
            <img className="flag-small" src={flagUrl(c, 160)} alt="" />
            <span>{c.name}?</span>
          </div>
        ) : (
          <div className="prompt-country">
            <span>{c.capital}?</span>
          </div>
        )
      }
      label={(c) => (mode === 'capital' ? c.capital : c.name)}
    />
  )
}
