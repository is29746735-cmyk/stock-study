import { useMemo, useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { usePredictions, isDue, isHit, scoreOf, directionLabel } from '../predictions.js'
import PredictionForm from '../components/PredictionForm.jsx'
import PredictionCheck from '../components/PredictionCheck.jsx'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })
const fmtDate = (ymd) => dateFormat.format(new Date(`${ymd}T00:00:00`))

const FILTERS = [
  { id: 'due', label: '확인할 때 됨', test: isDue },
  { id: 'waiting', label: '기다리는 중', test: (p) => !p.result && !isDue(p) },
  { id: 'done', label: '끝남', test: (p) => !!p.result },
  { id: 'all', label: '전체', test: () => true },
]

const percent = (hits, total) => (total ? Math.round((hits / total) * 100) : 0)

export default function PredictionsScreen() {
  const { items, save, remove } = usePredictions()
  const dueCount = items.filter(isDue).length
  const [filter, setFilter] = useState(dueCount > 0 ? 'due' : 'all')
  const [form, setForm] = useState(null) // 새 예측 {} 또는 수정할 예측
  const [checking, setChecking] = useState(null)

  const score = useMemo(() => scoreOf(items), [items])
  const visible = items.filter(FILTERS.find((f) => f.id === filter).test)

  const open = (p) => (p.result || isDue(p) ? setChecking(p) : setForm(p))

  return (
    <section>
      <header className="screen-head">
        <h1>예측 기록</h1>
        {items.length > 0 && <p className="count">{items.length}개</p>}
      </header>

      {score.total > 0 && (
        <div className="score" aria-label="예측 성적">
          <p className="score-main">
            맞힌 예측 <strong className="mono">{score.hits}</strong> / <span className="mono">{score.total}</span>
            <span className="score-rate mono">{percent(score.hits, score.total)}%</span>
          </p>
          <p className="score-sub">
            확신별 적중:{' '}
            {score.byConfidence
              .filter((c) => c.total > 0)
              .map((c) => `${c.label} ${c.hits}/${c.total}`)
              .join(', ')}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="chips" role="tablist" aria-label="예측 상태">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className="chip" onClick={() => setFilter(f.id)}>
              {f.label}
              {f.id === 'due' && dueCount > 0 && <span className="chip-count mono">{dueCount}</span>}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <h2>뉴스를 보고 예상해 볼까요?</h2>
          <p>"이 종목은 오를 것 같다"처럼 적어 두고, 정한 날짜에 실제 결과와 비교해요.</p>
          <button className="btn primary" onClick={() => setForm({})}>
            <Plus size={18} weight="bold" /> 새 예측
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p>{filter === 'due' ? '지금 확인할 예측이 없어요.' : '해당하는 예측이 없어요.'}</p>
        </div>
      ) : (
        <ul className="card-list">
          {visible.map((p) => (
            <li key={p.id}>
              <button className="card" onClick={() => open(p)}>
                <span className="card-kicker">
                  {p.target.name}
                  {p.target.kind === 'stock' && <span className="mono"> {p.target.code}</span>}
                </span>
                <span className="card-title">
                  <span className={`dir dir-${p.direction}`}>{directionLabel(p.direction)}</span> 예상
                </span>
                {p.reason && <span className="card-body">{p.reason}</span>}
                <span className="card-meta">
                  {p.result ? (
                    <span className={isHit(p) ? 'verdict hit' : 'verdict miss'}>
                      {isHit(p) ? '맞음' : '틀림'}
                    </span>
                  ) : isDue(p) ? (
                    <span className="verdict due">결과 적을 차례</span>
                  ) : null}
                  <span>{fmtDate(p.checkDate)} 확인</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <button className="fab" aria-label="새 예측" onClick={() => setForm({})}>
          <Plus size={26} weight="bold" />
        </button>
      )}

      {form && (
        <PredictionForm
          prediction={form}
          onSave={(p) => {
            save(p)
            setForm(null)
          }}
          onDelete={(id) => {
            remove(id)
            setForm(null)
          }}
          onClose={() => setForm(null)}
        />
      )}

      {checking && (
        <PredictionCheck
          prediction={checking}
          onSave={(p) => {
            save(p)
            setChecking(null)
            setFilter('done')
          }}
          onEdit={() => {
            setForm(checking)
            setChecking(null)
          }}
          onDelete={(id) => {
            remove(id)
            setChecking(null)
          }}
          onClose={() => setChecking(null)}
        />
      )}
    </section>
  )
}
