/** Extrai o id de um vídeo do YouTube (watch, youtu.be, embed, shorts). Playlists não têm id de vídeo. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1) || null
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/)
      if (m) return m[2] ?? null
    }
  } catch {
    // URL inválida: trata como link comum
  }
  return null
}

/** Segundos de início indicados na URL (t=1390s, t=23m10s, start=1390). */
export function youtubeStart(url: string): number | null {
  try {
    const u = new URL(url)
    const raw = u.searchParams.get('t') ?? u.searchParams.get('start')
    if (!raw) return null
    if (/^\d+s?$/.test(raw)) return parseInt(raw, 10)
    const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
    if (!m) return null
    const total = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
    return total > 0 ? total : null
  } catch {
    return null
  }
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
