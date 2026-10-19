// Genera src/data/countries.json con solo los campos que usa la app
// Uso: node scripts/gen-countries.mjs
import { writeFileSync } from 'node:fs'
import countries from 'world-countries'

const slim = countries
  .filter((c) => c.independent || c.unMember)
  .map((c) => ({
    cca2: c.cca2,
    cca3: c.cca3,
    ccn3: c.ccn3,
    name: { common: c.name.common, official: c.name.official },
    spa: c.translations.spa,
    capital: c.capital,
    region: c.region,
    subregion: c.subregion,
    latlng: c.latlng,
    borders: c.borders,
    area: c.area,
  }))

writeFileSync(new URL('../src/data/countries.json', import.meta.url), JSON.stringify(slim))
console.log(`${slim.length} países escritos`)
