// Genera src/data/countries.json con solo los campos que usa la app
// Uso: node scripts/gen-countries.mjs
import { writeFileSync } from 'node:fs'
import countries from 'world-countries'

// Los nombres se traducen aquí con el Intl de Node (ICU completo): los navegadores
// no siempre conocen los códigos de idioma de tres letras
const currencyNames = new Intl.DisplayNames(['es'], { type: 'currency', fallback: 'none' })
const languageNames = new Intl.DisplayNames(['es'], { type: 'language', fallback: 'none' })

// Monedas e idiomas que ICU no conoce
const MANUAL = {
  KID: 'Dólar de Kiribati',
  TVD: 'Dólar tuvaluano',
  ZWB: 'Bono de Zimbabue',
  bar: 'Bávaro',
  bjz: 'Criollo beliceño',
  zdj: 'Comorense',
  hif: 'Hindi de Fiyi',
  pov: 'Criollo de Guinea-Bisáu',
  jam: 'Patois jamaicano',
  nzs: 'Lengua de signos neozelandesa',
  zib: 'Lengua de signos de Zimbabue',
  hgm: 'Khoekhoe',
  kwn: 'Kwangali',
  smi: 'Sami',
  ber: 'Bereber',
  bwg: 'Chibarwe',
  kck: 'Kalanga',
  khi: 'Khoisán',
  ndc: 'Ndau',
  toi: 'Tonga (Zambia)',
}

function spanish(names, code, english) {
  if (MANUAL[code]) return MANUAL[code]
  let name
  try {
    name = names.of(code)
  } catch {
    // código que Intl no acepta
  }
  // "leona sierraleonesa (1964–2022)" → "leona sierraleonesa"
  const text = (name ?? english).replace(/\s*\(.*\)$/, '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

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
    currencies: Object.entries(c.currencies ?? {}).map(([k, v]) => spanish(currencyNames, k, v.name)),
    languages: Object.entries(c.languages ?? {}).map(([k, v]) =>
      k === 'cnr' ? 'Montenegrino' : spanish(languageNames, k, v),
    ),
  }))

writeFileSync(new URL('../src/data/countries.json', import.meta.url), JSON.stringify(slim))
console.log(`${slim.length} países escritos`)
