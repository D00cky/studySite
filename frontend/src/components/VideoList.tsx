import { useState } from 'react'
import type { Resource } from '../api/types'
import { youtubeId } from '../lib/youtube'

/**
 * Vídeos da lição. O player do YouTube (domínio nocookie) só é carregado quando a
 * pessoa clica — a página não chama o YouTube antes disso, exceto pela miniatura.
 */
export function VideoList({ videos }: { videos: Resource[] }) {
  return (
    <ul className="video-grid">
      {videos.map((v) => (
        <li key={v.id}>
          <VideoCard video={v} />
        </li>
      ))}
    </ul>
  )
}

function VideoCard({ video }: { video: Resource }) {
  const [playing, setPlaying] = useState(false)
  const id = youtubeId(video.url)
  return (
    <article className="video-card">
      <div className="video-frame">
        {id && playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : id ? (
          <button type="button" className="video-facade" onClick={() => setPlaying(true)} aria-label={`Assistir: ${video.title}`}>
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="video-play" aria-hidden="true">
              ▶
            </span>
          </button>
        ) : (
          <a className="video-facade video-external" href={video.url} target="_blank" rel="noopener noreferrer">
            <span className="video-play" aria-hidden="true">
              ▶
            </span>
            <span className="visually-hidden">{video.title} (abre em nova aba)</span>
          </a>
        )}
      </div>
      <div className="video-meta">
        <strong>{video.title}</strong>
        <span className="muted small">{video.author}</span>
        {video.section && video.section !== video.title && <span className="small">{video.section}</span>}
        <span className="small">
          {video.language === 'pt-BR' ? 'Português' : 'Inglês'} ·{' '}
          <a href={video.url} target="_blank" rel="noopener noreferrer">
            {id ? 'Abrir no YouTube' : 'Abrir'}
            <span className="visually-hidden"> (abre em nova aba)</span>
          </a>
        </span>
      </div>
    </article>
  )
}
