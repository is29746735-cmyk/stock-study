import { useEffect, useState } from 'react'
import { X, ArrowSquareOut, Trash } from '@phosphor-icons/react'
import { getPrices } from '../prices.js'
import { naverUrl } from '../watchlist.js'
import LineChart from './LineChart.jsx'

const won = new Intl.NumberFormat('ko-KR')
const RANGES = [
  { id: 66, label: '3달' },
  { id: 132, label: '6달' },
  { id: 250, label: '1년' },
]

// 한 종목의 주가 그래프와, 이 계좌에서 그 종목을 사고판 기록
export default function HoldingDetail({ stock, position, trades, onSell, onBuy, onDeleteTrade, onClose }) {
  const [days, setDays] = useState(null)
  const [failed, setFailed] = useState('')
  const [range, setRange] = useState(66)

  useEffect(() => {
    getPrices(stock.code).then(setDays, (e) => setFailed(e.message))
  }, [stock.code])

  const mine = trades.filter((t) => t.code === stock.code).sort((a, b) => (a.at < b.at ? 1 : -1))
  const firstTrade = mine.at(-1)?.at.slice(0, 10)
  // 처음 거래한 날이 보이도록 기간을 늘린다
  const firstIndex = days && firstTrade ? days.findIndex(([d]) => d >= firstTrade) : -1
  const shown = days ? days.slice(-Math.max(range, firstIndex >= 0 ? days.length - firstIndex + 5 : 0)) : []

  const confirmDelete = (t) => {
    if (window.confirm('이 거래 기록을 지울까요? 계좌 계산이 다시 돼요.')) onDeleteTrade(t.id)
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={stock.name}>
      <div className="sheet-inner">
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={22} />
          </button>
          <h2>{stock.name}</h2>
          <span />
        </header>

        <div className="stock-head">
          <p className="card-kicker">
            {stock.market} <span className="mono">{stock.code}</span>
          </p>
          {days && (
            <h3 className="mono">
              {won.format(days.at(-1)[1])}원 <span className="hint">{days.at(-1)[0]} 기준</span>
            </h3>
          )}
          <a className="hint link with-icon" href={naverUrl(stock.code)} target="_blank" rel="noreferrer">
            네이버 증권에서 보기 <ArrowSquareOut size={14} />
          </a>
        </div>

        {position && (
          <div className="kv">
            <p>
              <span>가진 수량</span>
              <b className="mono">{won.format(position.qty)}주</b>
            </p>
            <p>
              <span>평균 산 값</span>
              <b className="mono">{won.format(Math.round(position.avg))}원</b>
            </p>
            <p>
              <span>지금 평가</span>
              <b className={`mono ${position.rate > 0 ? 'up' : position.rate < 0 ? 'down' : ''}`}>
                {position.rate > 0 ? '+' : ''}
                {position.rate.toFixed(2)}% ({position.profit > 0 ? '+' : ''}
                {won.format(Math.round(position.profit))}원)
              </b>
            </p>
          </div>
        )}

        <div className="option-row">
          {RANGES.map((r) => (
            <button key={r.id} type="button" className="chip" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>

        {failed ? (
          <p className="error">{failed}</p>
        ) : !days ? (
          <div className="chart-skeleton" aria-busy="true" />
        ) : (
          <LineChart
            label={`${stock.name} 종가`}
            formatY={(v) => `${won.format(v)}원`}
            formatTick={(v) => (v >= 10000 ? `${(v / 10000).toLocaleString('ko-KR', { maximumFractionDigits: v >= 1e6 ? 0 : 1 })}만` : won.format(Math.round(v)))}
            series={[{ id: 'close', label: '종가', color: 'var(--chart-mine)', points: shown }]}
            markers={mine.map((t) => ({
              x: t.at.slice(0, 10),
              kind: t.side,
              label: `${t.side === 'buy' ? '삼' : '팖'} ${won.format(t.qty)}주 @ ${won.format(t.price)}`,
            }))}
          />
        )}
        <p className="hint">하루 단위 종가예요. ▲ 산 날, ▼ 판 날.</p>

        <div className="button-pair">
          <button type="button" className="btn buy" onClick={onBuy}>
            더 사기
          </button>
          {position && (
            <button type="button" className="btn sell" onClick={onSell}>
              팔기
            </button>
          )}
        </div>

        <section>
          <h4 className="section-title">거래 기록</h4>
          <ul className="trade-list">
            {mine.map((t) => (
              <li key={t.id}>
                <div>
                  <b className={t.side === 'buy' ? 'up' : 'down'}>{t.side === 'buy' ? '삼' : '팖'}</b>{' '}
                  <span className="mono">
                    {won.format(t.qty)}주 × {won.format(t.price)}원
                  </span>
                  <p className="hint">{t.at.replace('T', ' ')}</p>
                  {t.memo && <p className="trade-memo">{t.memo}</p>}
                </div>
                <button type="button" className="icon-btn" aria-label="거래 기록 지우기" onClick={() => confirmDelete(t)}>
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
