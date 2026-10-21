import { useState } from 'react'
import { X, Trash, ArrowSquareOut } from '@phosphor-icons/react'
import { naverUrl } from '../watchlist.js'

export default function WatchEditor({ stock, isNew, onSave, onDelete, onClose }) {
  const [memo, setMemo] = useState(stock.memo ?? '')

  const submit = (e) => {
    e.preventDefault()
    onSave(memo.trim())
  }

  const confirmDelete = () => {
    if (window.confirm(`${stock.name}을(를) 관심 종목에서 뺄까요? 적어 둔 메모도 함께 지워져요.`)) onDelete()
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={stock.name}>
      <form className="sheet-inner" onSubmit={submit}>
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={22} />
          </button>
          <h2>{isNew ? '관심 종목 추가' : '관심 종목'}</h2>
          <button type="submit" className="btn primary small">저장</button>
        </header>

        <div className="stock-head">
          <p className="card-kicker">
            {stock.market} <span className="mono">{stock.code}</span>
          </p>
          <h3>{stock.name}</h3>
          {stock.sector && <p className="hint">{stock.sector}</p>}
          <a className="hint link with-icon" href={naverUrl(stock.code)} target="_blank" rel="noreferrer">
            네이버 증권에서 주가 보기 <ArrowSquareOut size={14} />
          </a>
        </div>

        <div className="field">
          <label htmlFor="watch-memo">관심 이유</label>
          <textarea id="watch-memo" rows={6} value={memo} onChange={(e) => setMemo(e.target.value)} autoFocus={isNew} />
          <p className="hint">예: 반도체 업황이 좋아진다는 기사를 봤다. 실적 발표 날짜 확인하기.</p>
        </div>

        {!isNew && (
          <button type="button" className="btn danger" onClick={confirmDelete}>
            <Trash size={18} /> 관심 종목에서 빼기
          </button>
        )}
      </form>
    </div>
  )
}
