import raw from './countries.json'
import { normalize } from '../lib/utils'

export type Region = 'Europa' | 'Asia' | 'África' | 'América' | 'Oceanía'

export const REGIONS: Region[] = ['Europa', 'Asia', 'África', 'América', 'Oceanía']

export interface Country {
  code: string // cca3
  cca2: string
  ccn3: string
  name: string // nombre en español
  capital: string
  region: Region
  subregion: string
  latlng: [number, number]
  borders: string[]
  area: number
  /** Nombres aceptados como respuesta, ya normalizados */
  aliases: string[]
}

const REGION_ES: Record<string, Region> = {
  Europe: 'Europa',
  Asia: 'Asia',
  Africa: 'África',
  Americas: 'América',
  Oceania: 'Oceanía',
}

// Nombres más habituales en español que los del dataset
const NAME_OVERRIDES: Record<string, string> = {
  COD: 'República Democrática del Congo',
  COG: 'República del Congo',
  IRN: 'Irán',
  SLE: 'Sierra Leona',
  MWI: 'Malaui',
  ROU: 'Rumanía',
  BHR: 'Baréin',
  DJI: 'Yibuti',
  GRD: 'Granada',
  KGZ: 'Kirguistán',
  SWZ: 'Esuatini',
  BWA: 'Botsuana',
  LSO: 'Lesoto',
  BRN: 'Brunéi',
  BGD: 'Bangladés',
}

const EXTRA_ALIASES: Record<string, string[]> = {
  COD: ['RDC', 'Congo Kinshasa', 'Zaire'],
  COG: ['Congo', 'Congo Brazzaville'],
  USA: ['EEUU', 'EE UU', 'USA', 'Estados Unidos de America'],
  GBR: ['UK', 'Gran Bretaña', 'Inglaterra'],
  CZE: ['Republica Checa'],
  MMR: ['Birmania'],
  NLD: ['Holanda'],
  SWZ: ['Suazilandia'],
  CIV: ['Costa de Marfil'],
  TLS: ['Timor-Leste'],
  ARE: ['Emiratos', 'EAU'],
  PRK: ['Corea del Norte'],
  KOR: ['Corea del Sur', 'Corea'],
  MKD: ['Macedonia'],
  VAT: ['Vaticano'],
  CPV: ['Cabo Verde'],
  BIH: ['Bosnia'],
  TTO: ['Trinidad'],
  STP: ['Santo Tome'],
  PNG: ['Papua'],
  CAF: ['Centroafrica'],
  SAU: ['Arabia Saudita', 'Arabia'],
  QAT: ['Qatar'],
  KEN: ['Kenya'],
  ZWE: ['Zimbabwe'],
  BLR: ['Belarus'],
  MDA: ['Moldova'],
  SUR: ['Surinam', 'Suriname'],
  PLW: ['Palaos'],
}

// Capitales cuyo nombre en español difiere del inglés
const CAPITAL_ES: Record<string, string> = {
  'Abu Dhabi': 'Abu Dabi', 'Addis Ababa': 'Adís Abeba', Accra: 'Acra', Algiers: 'Argel',
  'Andorra la Vella': 'Andorra la Vieja', Ashgabat: 'Asjabad', Athens: 'Atenas',
  Baghdad: 'Bagdad', Baku: 'Bakú', Beijing: 'Pekín', Belgrade: 'Belgrado', Berlin: 'Berlín',
  Bern: 'Berna', Bishkek: 'Biskek', Brasília: 'Brasilia', Brussels: 'Bruselas',
  Bucharest: 'Bucarest', Cairo: 'El Cairo', 'Chișinău': 'Chisináu', Conakry: 'Conakri',
  Copenhagen: 'Copenhague', Damascus: 'Damasco', Dhaka: 'Daca', Djibouti: 'Yibuti',
  Dublin: 'Dublín', Dushanbe: 'Dusambé', 'Guatemala City': 'Ciudad de Guatemala',
  Hanoi: 'Hanói', Havana: 'La Habana', Jakarta: 'Yakarta', Jerusalem: 'Jerusalén',
  Kathmandu: 'Katmandú', Khartoum: 'Jartum', 'Kuwait City': 'Ciudad de Kuwait', Kyiv: 'Kiev',
  Lisbon: 'Lisboa', Ljubljana: 'Liubliana', London: 'Londres', Luxembourg: 'Luxemburgo',
  'Mexico City': 'Ciudad de México', Mogadishu: 'Mogadiscio', Monaco: 'Mónaco',
  Moscow: 'Moscú', Muscat: 'Mascate', "N'Djamena": 'Yamena', Naypyidaw: 'Naipyidó',
  'New Delhi': 'Nueva Delhi', Nouakchott: 'Nuakchot', Ouagadougou: 'Uagadugú',
  'Panama City': 'Ciudad de Panamá', Paris: 'París', 'Phnom Penh': 'Nom Pen',
  'Port of Spain': 'Puerto España', 'Port-au-Prince': 'Puerto Príncipe', Prague: 'Praga',
  'Porto-Novo': 'Porto Novo', Pyongyang: 'Pionyang', Reykjavik: 'Reikiavik', Riyadh: 'Riad',
  Rome: 'Roma', "Sana'a": 'Saná', 'São Tomé': 'Santo Tomé', Seoul: 'Seúl',
  Singapore: 'Singapur', Sofia: 'Sofía', Stockholm: 'Estocolmo', Tashkent: 'Taskent',
  Tbilisi: 'Tiflis', Tehran: 'Teherán', Thimphu: 'Timbu', Tokyo: 'Tokio', Tripoli: 'Trípoli',
  Tunis: 'Túnez', 'Ulan Bator': 'Ulán Bator', 'Vatican City': 'Ciudad del Vaticano',
  Valletta: 'La Valeta', Vienna: 'Viena', Vientiane: 'Vientián', Vilnius: 'Vilna',
  Warsaw: 'Varsovia', 'Washington D.C.': 'Washington D. C.', Yaoundé: 'Yaundé',
  Yerevan: 'Ereván', 'City of San Marino': 'San Marino', 'South Tarawa': 'Tarawa Sur',
  "St. George's": "Saint George's", Lobamba: 'Mbabane',
}

interface RawCountry {
  cca2: string
  cca3: string
  ccn3: string
  name: { common: string; official: string }
  spa?: { common: string; official: string }
  capital: string[]
  region: string
  subregion: string
  latlng: [number, number]
  borders: string[]
  area: number
}

export const COUNTRIES: Country[] = (raw as RawCountry[])
  .map((c) => {
    const name = NAME_OVERRIDES[c.cca3] ?? c.spa?.common ?? c.name.common
    const rawCapital = c.capital[0] ?? ''
    const names = [
      name,
      c.spa?.common,
      c.spa?.official,
      c.name.common,
      c.name.official,
      ...(EXTRA_ALIASES[c.cca3] ?? []),
    ].filter((n): n is string => !!n)
    return {
      code: c.cca3,
      cca2: c.cca2,
      ccn3: c.ccn3,
      name,
      capital: CAPITAL_ES[rawCapital] ?? rawCapital,
      region: REGION_ES[c.region] ?? 'Asia',
      subregion: c.subregion,
      latlng: c.latlng,
      borders: c.borders,
      area: c.area,
      aliases: [...new Set(names.map(normalize))],
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))

export const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))
export const BY_CCN3 = new Map(COUNTRIES.map((c) => [c.ccn3, c]))

export function flagUrl(c: Country, width: 160 | 320 | 640 = 320) {
  return `https://flagcdn.com/w${width}/${c.cca2.toLowerCase()}.png`
}

/** Busca un país por texto libre (nombre exacto o alias) */
export function findCountry(text: string, pool: Country[] = COUNTRIES): Country | undefined {
  const n = normalize(text)
  if (!n) return undefined
  return pool.find((c) => c.aliases.includes(n))
}

/** Sugerencias para autocompletar */
export function searchCountries(text: string, pool: Country[] = COUNTRIES, limit = 6): Country[] {
  const n = normalize(text)
  if (!n) return []
  const starts: Country[] = []
  const contains: Country[] = []
  for (const c of pool) {
    if (c.aliases.some((a) => a.startsWith(n))) starts.push(c)
    else if (c.aliases.some((a) => a.includes(n))) contains.push(c)
  }
  return [...starts, ...contains].slice(0, limit)
}

export function inRegion(region: Region | 'Mundo') {
  return region === 'Mundo' ? COUNTRIES : COUNTRIES.filter((c) => c.region === region)
}
