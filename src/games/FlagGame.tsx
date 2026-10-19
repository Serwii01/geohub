import { Quiz } from '../components/Quiz'
import { flagUrl } from '../data/countries'

export default function FlagGame() {
  return (
    <Quiz
      gameId="banderas"
      title="Banderas"
      icon="flag"
      subtitle="¿De qué país es esta bandera?"
      prompt={(c) => <img className="flag-big" src={flagUrl(c, 640)} alt="Bandera misteriosa" draggable={false} />}
      label={(c) => c.name}
    />
  )
}
