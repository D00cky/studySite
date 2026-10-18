import { useMemo } from 'react'
import { useRoadmap } from '../api/queries'

/** Mapa id → título dos tópicos, para mostrar nomes em vez de IDs. */
export function useTopicTitles() {
  const { data } = useRoadmap()
  return useMemo(() => {
    const titles = new Map(data?.topics.map((t) => [t.id, t.title]))
    return (id?: string) => (id ? (titles.get(id) ?? id) : '')
  }, [data])
}
