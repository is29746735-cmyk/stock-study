import { useState } from 'react'
import { X, Trash } from '@phosphor-icons/react'
import { NOTE_TYPES, typeOf } from '../notes.js'

export default function NoteEditor({ note, onSave, onDelete, onClose }) {
  const [type, setType] = useState(note.type ?? 'term')
  const [title, setTitle] = useState(note.title ?? '')
  const [body, setBody] = useState(note.body ?? '')
  const [url, setUrl] = useState(note.url ?? '')
  const [tags, setTags] = useState((note.tags ?? []).join(', '))
  const [error, setError] = useState('')

  const t = typeOf(type)
  const isNew = !note.id

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError(`${t.titleLabel} 칸을 채워 주세요.`)
      return
    }
    onSave({
      ...note,
      type,
      title: title.trim(),
      body: body.trim(),
      url: type === 'source' ? url.trim() : '',
      tags: tags
        .split(/[,#]/)
        .map((s) => s.trim())
        .filter(Boolean),
    })
  }

  const confirmDelete = () => {
    if (window.confirm('이 노트를 지울까요? 지우면 되돌릴 수 없어요.')) onDelete(note.id)
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={isNew ? '새 노트' : '노트 수정'}>
      <form className="sheet-inner" onSubmit={submit} noValidate>
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={22} />
          </button>
          <h2>{isNew ? '새 노트' : '노트 수정'}</h2>
          <button type="submit" className="btn primary small">저장</button>
        </header>

        <div className="segmented" role="radiogroup" aria-label="노트 종류">
          {NOTE_TYPES.map((nt) => (
            <button key={nt.id} type="button" role="radio" aria-checked={type === nt.id} onClick={() => setType(nt.id)}>
              {nt.label}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="note-title">{t.titleLabel}</label>
          <input
            id="note-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError('')
            }}
            aria-invalid={!!error}
            autoFocus={isNew}
          />
          {error && <p className="error">{error}</p>}
        </div>

        <div className="field">
          <label htmlFor="note-body">{t.bodyLabel}</label>
          <textarea id="note-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="hint">{t.bodyHint}</p>
        </div>

        {type === 'source' && (
          <div className="field">
            <label htmlFor="note-url">링크</label>
            <input id="note-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} />
            {/^https?:\/\//.test(url) && (
              <a className="hint link" href={url} target="_blank" rel="noreferrer">링크 열기</a>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="note-tags">태그</label>
          <input id="note-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          <p className="hint">쉼표로 나눠 적어요. 예: 재무제표, 반도체</p>
        </div>

        {!isNew && (
          <button type="button" className="btn danger" onClick={confirmDelete}>
            <Trash size={18} /> 노트 지우기
          </button>
        )}
      </form>
    </div>
  )
}
