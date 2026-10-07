import { useStoredState } from './storage.js'

export const NOTE_TYPES = [
  { id: 'term', label: '용어', titleLabel: '용어', bodyLabel: '뜻', bodyHint: '내 말로 풀어서 적어 보세요' },
  { id: 'concept', label: '개념', titleLabel: '제목', bodyLabel: '내용', bodyHint: '이해한 내용을 정리해 보세요' },
  { id: 'source', label: '읽은 자료', titleLabel: '자료 이름', bodyLabel: '요약과 느낀 점', bodyHint: '핵심 내용과 내 생각을 적어 보세요' },
]

export const typeOf = (id) => NOTE_TYPES.find((t) => t.id === id) ?? NOTE_TYPES[0]

export function useNotes() {
  const [notes, setNotes] = useStoredState('stock-study:notes', [])

  const save = (note) => {
    const now = new Date().toISOString()
    if (note.id) {
      setNotes((list) => list.map((n) => (n.id === note.id ? { ...note, updatedAt: now } : n)))
    } else {
      setNotes((list) => [{ ...note, id: crypto.randomUUID(), createdAt: now, updatedAt: now }, ...list])
    }
  }

  const remove = (id) => setNotes((list) => list.filter((n) => n.id !== id))

  return { notes, save, remove }
}
