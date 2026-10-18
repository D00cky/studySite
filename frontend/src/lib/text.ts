/** Normaliza para busca: sem acentos, minúsculas. */
export function fold(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function matches(query: string, ...fields: (string | undefined)[]) {
  const q = fold(query)
  return !q || fields.some((f) => f !== undefined && fold(f).includes(q))
}
