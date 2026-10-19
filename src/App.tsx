import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './Home'
import { Loading } from './components/GameLayout'

const games = {
  banderas: lazy(() => import('./games/FlagGame')),
  siluetas: lazy(() => import('./games/SilhouetteGame')),
  rutas: lazy(() => import('./games/RouteGame')),
  capitales: lazy(() => import('./games/CapitalGame')),
  localiza: lazy(() => import('./games/LocateGame')),
  superficie: lazy(() => import('./games/AreaGame')),
  contrarreloj: lazy(() => import('./games/NameAllGame')),
  vecinos: lazy(() => import('./games/NeighborsGame')),
  'que-pais': lazy(() => import('./games/MysteryGame')),
  'todas-banderas': lazy(() => import('./games/AllFlagsGame')),
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        {Object.entries(games).map(([path, Game]) => (
          <Route key={path} path={`/${path}`} element={<Game />} />
        ))}
        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  )
}
