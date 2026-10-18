import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useClaimReview, useCloseReview, useGiveFeedback, useMe, useReviewThread } from '../../api/queries'
import type { ReviewThread, Verdict } from '../../api/types'
import { Markdown } from '../../components/Markdown'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { ErrorMessage, Loading } from '../../components/Status'
import { formatDateTime } from '../../lib/format'
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE, ROLE_LABEL, VERDICT_LABEL } from '../../lib/labels'
import { useTopicTitles } from '../../lib/useTopicTitles'

export function ReviewPage() {
  const { reviewId = '' } = useParams()
  const { data, error, isPending } = useReviewThread(reviewId)
  const { data: me } = useMe()
  const claim = useClaimReview()
  const close = useCloseReview()
  const topicTitle = useTopicTitles()

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  const { request, evidence, feedback } = data
  const isRequester = me?.id === request.requesterId
  const isMentor = me?.groups.some((g) => g.id === request.groupId && g.role === 'mentor')
  const finished = request.status === 'closed'

  return (
    <div className="prose">
      <p className="muted small">
        <Link to="/time">Time</Link> / Revisão
      </p>
      <h1>{evidence.title}</h1>
      <p className="row">
        <span className={`tag ${REVIEW_STATUS_TONE[request.status]}`}>{REVIEW_STATUS_LABEL[request.status]}</span>
        <span className="muted small">
          Pedida por {request.requesterName} em {formatDateTime(request.createdAt)}
          {request.topicId && (
            <>
              {' '}
              · <Link to={`/topicos/${request.topicId}`}>{topicTitle(request.topicId)}</Link>
            </>
          )}
        </span>
      </p>
      {request.reviewerName ? (
        <p className="small">Revisora/revisor: {request.reviewerName}</p>
      ) : (
        !isRequester &&
        !finished && (
          <button type="button" className="button-secondary" onClick={() => claim.mutate({ id: request.id, body: undefined })}>
            Assumir revisão
          </button>
        )
      )}
      <ErrorMessage error={claim.error} />

      {request.question && (
        <section className="callout" aria-label="Pergunta" style={{ marginTop: '1rem' }}>
          <strong>Pergunta:</strong> {request.question}
        </section>
      )}

      <section aria-labelledby="evidence-title">
        <h2 id="evidence-title">Evidência</h2>
        {evidence.url && (
          <p>
            <a href={evidence.url} target="_blank" rel="noopener noreferrer">
              {evidence.url}
            </a>
          </p>
        )}
        {evidence.body && <Markdown text={evidence.body} />}
        {evidence.aiAssistance && (
          <p className="small">
            <span className="muted">Assistência de IA registrada:</span> {evidence.aiAssistance}
          </p>
        )}
      </section>

      <section aria-labelledby="feedback-title">
        <h2 id="feedback-title">Feedback</h2>
        {feedback.length === 0 ? (
          <p className="muted">Ainda sem feedback.</p>
        ) : (
          <ol className="list-plain">
            {feedback.map((f) => (
              <li key={f.id}>
                <div className="row small">
                  <strong>{f.authorName}</strong>
                  <span className="muted">{ROLE_LABEL[f.authorRole]}</span>
                  <span className="tag">{VERDICT_LABEL[f.verdict]}</span>
                  <span className="muted">{formatDateTime(f.createdAt)}</span>
                </div>
                <Markdown text={f.body} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {finished ? (
        <p className="muted">Este pedido foi encerrado.</p>
      ) : (
        <FeedbackForm thread={data} isRequester={isRequester} />
      )}

      {!finished && (isRequester || isMentor) && (
        <p style={{ marginTop: '1.5rem' }}>
          <button type="button" className="button-quiet" onClick={() => close.mutate({ id: request.id, body: undefined })}>
            Encerrar pedido
          </button>
        </p>
      )}
      <ErrorMessage error={close.error} />
    </div>
  )
}

function FeedbackForm({ thread, isRequester }: { thread: ReviewThread; isRequester: boolean }) {
  const give = useGiveFeedback()
  const [verdict, setVerdict] = useState<Verdict>('comment')
  const [body, setBody] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    give.mutate({ id: thread.request.id, body: { verdict: isRequester ? 'comment' : verdict, body } }, { onSuccess: () => setBody('') })
  }

  return (
    <form onSubmit={submit} className="panel stack" aria-labelledby="give-feedback-title" style={{ marginTop: '1.5rem' }}>
      <h2 id="give-feedback-title">{isRequester ? 'Responder' : 'Dar feedback'}</h2>
      {isRequester ? (
        <p className="hint">Responda às perguntas da revisão. Quem pede a revisão não aprova o próprio trabalho.</p>
      ) : (
        <fieldset>
          <legend>Veredito</legend>
          {(['comment', 'changes_requested', 'accepted'] as const).map((v) => (
            <label key={v} className="choice">
              <input type="radio" name="verdict" checked={verdict === v} onChange={() => setVerdict(v)} />
              <span>{{ comment: 'Comentar', changes_requested: 'Pedir mudanças', accepted: 'Aprovar' }[v]}</span>
            </label>
          ))}
          <p className="hint">Examine raciocínio, invariantes e se a evidência sustenta as conclusões.</p>
        </fieldset>
      )}
      <MarkdownEditor label="Seu feedback" placeholder="O que está bom, o que falta e uma pergunta para a pessoa pensar" required rows={5} value={body} onChange={setBody} />
      <ErrorMessage error={give.error} />
      <button type="submit" disabled={give.isPending}>
        {isRequester ? 'Responder' : 'Enviar feedback'}
      </button>
    </form>
  )
}
