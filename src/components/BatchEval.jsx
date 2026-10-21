import { useMemo, useState } from 'react'
import { Sparkle, CaretRight } from '@phosphor-icons/react'
import { useAnalysisStore, startAnalyses, statusOf, keyOf, clearJobError } from '../analysis.js'
import { PasscodeForm, useProgressStep } from './NewsEval.jsx'

const COST_PER_STOCK = 0.5 // 실제로 돌려 본 평균 비용(달러)
const STATUS_LABEL = { none: '평가 없음', stale: '거래가 바뀜', fresh: '최신 평가' }

// 이 계좌에서 거래한 종목 여러 개를 골라 한 번에 AI 평가를 맡긴다.
// 버튼을 눌렀을 때만 시작한다. 화면을 열었다고 자동으로 평가하지 않는다.
export default function BatchEval({ account, trades, onOpen }) {
  const { results, passcode, jobs } = useAnalysisStore()

  const stocks = useMemo(() => {
    const byCode = new Map()
    for (const t of trades) {
      const s = byCode.get(t.code) ?? { code: t.code, name: t.name, market: t.market, trades: [] }
      s.trades.push(t)
      byCode.set(t.code, s)
    }
    return [...byCode.values()]
  }, [trades])

  const rows = stocks.map((s) => {
    const job = jobs[keyOf(account, s.code)]
    return { ...s, status: statusOf(results, account, s.code, s.trades), job }
  })

  // 처음에는 평가가 없거나 오래된 종목만 골라 둔다. 고르기만 할 뿐 시작하지 않는다.
  const [picked, setPicked] = useState(() => new Set(rows.filter((r) => r.status !== 'fresh').map((r) => r.code)))
  const toggle = (code) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(code)) n.delete(code)
      else n.add(code)
      return n
    })

  const running = rows.filter((r) => r.job?.status === 'queued' || r.job?.status === 'running')
  const chosen = rows.filter((r) => picked.has(r.code) && !running.includes(r))

  if (stocks.length === 0) return null

  const start = () => {
    const cost = (chosen.length * COST_PER_STOCK).toFixed(1)
    if (!window.confirm(`${chosen.length}개 종목을 평가할까요? 크레딧이 약 $${cost} 들어요.`)) return
    startAnalyses(chosen.map((r) => ({ account, stock: { code: r.code, name: r.name, market: r.market }, trades: r.trades })))
    setPicked(new Set())
  }

  return (
    <section className="batch-eval">
      <h4 className="section-title">AI 뉴스 평가 (여러 종목)</h4>
      <p className="hint">평가할 종목을 고르고 버튼을 눌러요. 누르기 전에는 평가하지 않고, 크레딧도 쓰지 않아요.</p>

      <ul className="batch-list">
        {rows.map((r) => (
          <BatchRow key={r.code} row={r} checked={picked.has(r.code)} onToggle={() => toggle(r.code)} onOpen={() => onOpen(r)} />
        ))}
      </ul>

      {!passcode ? (
        <PasscodeForm
          onSaved={() => {
            // 비밀번호 때문에 실패한 종목은 다시 골라 둔다. 시작은 버튼을 눌러야 한다.
            const failed = rows.filter((r) => r.job?.status === 'error')
            failed.forEach((r) => clearJobError(keyOf(account, r.code)))
            if (failed.length) setPicked(new Set(failed.map((r) => r.code)))
          }}
        />
      ) : (
        <>
          <button type="button" className="btn primary full" disabled={chosen.length === 0} onClick={start}>
            <Sparkle size={18} /> {chosen.length ? `${chosen.length}개 평가받기 (약 $${(chosen.length * COST_PER_STOCK).toFixed(1)})` : '평가할 종목을 골라 주세요'}
          </button>
          {running.length > 0 && <p className="hint">평가 중 {running.length}개. 2개씩 차례로 진행해요. 다른 화면을 봐도 계속돼요. 앱을 완전히 끄면 멈춰요.</p>}
        </>
      )}
    </section>
  )
}

function BatchRow({ row, checked, onToggle, onOpen }) {
  const busy = row.job?.status === 'queued' || row.job?.status === 'running'
  const step = useProgressStep(row.job?.status === 'running' ? row.job.startedAt : null)
  const id = `batch-${row.code}`
  return (
    <li className="batch-row">
      <input id={id} type="checkbox" checked={busy ? false : checked} disabled={busy} onChange={onToggle} />
      <label htmlFor={id}>
        <span className="batch-name">{row.name}</span>
        <span className={`batch-status ${busy ? 'busy' : row.job?.status === 'error' ? 'error' : row.status}`}>
          {busy ? (row.job.status === 'queued' ? '차례 기다림' : step) : row.job?.status === 'error' ? row.job.error : STATUS_LABEL[row.status]}
        </span>
      </label>
      <button type="button" className="icon-btn" aria-label={`${row.name} 평가 보기`} onClick={onOpen}>
        <CaretRight size={18} />
      </button>
    </li>
  )
}
