# GeoHub

Hub de juegos de geografía en español. React + TypeScript + Vite, mapas con d3-geo.

## Juegos

| Juego | Descripción |
|---|---|
| Rutas | Estilo travle.earth: conecta dos países por tierra nombrando los intermedios |
| Siluetas | Estilo Worldle: adivina por la forma, con distancia, dirección y % de cercanía |
| Banderas | Bandera → país o país → bandera, con filtro por continente |
| Todas las banderas | Las 194 banderas del mundo en 15 minutos |
| Localiza | Pulsa el país en el mapa (con zoom y arrastre); puntos según la distancia |
| ¿Qué país es? | Un país marcado en el mapa: escribe cuál es |
| Vecinos | Nombra todos los países con los que hace frontera |
| Capitales | País → capital o capital → país |
| ¿Más grande? | Más grande / más pequeño por superficie, modo racha |
| Contrarreloj | Nombra todos los países de un continente contra el reloj |

Los récords se guardan en `localStorage`.

## Desarrollo

```bash
npm install
npm run dev
```

## Desplegar en Vercel

1. Sube la carpeta a un repositorio de GitHub e impórtalo en vercel.com (detecta Vite automáticamente), **o**
2. Con la CLI: `npx vercel` y luego `npx vercel --prod`.

`vercel.json` ya incluye la reescritura para que las rutas (`/rutas`, `/siluetas`…) funcionen al recargar.

## Datos

- Países: [mledoze/countries](https://github.com/mledoze/countries) (`world-countries`). `src/data/countries.json` es una versión reducida; regénerala con `node scripts/gen-countries.mjs`.
- Formas: [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth 1:50m).
- Banderas: [flagcdn.com](https://flagcdn.com).
