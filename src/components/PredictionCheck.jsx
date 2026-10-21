import { useState } from 'react'
import { X, Trash, PencilSimple, ArrowSquareOut } from '@phosphor-icons/react'
import { DIRECTIONS, CONFIDENCES, changeRate, directionFromRate, directionLabel, FLAT_RANGE } from '../predictions.js'
import { naverUrl } from '../watchlist.js'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
const fmtDate = (ymd) => dateFormat.format(new Date(`${ymd}T00:00:00`))
const price = new Intl.NumberFormat('ko-KR')
const PAST = { up: '올랐어요', flat: '비슷했어요', down: '내렸어요' }

export default function PredictionCheck({ prediction: p, onSave, onEdit, onDelete, onClose }) {
  const [endPrice, setEndPrice] = useState(p.result?.endPrice ?? '')
  const [picked, setPicked] = useState(p.result?.direction ?? null)
  const [review, setReview] = useState(p.result?.review ?? '')
  const [error, setError] = useState('')

  const rate = changeRate(Number(p.startPrice), Number(endPrice))
  const autoDirection = directionFromRate(rate)
  const actual = autoDirection ?? picked
  const hit = actual ? actual === p.direction : null
  const confidence = CONFIDENCES.find((c) => c.id === p.confidence)?.label

  const submit = (e) => {
    e.preventDefault()
    if (!actual) return setError('실제로 어떻게 됐는지 골라 주세요.')
    onSave({
      ...p,
      result: {
        direction: actual,
        endPrice: endPrice === '' ? '' : Number(endPrice),
        review: review.trim(),
        checkedAt: p.result?.checkedAt ?? new Date().toISOString(),
      },
    })
  }

  const confirmDelete = () => {
    if (window.confirm('이 예측을 지울까요? 지우면 되돌릴 수 없어요.')) onDelete(p.id)
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="예측 결과">
      <form className="sheet-inner" onSubmit={submit} noValidate>
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={22} />
          </button>
          <h2>결과 확인</h2>
          <button type="submit" className="btn primary small">저장</button>
        </header>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="recap">
          <p className="card-kicker">
            {p.target.name}
            {p.target.kind === 'stock' && <span className="mono"> {p.target.code}</span>}
          </p>
          <h3>
            <span className={`dir dir-${p.direction}`}>{directionLabel(p.direction)}</span> 예상
          </h3>
          <p className="hint">
            {fmtDate(p.checkDate)} 확인 · 확신 {confidence}
            {p.startPrice ? ` · 그때 가격 ${price.format(p.startPrice)}` : ''}
          </p>
          <p className="recap-reason">{p.reason}</p>
          {p.newsTitle || p.newsUrl ? (
            <p className="hint">
              참고 뉴스:{' '}
              {/^https?:\/\//.test(p.newsUrl) ? (
                <a className="link" href={p.newsUrl} target="_blank" rel="noreferrer">
                  {p.newsTitle || p.newsUrl}
                </a>
              ) : (
                p.newsTitle
              )}
            </p>
          ) : null}
          {p.target.kind === 'stock' && (
            <a className="hint link with-icon" href={naverUrl(p.target.code)} target="_blank" rel="noreferrer">
              네이버 증권에서 지금 가격 보기 <ArrowSquareOut size={14} />
            </a>
          )}
        </div>

        <div className="field">
          <label htmlFor="check-price">확인한 날 가격 {p.startPrice ? '' : '(선택)'}</label>
          <input id="check-price" type="number" inputMode="decimal" min="0" value={endPrice} onChange={(e) => setEndPrice(e.target.value)} />
          {rate != null && (
            <p className="hint">
              <span className="mono">{rate > 0 ? '+' : ''}{rate.toFixed(2)}%</span> → {PAST[autoDirection]}
              {Math.abs(rate) <= FLAT_RANGE && ` (±${FLAT_RANGE}% 안쪽)`}
            </p>
          )}
        </div>

        {autoDirection == null && (
          <div className="field">
            <span className="label">실제로 어떻게 됐나요?</span>
            <div className="segmented" role="radiogroup" aria-label="실제 결과">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === d.id}
                  className={`seg-${d.id}`}
                  onClick={() => {
                    setPicked(d.id)
                    setError('')
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="hint">두 가격을 모두 적으면 자동으로 정해져요.</p>
          </div>
        )}

        {hit != null && (
          <p className={hit ? 'verdict-box hit' : 'verdict-box miss'}>
            {hit ? '맞았어요.' : `틀렸어요. ${directionLabel(p.direction)}고 봤는데 실제로는 ${PAST[actual]}.`}
          </p>
        )}

        <div className="field">
          <label htmlFor="check-review">돌아보기</label>
          <textarea id="check-review" rows={5} value={review} onChange={(e) => setReview(e.target.value)} />
          <p className="hint">이유가 맞았는지 따로 봐요. 맞혔어도 이유가 틀렸다면 운이었을 수 있어요.</p>
        </div>

        <div className="button-row">
          {!p.result && (
            <button type="button" className="btn ghost" onClick={onEdit}>
              <PencilSimple size={18} /> 예측 내용 고치기
            </button>
          )}
          <button type="button" className="btn danger" onClick={confirmDelete}>
            <Trash size={18} /> 예측 지우기
          </button>
        </div>
      </form>
    </div>
  )
}
