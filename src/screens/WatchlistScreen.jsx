import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useWatchlist } from '../watchlist.js'
import StockPicker from '../components/StockPicker.jsx'
import WatchEditor from '../components/WatchEditor.jsx'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })

export default function WatchlistScreen() {
  const { items, add, update, remove } = useWatchlist()
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState(null) // { stock, isNew }

  const close = () => setEditing(null)

  return (
    <section>
      <header className="screen-head">
        <h1>관심 종목</h1>
        {items.length > 0 && <p className="count">{items.length}개</p>}
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <h2>눈여겨보는 종목을 모아 볼까요?</h2>
          <p>왜 관심이 생겼는지 한 줄만 적어 두면, 나중에 돌아볼 때 도움이 돼요.</p>
          <button className="btn primary" onClick={() => setPicking(true)}>
            <Plus size={18} weight="bold" /> 종목 추가
          </button>
        </div>
      ) : (
        <ul className="card-list">
          {items.map((s) => (
            <li key={s.code}>
              <button className="card" onClick={() => setEditing({ stock: s, isNew: false })}>
                <span className="card-kicker">
                  {s.market} <span className="mono">{s.code}</span>
                </span>
                <span className="card-title">{s.name}</span>
                {s.memo ? (
                  <span className="card-body">{s.memo}</span>
                ) : (
                  <span className="card-body faint">관심 이유를 아직 안 적었어요</span>
                )}
                <span className="card-meta">{dateFormat.format(new Date(s.addedAt))}에 추가</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <button className="fab" aria-label="종목 추가" onClick={() => setPicking(true)}>
          <Plus size={26} weight="bold" />
        </button>
      )}

      {picking && (
        <StockPicker
          watchedCodes={new Set(items.map((s) => s.code))}
          onPick={(stock) => {
            setPicking(false)
            const existing = items.find((s) => s.code === stock.code)
            setEditing(existing ? { stock: existing, isNew: false } : { stock, isNew: true })
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {editing && (
        <WatchEditor
          stock={editing.stock}
          isNew={editing.isNew}
          onSave={(memo) => {
            if (editing.isNew) add(editing.stock, memo)
            else update(editing.stock.code, memo)
            close()
          }}
          onDelete={() => {
            remove(editing.stock.code)
            close()
          }}
          onClose={close}
        />
      )}
    </section>
  )
}
