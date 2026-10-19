import { useState } from 'react'
import { Quiz } from '../components/Quiz'
import { flagUrl } from '../data/countries'

type Mode = 'bandera' | 'pais'

export default function FlagGame() {
  const [mode, setMode] = useState<Mode>('bandera')
  return (
    <Quiz
      gameId={mode === 'bandera' ? 'banderas' : 'banderas-inversa'}
      resetKey={mode}
      title="Banderas"
      subtitle={mode === 'bandera' ? '¿De qué país es esta bandera?' : 'Elige la bandera correcta.'}
      optionsClass={mode === 'pais' ? 'flag-options' : undefined}
      toolbar={
        <div className="chips">
          <button className={`chip ${mode === 'bandera' ? 'on' : ''}`} onClick={() => setMode('bandera')}>
            Bandera → País
          </button>
          <button className={`chip ${mode === 'pais' ? 'on' : ''}`} onClick={() => setMode('pais')}>
            País → Bandera
          </button>
        </div>
      }
      prompt={(c) =>
        mode === 'bandera' ? (
          <img className="flag-big" src={flagUrl(c, 640)} alt="Bandera misteriosa" draggable={false} />
        ) : (
          <div className="prompt-country">{c.name}</div>
        )
      }
      label={(c) => (mode === 'bandera' ? c.name : <img src={flagUrl(c, 320)} alt="" draggable={false} />)}
    />
  )
}
