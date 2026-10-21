import { useState } from 'react'
import { X, CaretRight, ClockCounterClockwise } from '@phosphor-icons/react'
import { useWatchlist } from '../watchlist.js'
import { priceAt } from '../prices.js'
import StockPicker from './StockPicker.jsx'

const pad = (n) => String(n).padStart(2, '0')
const nowInput = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const won = new Intl.NumberFormat('ko-KR')

// 장이 열리는 시간: 평일 9:00 ~ 15:30
const marketOpen = (at) => {
  const d = new Date(at)
  const day = d.getDay()
  const hm = at.slice(11, 16)
  return day > 0 && day < 6 && hm >= '09:00' && hm <= '15:30'
}

export default function TradeForm({ side, stock: fixedStock, cash, maxQty, onSave, onClose }) {
  const { items: watched } = useWatchlist()
  const [stock, setStock] = useState(fixedStock ?? null)
  const [picking, setPicking] = useState(false)
  const [at, setAt] = useState(nowInput())
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')
  const [memo, setMemo] = useState('')
  const [lookup, setLookup] = useState(null) // { state: 'loading' | 'done' | 'error', text }
  const [error, setError] = useState('')

  const isBuy = side === 'buy'
  const amount = Number(price) * Number(qty)
  const limit = isBuy ? (Number(price) > 0 ? Math.floor(cash / Number(price)) : null) : maxQty

  const loadPrice = async () => {
    if (!stock) return setError('종목부터 골라 주세요.')
    setLookup({ state: 'loading', text: '가격을 찾는 중이에요…' })
    try {
      const r = await priceAt(stock.code, at)
      setPrice(String(r.price))
      setLookup({
        state: 'done',
        text: r.source === 'minute' ? `${r.time.replace('T', ' ')} 가격이에요.` : `분 단위 기록이 없어서 ${r.time} 종가를 넣었어요.`,
      })
    } catch (e) {
      setLookup({ state: 'error', text: e.message })
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const q = Math.floor(Number(qty))
    const p = Number(price)
    if (!stock) return setError('종목을 골라 주세요.')
    if (!(p > 0)) return setError('가격을 적어 주세요.')
    if (!(q > 0)) return setError('수량을 1주 이상 적어 주세요.')
    if (isBuy && q * p > cash) return setError(`현금이 모자라요. 지금 현금으로는 ${won.format(Math.floor(cash / p))}주까지 살 수 있어요.`)
    if (!isBuy && q > maxQty) return setError(`가진 수량(${maxQty}주)보다 많이 팔 수 없어요.`)
    onSave({ side, code: stock.code, name: stock.name, market: stock.market, at, price: p, qty: q, memo: memo.trim() })
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={isBuy ? '사기' : '팔기'}>
      <form className="sheet-inner" onSubmit={submit} noValidate>
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={22} />
          </button>
          <h2>{isBuy ? '사기' : '팔기'}</h2>
          <button type="submit" className={`btn small ${isBuy ? 'buy' : 'sell'}`}>
            {isBuy ? '샀어요' : '팔았어요'}
          </button>
        </header>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="field">
          <span className="label">종목</span>
          {fixedStock ? (
            <p className="picker-btn static">
              <span>
                <strong>{stock.name}</strong> <span className="mono hint">{stock.code}</span>
              </span>
            </p>
          ) : (
            <button type="button" className="picker-btn" onClick={() => setPicking(true)}>
              {stock ? (
                <span>
                  <strong>{stock.name}</strong> <span className="mono hint">{stock.code}</span>
                </span>
              ) : (
                <span className="hint">종목 고르기</span>
              )}
              <CaretRight size={18} />
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="trade-at">{isBuy ? '산 시각' : '판 시각'}</label>
          <input id="trade-at" type="datetime-local" value={at} max={nowInput()} onChange={(e) => setAt(e.target.value)} />
          {!marketOpen(at) && <p className="hint">장이 열리는 시간(평일 9:00~15:30)이 아니에요. 그래도 기록할 수는 있어요.</p>}
        </div>

        <div className="field">
          <label htmlFor="trade-price">가격 (1주당 원)</label>
          <input id="trade-price" type="number" inputMode="numeric" min="0" value={price} onChange={(e) => {
              setPrice(e.target.value)
              setError('')
            }} />
          <button type="button" className="text-btn" onClick={loadPrice} disabled={lookup?.state === 'loading'}>
            <ClockCounterClockwise size={16} /> 그 시각 가격 불러오기
          </button>
          {lookup && <p className={lookup.state === 'error' ? 'error' : 'hint'}>{lookup.text}</p>}
        </div>

        <div className="field">
          <label htmlFor="trade-qty">수량 (주)</label>
          <input id="trade-qty" type="number" inputMode="numeric" min="1" step="1" value={qty} onChange={(e) => {
              setQty(e.target.value)
              setError('')
            }} />
          <p className="hint">
            {limit != null && `${isBuy ? '살 수 있는' : '팔 수 있는'} 수량: 최대 ${won.format(limit)}주. `}
            {amount > 0 && `금액 ${won.format(amount)}원`}
          </p>
        </div>

        <div className="field">
          <label htmlFor="trade-memo">{isBuy ? '산 이유' : '판 이유'}</label>
          <textarea id="trade-memo" rows={4} value={memo} onChange={(e) => setMemo(e.target.value)} />
          <p className="hint">나중에 평가할 때 이 이유가 맞았는지 봐요.</p>
        </div>
      </form>

      {picking && (
        <StockPicker
          watchedCodes={new Set(watched.map((s) => s.code))}
          onPick={(s) => {
            setStock({ code: s.code, name: s.name, market: s.market })
            setPicking(false)
            setLookup(null)
            setError('')
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
