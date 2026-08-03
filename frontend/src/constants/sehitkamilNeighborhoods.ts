/**
 * Curated Şehitkamil (Gaziantep) mahalle list for land create/edit.
 * Official district neighborhoods only — excludes Şahinbey lookalikes
 * (e.g. Akkent, 75. Yıl, Karataş, Onur, Güneş, Güzelvadi, Dumlupınar).
 */
export const SEHITKAMIL_NEIGHBORHOODS = [
  '15 Temmuz',
  'Atakent',
  'Atatürk',
  'Aydınlar',
  'Batıkent',
  'Belkız',
  'Beykent',
  'Beylerbeyi',
  'Çıksorut',
  'Değirmiçem',
  'Eyüpsultan',
  'Gazikent',
  'Güzelyurt',
  'İbrahimli',
  'Karacaahmet',
  'Mücahitler',
  'Sarıgüllük',
  'Selimiye',
  'Şirinevler',
  'Yunusemre',
] as const

export type SehitkamilNeighborhood = (typeof SEHITKAMIL_NEIGHBORHOODS)[number]

const allowed = new Set<string>(SEHITKAMIL_NEIGHBORHOODS)

/** Options for a select: curated list, plus any legacy value still on the land. */
export function neighborhoodSelectOptions(current?: string | null): string[] {
  const value = (current ?? '').trim()
  if (value && !allowed.has(value)) {
    return [value, ...SEHITKAMIL_NEIGHBORHOODS]
  }
  return [...SEHITKAMIL_NEIGHBORHOODS]
}

export function isSehitkamilNeighborhood(name: string): boolean {
  return allowed.has(name.trim())
}
