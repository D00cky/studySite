import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { useProjects, useResourceSearch, useRoadmap } from '../api/queries'

interface Item {
  kind: 'Tópico' | 'Projeto' | 'Recurso'
  title: string
  detail: string
  go: () => void
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Paleta de comandos (Ctrl+K): busca tópicos e projetos localmente e recursos na API. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const id = useId()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const q = useDeferredValue(query.trim())
  const { data: roadmap } = useRoadmap()
  const { data: projects } = useProjects()
  const { data: resources } = useResourceSearch(q)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const items = useMemo<Item[]>(() => {
    if (q.length === 0) return []
    const needle = norm(q)
    const stageTitle = new Map(roadmap?.stages.map((s) => [s.id, s.title]))
    const topics = (roadmap?.topics ?? [])
      .filter((t) => norm(`${t.title} ${t.id}`).includes(needle))
      .slice(0, 6)
      .map<Item>((t) => ({
        kind: 'Tópico',
        title: t.title,
        detail: stageTitle.get(t.stage) ?? '',
        go: () => navigate(`/topicos/${t.id}`),
      }))
    const projectItems = (projects ?? [])
      .filter((p) => norm(`${p.title} ${p.id}`).includes(needle))
      .slice(0, 4)
      .map<Item>((p) => ({
        kind: 'Projeto',
        title: p.title,
        detail: p.track === 'build' ? 'Construa o seu' : 'Laboratório',
        go: () => navigate(`/projetos/${p.id}`),
      }))
    const resourceItems = (q.length >= 2 ? (resources ?? []) : []).slice(0, 6).map<Item>((r) => ({
      kind: 'Recurso',
      title: r.title,
      detail: [r.author, r.section].filter(Boolean).join(' · '),
      go: () => window.open(r.url, '_blank', 'noopener,noreferrer'),
    }))
    return [...topics, ...projectItems, ...resourceItems]
  }, [q, roadmap, projects, resources, navigate])

  const selected = Math.min(active, Math.max(items.length - 1, 0))

  function choose(item: Item) {
    onClose()
    item.go()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault()
      setActive((selected + 1) % items.length)
    } else if (e.key === 'ArrowUp' && items.length > 0) {
      e.preventDefault()
      setActive((selected - 1 + items.length) % items.length)
    } else if (e.key === 'Enter' && items[selected]) {
      e.preventDefault()
      choose(items[selected])
    } else if (e.key === 'Tab') {
      e.preventDefault() // o foco fica no campo enquanto a paleta está aberta
    }
  }

  const optionId = (i: number) => `${id}-opcao-${i}`

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        className="palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <h2 id={`${id}-titulo`} className="visually-hidden">
          Buscar no site
        </h2>
        <div className="palette-input">
          <span className="control-prefix" aria-hidden="true">
            ❯
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Buscar tópicos, projetos e recursos"
            aria-expanded={items.length > 0}
            aria-controls={`${id}-lista`}
            aria-autocomplete="list"
            aria-activedescendant={items.length > 0 ? optionId(selected) : undefined}
            placeholder="Buscar tópicos, projetos e recursos…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
          />
          <kbd>esc</kbd>
        </div>
        <ul id={`${id}-lista`} role="listbox" aria-label="Resultados" className="palette-results">
          {items.map((item, i) => (
            <li
              key={`${item.kind}-${item.title}-${i}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === selected}
              className="palette-option"
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
            >
              <span className={`palette-kind kind-${norm(item.kind)}`}>{item.kind}</span>
              <span className="palette-title">{item.title}</span>
              {item.detail && <span className="palette-detail">{item.detail}</span>}
            </li>
          ))}
        </ul>
        {q.length > 0 && items.length === 0 && <p className="palette-empty">Nada encontrado para “{q}”.</p>}
        {q.length === 0 && (
          <p className="palette-empty">
            Digite parte de um título. <kbd>↑</kbd> <kbd>↓</kbd> para escolher, <kbd>Enter</kbd> para abrir.
          </p>
        )}
      </div>
    </div>
  )
}
