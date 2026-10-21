import { useEffect, useState } from 'react'
import { Sparkle, ArrowSquareOut, Warning } from '@phosphor-icons/react'
import { useAnalysisStore, setPasscode, startAnalyses, statusOf, keyOf, clearJobError } from '../analysis.js'

const when = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const GRADE_CLASS = { 좋음: 'good', 보통: 'neutral', 나쁨: 'bad', '판단 보류': 'neutral' }
const STEPS = ['국내 뉴스를 찾는 중이에요', '해외 뉴스를 찾는 중이에요', '공시와 소문을 확인하는 중이에요', '거래 시점과 맞춰 보는 중이에요', '평가를 쓰는 중이에요']

// 평가가 시작된 뒤 지난 시간에 맞춰 진행 문구를 보여 준다
export function useProgressStep(startedAt) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [startedAt])
  return startedAt ? STEPS[Math.min(Math.floor((now - startedAt) / 20000), STEPS.length - 1)] : null
}

// 한 종목의 거래를 뉴스·지수와 엮어 AI가 평가한다
export default function NewsEval({ account, stock, trades }) {
  const { results, passcode, jobs } = useAnalysisStore()
  const key = keyOf(account, stock.code)
  const saved = results[key]
  const stale = statusOf(results, account, stock.code, trades) === 'stale'
  const job = jobs[key]
  const busy = job?.status === 'queued' || job?.status === 'running'
  const error = job?.status === 'error' ? job.error : ''
  const step = useProgressStep(job?.status === 'running' ? job.startedAt : null)

  const run = () => {
    clearJobError(key)
    startAnalyses([{ account, stock, trades }])
  }

  return (
    <section className="news-eval">
      <h4 className="section-title">뉴스 연관 평가</h4>

      {saved && !busy && <EvalResult data={saved} stale={stale} />}

      {!passcode ? (
        <PasscodeForm error={error} onSaved={() => clearJobError(key)} />
      ) : busy ? (
        <div className="eval-busy" aria-live="polite">
          <p>
            <Sparkle size={16} /> {job.status === 'queued' ? '차례를 기다리는 중이에요' : step}…
          </p>
          <p className="hint">1~3분 걸려요. 이 화면을 닫아도 계속돼요. 앱을 완전히 끄면 멈춰요.</p>
        </div>
      ) : (
        <>
          {error && <p className="error">{error}</p>}
          <button type="button" className="btn ghost with-gap" onClick={run}>
            <Sparkle size={18} /> {saved ? '다시 평가받기' : 'AI 평가받기'}
          </button>
          <p className="hint">국내·해외 뉴스와 소문을 찾아 이 종목 거래를 평가해요. 한 번에 크레딧 약 $0.5를 쓰고, 1~3분 걸려요.</p>
        </>
      )}
    </section>
  )
}

// AI 평가용 앱 비밀번호 입력. 한 번 넣으면 휴대폰에 기억한다.
export function PasscodeForm({ error, onSaved }) {
  const [draft, setDraft] = useState('')
  return (
    <form
      className="field passcode-form"
      onSubmit={(e) => {
        e.preventDefault()
        const code = draft.trim()
        if (!code) return
        setPasscode(code)
        setDraft('')
        onSaved?.()
      }}
    >
      <label htmlFor="passcode">앱 비밀번호</label>
      <input id="passcode" type="password" autoComplete="current-password" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <p className="hint">AI 평가는 요금이 나와서, 비밀번호를 아는 사람만 쓸 수 있어요. 한 번 넣으면 이 휴대폰에 기억해요.</p>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn ghost">
        저장
      </button>
    </form>
  )
}

function Grade({ value }) {
  return <span className={`eval-badge grade-${GRADE_CLASS[value] ?? 'neutral'}`}>{value}</span>
}

function EvalResult({ data, stale }) {
  const r = data.result
  return (
    <div className="eval-result">
      {stale && (
        <p className="eval-stale">
          <Warning size={16} /> 이 평가 뒤에 거래 기록이 바뀌었어요. 다시 평가받으면 최신 기록으로 평가해요.
        </p>
      )}

      <div className={`eval ${GRADE_CLASS[r.overall.grade]}`}>
        <p className="eval-title">
          <Grade value={r.overall.grade} /> 종합
        </p>
        <p>{r.overall.headline}</p>
      </div>

      <dl className="eval-grid">
        <div>
          <dt>
            <Grade value={r.decision.grade} /> 판단 (그때 알 수 있던 정보로)
          </dt>
          <dd>{r.decision.text}</dd>
        </div>
        <div>
          <dt>
            <Grade value={r.outcome.grade} /> 결과
          </dt>
          <dd>{r.outcome.text}</dd>
        </div>
        <div>
          <dt>실력과 운</dt>
          <dd>{r.luck_vs_skill}</dd>
        </div>
        <div>
          <dt>시장(코스피)과의 관계</dt>
          <dd>{r.market}</dd>
        </div>
        <div>
          <dt>
            전망: <b>{r.outlook.direction}</b>
          </dt>
          <dd>{r.outlook.text}</dd>
        </div>
      </dl>

      {r.lessons.length > 0 && (
        <div>
          <p className="label">다음 거래에 적용할 점</p>
          <ul className="lessons">
            {r.lessons.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {r.news.length > 0 && (
        <div>
          <p className="label">근거로 쓴 정보 ({r.news.length})</p>
          <ul className="news-list">
            {r.news.map((n, i) => (
              <li key={i} className={n.reliability === '확인 안 된 소문' ? 'rumor' : ''}>
                <p className="news-meta">
                  <span className="pill">{n.region}</span>
                  <span className="pill">{n.reliability}</span>
                  <span className="pill">{n.timing}</span>
                  <span className={n.effect === '상승 요인' ? 'up' : n.effect === '하락 요인' ? 'down' : ''}>{n.effect}</span>
                </p>
                {/^https?:\/\//.test(n.url) ? (
                  <a className="news-title link" href={n.url} target="_blank" rel="noreferrer">
                    {n.title} <ArrowSquareOut size={13} />
                  </a>
                ) : (
                  <p className="news-title">{n.title}</p>
                )}
                <p className="hint">
                  {n.source}
                  {n.published && ` · ${n.published}`}
                </p>
                <p className="news-relation">{n.relation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="hint">
        {when.format(new Date(data.at))} 평가{data.costUsd != null && `, 크레딧 약 $${data.costUsd.toFixed(2)} 사용`}. 결과 등급은 코스피와의 차이로 자동 계산해요(2%p 기준). AI 평가는 틀릴 수 있어요. 공부용이며 매매 권유가 아니에요.
      </p>
    </div>
  )
}
