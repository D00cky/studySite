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
