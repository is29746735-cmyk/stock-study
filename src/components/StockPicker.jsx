import { useEffect, useMemo, useState } from 'react'
import { X, MagnifyingGlass, Check } from '@phosphor-icons/react'
import { loadStocks, searchStocks } from '../watchlist.js'

export default function StockPicker({ watchedCodes, onPick, onClose }) {
  const [stocks, setStocks] = useState(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadStocks().then(setStocks, () => setFailed(true))
  }, [])

  const results = useMemo(() => (stocks ? searchStocks(stocks, query) : []), [stocks, query])

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="종목 찾기">
      <div className="sheet-inner">
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={22} />
          </button>
          <h2>종목 찾기</h2>
          <span />
        </header>

        <label className="search">
          <MagnifyingGlass size={18} aria-hidden />
          <input
            type="search"
            placeholder="종목 이름이나 코드"
            aria-label="종목 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>

        {failed ? (
          <p className="error">종목 목록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
        ) : !stocks ? (
          <ul className="result-list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="result skeleton" />
            ))}
          </ul>
        ) : !query.trim() ? (
          <p className="hint">코스피, 코스닥 {stocks.length.toLocaleString()}개 종목에서 찾아요.</p>
        ) : results.length === 0 ? (
          <p className="hint">"{query}"에 맞는 종목이 없어요.</p>
        ) : (
          <ul className="result-list">
            {results.map((s) => (
              <li key={s.code}>
                <button className="result" onClick={() => onPick(s)}>
                  <span className="result-name">{s.name}</span>
                  <span className="result-sub">
                    {s.market} <span className="mono">{s.code}</span>
                    {s.sector && ` · ${s.sector}`}
                  </span>
                  {watchedCodes.has(s.code) && (
                    <span className="result-badge">
                      <Check size={14} weight="bold" /> 담음
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
