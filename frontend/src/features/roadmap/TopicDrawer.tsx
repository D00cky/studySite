import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useTopicPage } from '../../api/queries'
import type { TopicProgress } from '../../api/types'
import { Essentials } from '../../components/DrillDown'
import { InlineMarkdown } from '../../components/Markdown'
import { ProgressTag } from '../../components/ProgressTag'
import { ErrorMessage, Loading } from '../../components/Status'

interface Props {
  topicId: string
  progress?: TopicProgress
  onClose: () => void
}

/** Painel lateral com o resumo do tópico, como o roadmap.sh. Esc ou o botão fecham. */
export function TopicDrawer({ topicId, progress, onClose }: Props) {
  const { data, error, isPending } = useTopicPage(topicId)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [topicId, onClose])

  const titleId = `drawer-title-${topicId}`
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="false" aria-labelledby={titleId}>
        <div className="drawer-head">
          <button ref={closeRef} type="button" className="button-quiet" onClick={onClose}>
            Fechar <span className="visually-hidden">painel</span>
          </button>
        </div>
        {isPending && <Loading />}
        <ErrorMessage error={error} />
        {data && (
          <div className="stack">
            <p className="eyebrow">
              {data.stage.kind === 'core' ? `Etapa ${data.stage.order} · ` : ''}
              {data.stage.title}
            </p>
            <h2 id={titleId} className="drawer-title">
              {data.topic.title}
            </h2>
            <div className="row">
              {progress && <ProgressTag status={progress.status} />}
              {data.topic.status === 'planned' ? (
                <span className="tag">Lição planejada</span>
              ) : (
                <span className="tag tag-success">Lição completa</span>
              )}
              {data.videos.length > 0 && <span className="tag">{data.videos.length} vídeo(s)</span>}
            </div>
            <p className="drawer-objective">{data.topic.objective}</p>
            <p className="small">
              <strong>Por que importa:</strong> <InlineMarkdown text={data.topic.whyItMatters} />
            </p>
            <Essentials items={data.topic.essentials} compact />
            {data.prerequisites.length > 0 && (
              <div>
                <p className="eyebrow">Pré-requisitos</p>
                <ul className="chip-list">
                  {data.prerequisites.map((p) => (
                    <li key={p.id}>
                      <Link to={`/topicos/${p.id}`} className="chip">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.startResource && (
              <div>
                <p className="eyebrow">Comece por</p>
                <p className="small" style={{ margin: 0 }}>
                  {data.startResource.title} <span className="muted">— {data.startResource.author}</span>
                </p>
              </div>
            )}
            <Link to={`/topicos/${data.topic.id}`} className="button button-block">
              Abrir lição
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
