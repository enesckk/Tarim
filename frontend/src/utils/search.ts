export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR')
}

export function matchesSearch(
  query: string,
  ...fields: (string | number | null | undefined)[]
) {
  const q = normalizeSearch(query)
  if (!q) return true
  return fields.some((field) => {
    if (field == null) return false
    return normalizeSearch(String(field)).includes(q)
  })
}
