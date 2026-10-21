import { useEffect, useMemo, useState } from 'react'
import { Plus, Info } from '@phosphor-icons/react'
import { ACCOUNTS, usePaper, replay, evaluate, performanceSeries, holdingQty, daysBetween } from '../paper.js'
import { getPrices, closeOn } from '../prices.js'
import { useStoredState } from '../storage.js'
import LineChart from '../components/LineChart.jsx'
import TradeForm from '../components/TradeForm.jsx'
import HoldingDetail from '../components/HoldingDetail.jsx'

const won = new Intl.NumberFormat('ko-KR')
const signed = (n, digits = 2) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}`
const tone = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : '')
const PRESETS = [1_000_000, 10_000_000, 50_000_000]

export default function PaperScreen() {
  const { data, setPrincipal, addTrade, removeTrade, resetAccount } = usePaper()
  const [account, setAccount] = useStoredState('stock-study:paper-tab', 'short')
  const acc = data.accounts[account]
  const trades = useMemo(() => data.trades.filter((t) => t.account === account), [data.trades, account])

  const [trade, setTrade] = useState(null) // { side, stock? }
  const [detail, setDetail] = useState(null) // stock

  // 이 계좌에서 거래한 모든 종목 + 코스피의 하루 단위 주가
  const codes = useMemo(() => [...new Set(trades.map((t) => t.code))], [trades])
  const [prices, setPrices] = useState({})
  const [priceError, setPriceError] = useState('')
  useEffect(() => {
    let alive = true
    setPriceError('')
    Promise.all(['KOSPI', ...codes].map((c) => getPrices(c).then((items) => [c, items])))
      .then((pairs) => alive && setPrices(Object.fromEntries(pairs)))
      .catch((e) => alive && setPriceError(e.message))
    return () => {
      alive = false
    }
  }, [codes.join(',')])

  const view = useMemo(() => {
    if (!acc) return null
    const { cash, holdings, closed } = replay(acc.principal, trades)
    const ready = codes.every((c) => prices[c]) && prices.KOSPI
    const positions = holdings.map((h) => {
      const last = prices[h.code]?.at(-1)?.[1] ?? h.cost / h.qty
      const value = h.qty * last
      const avg = h.cost / h.qty
      return { ...h, avg, last, value, profit: value - h.cost, rate: ((last - avg) / avg) * 100 }
    })
    const total = cash + positions.reduce((s, p) => s + p.value, 0)
    const start = trades.length ? [...trades].sort((a, b) => (a.at < b.at ? -1 : 1))[0].at.slice(0, 10) : acc.startedAt.slice(0, 10)
    let indexRate = null
    let series = null
    if (ready && trades.length) {
      const k = prices.KOSPI
      const k0 = closeOn(k, start)
      if (k0) indexRate = (k.at(-1)[1] / k0 - 1) * 100
      series = performanceSeries(acc.principal, trades, prices, k, start)
    }
    const evals = trades.length ? evaluate({ account, principal: acc.principal, total, cash, positions, closed, indexRate }) : []
    return { cash, positions, closed, total, rate: (total / acc.principal - 1) * 100, indexRate, series, evals, ready, start }
  }, [acc, trades, prices, account, codes])

  const position = (code) => view?.positions.find((p) => p.code === code)

  return (
    <section>
      <header className="screen-head">
        <h1>모의 투자</h1>
      </header>

      <div className="segmented account-tabs" role="tablist" aria-label="계좌">
        {ACCOUNTS.map((a) => (
          <button key={a.id} role="tab" aria-selected={account === a.id} aria-checked={account === a.id} onClick={() => setAccount(a.id)}>
            {a.label}
          </button>
        ))}
      </div>

      {!acc ? (
        <Setup account={ACCOUNTS.find((a) => a.id === account)} onStart={(p) => setPrincipal(account, p)} />
      ) : (
        <>
          <div className="summary">
            <p className="summary-label">총 평가금액</p>
            <p className="summary-total mono">{won.format(Math.round(view.total))}원</p>
            <p className={`summary-rate mono ${tone(view.rate)}`}>
              {signed(view.rate)}% ({view.total - acc.principal > 0 ? '+' : ''}
              {won.format(Math.round(view.total - acc.principal))}원)
            </p>
            <div className="kv compact">
              <p>
                <span>원금</span>
                <b className="mono">{won.format(acc.principal)}원</b>
              </p>
              <p>
                <span>현금</span>
                <b className="mono">{won.format(Math.round(view.cash))}원</b>
              </p>
              {view.indexRate != null && (
                <p>
                  <span>같은 기간 코스피</span>
                  <b className={`mono ${tone(view.indexRate)}`}>{signed(view.indexRate)}%</b>
                </p>
              )}
            </div>
            {!view.ready && trades.length > 0 && !priceError && <p className="hint">지금 가격을 불러오는 중이에요…</p>}
            {priceError && <p className="error">{priceError} 지금은 산 값 기준으로 보여 줘요.</p>}
          </div>

          <div className="button-pair">
            <button className="btn buy" onClick={() => setTrade({ side: 'buy' })}>
              <Plus size={18} weight="bold" /> 사기
            </button>
          </div>

          {view.series && (
            <section>
              <h4 className="section-title">내 계좌 vs 코스피</h4>
              <LineChart
                label="내 계좌와 코스피 수익 비교"
                height={180}
                formatY={(v) => `${signed(v - 100, 1)}%`}
                series={[
                  { id: 'mine', label: '내 계좌', color: 'var(--chart-mine)', points: view.series.map((p) => [p.date, p.mine]) },
                  { id: 'index', label: '코스피', color: 'var(--chart-index)', dashed: true, points: view.series.map((p) => [p.date, p.index]) },
                ]}
              />
              <p className="hint">{view.start}에 둘 다 0%에서 출발했다고 놓고 비교해요.</p>
            </section>
          )}

          <section>
            <h4 className="section-title">가진 종목</h4>
            {view.positions.length === 0 ? (
              <p className="hint">{trades.length ? '지금 가진 종목이 없어요. 모두 현금이에요.' : '아직 산 종목이 없어요. "사기"로 첫 거래를 기록해 보세요.'}</p>
            ) : (
              <ul className="card-list">
                {view.positions.map((p) => (
                  <li key={p.code}>
                    <button className="card holding" onClick={() => setDetail(p)}>
                      <span className="holding-top">
                        <span className="card-title">{p.name}</span>
                        <span className={`mono holding-rate ${tone(p.rate)}`}>{signed(p.rate)}%</span>
                      </span>
                      <span className="card-meta">
                        <span className="mono">{won.format(p.qty)}주</span>
                        <span className="mono">평균 {won.format(Math.round(p.avg))}원</span>
                        <span className="mono">지금 {won.format(p.last)}원</span>
                        <span>{Math.round((p.value / view.total) * 100)}% 비중</span>
                        <span>{daysBetween(p.firstAt, new Date().toISOString())}일째</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {view.evals.length > 0 && (
            <section>
              <h4 className="section-title">평가</h4>
              <ul className="eval-list">
                {view.evals.map((e) => (
                  <li key={e.key} className={`eval ${e.level}`}>
                    <p className="eval-title">
                      <span className="eval-badge">{e.level === 'good' ? '잘함' : e.level === 'bad' ? '문제' : '보통'}</span>
                      {e.title}
                    </p>
                    <p>{e.text}</p>
                    <p className="eval-rule">
                      <Info size={13} /> 기준: {e.rule}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="hint">기준은 고정되어 있고, 기대와 상관없이 같은 기준으로 평가해요. 수수료와 세금은 아직 빼지 않았어요.</p>
            </section>
          )}

          {view.closed.length > 0 && (
            <section>
              <h4 className="section-title">끝난 거래</h4>
              <ul className="trade-list">
                {[...view.closed].reverse().map((c) => (
                  <li key={c.trade.id}>
                    <div>
                      <b>{c.trade.name}</b>{' '}
                      <span className={`mono ${tone(c.rate)}`}>
                        {signed(c.rate)}% ({c.profit > 0 ? '+' : ''}
                        {won.format(Math.round(c.profit))}원)
                      </span>
                      <p className="hint">
                        {c.trade.at.slice(0, 10)}에 팔았어요 · {c.heldDays}일 보유
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button
            className="btn ghost reset"
            onClick={() => {
              if (window.confirm(`${ACCOUNTS.find((a) => a.id === account).label} 계좌를 처음부터 다시 시작할까요? 이 계좌의 거래 기록이 모두 지워져요.`))
                resetAccount(account)
            }}
          >
            이 계좌 처음부터 다시 하기
          </button>
        </>
      )}

      {detail && (
        <HoldingDetail
          stock={detail}
          position={position(detail.code)}
          trades={trades}
          onBuy={() => setTrade({ side: 'buy', stock: detail })}
          onSell={() => setTrade({ side: 'sell', stock: detail })}
          onDeleteTrade={(id) => {
            if (holdingQty(trades, detail.code, id) < 0) {
              window.alert('이 거래를 지우면 판 수량이 산 수량보다 많아져요. 판 기록부터 지워 주세요.')
              return
            }
            removeTrade(id)
          }}
          onClose={() => setDetail(null)}
        />
      )}

      {/* 사고팔기 화면은 종목 화면 위에 떠야 해서 맨 마지막에 둔다 */}
      {trade && (
        <TradeForm
          side={trade.side}
          stock={trade.stock}
          cash={view?.cash ?? 0}
          maxQty={trade.stock ? holdingQty(trades, trade.stock.code) : 0}
          onSave={(t) => {
            addTrade({ ...t, account })
            setTrade(null)
          }}
          onClose={() => setTrade(null)}
        />
      )}
    </section>
  )
}

function Setup({ account, onStart }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const start = (e) => {
    e.preventDefault()
    const n = Math.floor(Number(amount))
    if (!(n >= 100_000)) return setError('10만 원 이상으로 정해 주세요.')
    onStart(n)
  }

  return (
    <form className="setup" onSubmit={start} noValidate>
      <h2>{account.label} 계좌 시작하기</h2>
      <p className="hint">{account.hint}. 가상의 원금을 정하면, 그 안에서만 사고팔 수 있어요.</p>
      <div className="option-row">
        {PRESETS.map((p) => (
          <button key={p} type="button" className="chip" aria-pressed={Number(amount) === p} onClick={() => setAmount(String(p))}>
            {p / 10_000 >= 1000 ? `${p / 100_000_000 >= 1 ? p / 100_000_000 + '억' : p / 10_000_000 + '천만'}` : `${p / 10_000}만`}원
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="principal">원금 (원)</label>
        <input id="principal" type="number" inputMode="numeric" min="100000" step="10000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {Number(amount) > 0 && <p className="hint mono">{won.format(Number(amount))}원</p>}
        {error && <p className="error">{error}</p>}
      </div>
      <button type="submit" className="btn primary">
        시작하기
      </button>
    </form>
  )
}
