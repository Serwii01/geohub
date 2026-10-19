# 🌍 GeoHub

Hub de juegos de geografía en español. React + TypeScript + Vite, mapas con d3-geo.

## Juegos

| Juego | Tipo | Descripción |
|---|---|---|
| 🚩 Banderas | Test | Adivina el país por su bandera (4 opciones, filtro por continente) |
| 🗺️ Siluetas | Deducción | Estilo Worldle: adivina por la forma, con distancia, dirección y % de cercanía |
| 🧭 Rutas | Estrategia | Estilo travle.earth: conecta dos países por tierra nombrando los intermedios |
| 🏛️ Capitales | Test | País → capital o capital → país |
| 📍 Localiza | Mapa | Haz clic en el país; puntos según la distancia |
| 📏 ¿Más grande? | Intuición | Más grande / más pequeño por superficie, modo racha |
| ⏱️ Contrarreloj | Memoria | Nombra todos los países de un continente contra el reloj |

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
