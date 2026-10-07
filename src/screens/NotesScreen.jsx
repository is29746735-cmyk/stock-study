import { useMemo, useState } from 'react'
import { MagnifyingGlass, Plus, LinkSimple } from '@phosphor-icons/react'
import { NOTE_TYPES, typeOf, useNotes } from '../notes.js'
import NoteEditor from '../components/NoteEditor.jsx'

const FILTERS = [{ id: 'all', label: '전체' }, ...NOTE_TYPES]

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })

export default function NotesScreen() {
  const { notes, save, remove } = useNotes()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null = 닫힘, {} = 새 노트, note = 수정

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter((n) => {
      if (filter !== 'all' && n.type !== filter) return false
      if (!q) return true
      return [n.title, n.body, ...(n.tags ?? [])].some((s) => s?.toLowerCase().includes(q))
    })
  }, [notes, filter, query])

  return (
    <section className="notes">
      <header className="notes-head">
        <h1>공부 노트</h1>
        {notes.length > 0 && <p className="count">{notes.length}개</p>}
      </header>

      <label className="search">
        <MagnifyingGlass size={18} aria-hidden />
        <input
          type="search"
          placeholder="제목, 내용, 태그 검색"
          aria-label="노트 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="chips" role="tablist" aria-label="노트 종류">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} className="chip" onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <div className="empty">
          <h2>첫 노트를 적어 볼까요?</h2>
          <p>오늘 처음 본 주식 용어 하나부터 시작해도 충분해요.</p>
          <button className="btn primary" onClick={() => setEditing({})}>
            <Plus size={18} weight="bold" /> 새 노트
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p>찾는 노트가 없어요.</p>
        </div>
      ) : (
        <ul className="note-list">
          {visible.map((n) => (
            <li key={n.id}>
              <button className="note-item" onClick={() => setEditing(n)}>
                <span className="note-type">{typeOf(n.type).label}</span>
                <span className="note-title">{n.title || '제목 없음'}</span>
                {n.body && <span className="note-body">{n.body}</span>}
                <span className="note-meta">
                  <span>{dateFormat.format(new Date(n.updatedAt))}</span>
                  {n.url && <LinkSimple size={14} aria-label="링크 있음" />}
                  {n.tags?.map((t) => (
                    <span key={t} className="tag">#{t}</span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <button className="fab" aria-label="새 노트" onClick={() => setEditing({ type: filter === 'all' ? 'term' : filter })}>
          <Plus size={26} weight="bold" />
        </button>
      )}

      {editing && (
        <NoteEditor
          note={editing}
          onSave={(n) => {
            save(n)
            setEditing(null)
          }}
          onDelete={(id) => {
            remove(id)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
