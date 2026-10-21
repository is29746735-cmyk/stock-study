import { useState } from 'react'
import { X, Trash, CaretRight } from '@phosphor-icons/react'
import { DIRECTIONS, CONFIDENCES, INDEXES, daysFromToday, todayInput } from '../predictions.js'
import { useWatchlist } from '../watchlist.js'
import StockPicker from './StockPicker.jsx'

const QUICK_DATES = [
  { label: '내일', days: 1 },
  { label: '1주 뒤', days: 7 },
  { label: '1달 뒤', days: 30 },
]

export default function PredictionForm({ prediction, onSave, onDelete, onClose }) {
  const isNew = !prediction.id
  const { items: watched } = useWatchlist()

  const [target, setTarget] = useState(prediction.target ?? null)
  const [picking, setPicking] = useState(false)
  const [direction, setDirection] = useState(prediction.direction ?? 'up')
  const [checkDate, setCheckDate] = useState(prediction.checkDate ?? daysFromToday(7))
  const [confidence, setConfidence] = useState(prediction.confidence ?? 'mid')
  const [reason, setReason] = useState(prediction.reason ?? '')
  const [newsTitle, setNewsTitle] = useState(prediction.newsTitle ?? '')
  const [newsUrl, setNewsUrl] = useState(prediction.newsUrl ?? '')
  const [startPrice, setStartPrice] = useState(prediction.startPrice ?? '')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!target) return setError('무엇을 예측할지 골라 주세요.')
    if (!reason.trim()) return setError('예상한 이유를 적어 주세요. 나중에 돌아볼 때 가장 중요해요.')
    onSave({
      ...prediction,
      target,
      direction,
      checkDate,
      confidence,
      reason: reason.trim(),
      newsTitle: newsTitle.trim(),
      newsUrl: newsUrl.trim(),
      startPrice: startPrice === '' ? '' : Number(startPrice),
    })
  }

  const confirmDelete = () => {
    if (window.confirm('이 예측을 지울까요? 지우면 되돌릴 수 없어요.')) onDelete(prediction.id)
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={isNew ? '새 예측' : '예측 수정'}>
      <form className="sheet-inner" onSubmit={submit} noValidate>
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={22} />
          </button>
          <h2>{isNew ? '새 예측' : '예측 수정'}</h2>
          <button type="submit" className="btn primary small">저장</button>
        </header>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="field">
          <span className="label">무엇을 예측할까요?</span>
          <div className="option-row">
            {INDEXES.map((ix) => (
              <button
                key={ix.code}
                type="button"
                className="chip"
                aria-pressed={target?.code === ix.code}
                onClick={() => {
                  setTarget(ix)
                  setError('')
                }}
              >
                {ix.name}
              </button>
            ))}
          </div>
          <button type="button" className="picker-btn" onClick={() => setPicking(true)}>
            {target?.kind === 'stock' ? (
              <span>
                <strong>{target.name}</strong> <span className="mono hint">{target.code}</span>
              </span>
            ) : (
              <span className="hint">종목 고르기</span>
            )}
            <CaretRight size={18} />
          </button>
        </div>

        <div className="field">
          <span className="label">어떻게 될까요?</span>
          <div className="segmented" role="radiogroup" aria-label="예상 방향">
            {DIRECTIONS.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={direction === d.id} className={`seg-${d.id}`} onClick={() => setDirection(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <p className="hint">1% 안쪽으로 움직이면 "비슷하다"로 봐요.</p>
        </div>

        <div className="field">
          <label htmlFor="pred-date">언제 확인할까요?</label>
          <div className="option-row">
            {QUICK_DATES.map((q) => (
              <button key={q.days} type="button" className="chip" aria-pressed={checkDate === daysFromToday(q.days)} onClick={() => setCheckDate(daysFromToday(q.days))}>
                {q.label}
              </button>
            ))}
          </div>
          <input id="pred-date" type="date" min={todayInput()} value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="pred-reason">예상한 이유</label>
          <textarea
            id="pred-reason"
            rows={5}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError('')
            }}
          />
          <p className="hint">예: 수출 실적이 좋게 나왔다는 기사를 봤다. 시장은 아직 반영을 덜 한 것 같다.</p>
        </div>

        <div className="field">
          <span className="label">얼마나 확신해요?</span>
          <div className="segmented" role="radiogroup" aria-label="확신 정도">
            {CONFIDENCES.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={confidence === c.id} onClick={() => setConfidence(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <p className="hint">확신이 높을 때 실제로 더 잘 맞히는지 나중에 성적으로 보여 줘요.</p>
        </div>

        <div className="field">
          <label htmlFor="pred-news">참고한 뉴스 (선택)</label>
          <input id="pred-news" value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} placeholder="기사 제목" />
          <input type="url" inputMode="url" aria-label="뉴스 링크" value={newsUrl} onChange={(e) => setNewsUrl(e.target.value)} placeholder="https://" />
        </div>

        <div className="field">
          <label htmlFor="pred-price">지금 가격 (선택)</label>
          <input id="pred-price" type="number" inputMode="decimal" min="0" value={startPrice} onChange={(e) => setStartPrice(e.target.value)} />
          <p className="hint">적어 두면 결과를 적을 때 오르내린 비율을 계산해 줘요.</p>
        </div>

        {!isNew && (
          <button type="button" className="btn danger" onClick={confirmDelete}>
            <Trash size={18} /> 예측 지우기
          </button>
        )}
      </form>

      {picking && (
        <StockPicker
          watchedCodes={new Set(watched.map((s) => s.code))}
          onPick={(s) => {
            setTarget({ kind: 'stock', code: s.code, name: s.name, market: s.market })
            setPicking(false)
            setError('')
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
