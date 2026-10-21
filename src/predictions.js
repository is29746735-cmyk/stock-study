import { useStoredState } from './storage.js'

export const DIRECTIONS = [
  { id: 'up', label: '오른다' },
  { id: 'flat', label: '비슷하다' },
  { id: 'down', label: '내린다' },
]
export const directionLabel = (id) => DIRECTIONS.find((d) => d.id === id)?.label ?? ''

export const CONFIDENCES = [
  { id: 'low', label: '낮음' },
  { id: 'mid', label: '보통' },
  { id: 'high', label: '높음' },
]

export const INDEXES = [
  { kind: 'index', code: 'KOSPI', name: '코스피 지수', market: '지수' },
  { kind: 'index', code: 'KOSDAQ', name: '코스닥 지수', market: '지수' },
]

// 1% 안쪽으로 움직이면 "비슷하다"로 본다.
export const FLAT_RANGE = 1

export function changeRate(start, end) {
  if (!(start > 0) || !(end > 0)) return null
  return ((end - start) / start) * 100
}

export function directionFromRate(rate) {
  if (rate == null) return null
  if (rate > FLAT_RANGE) return 'up'
  if (rate < -FLAT_RANGE) return 'down'
  return 'flat'
}

const pad = (n) => String(n).padStart(2, '0')
export const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayInput = () => toDateInput(new Date())
export const daysFromToday = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toDateInput(d)
}

// 확인 날짜가 오늘이거나 지났는데 아직 결과를 안 적은 예측
export const isDue = (p) => !p.result && p.checkDate <= todayInput()

export const isHit = (p) => p.result && p.result.direction === p.direction

export function usePredictions() {
  const [items, setItems] = useStoredState('stock-study:predictions', [])

  const save = (p) => {
    const now = new Date().toISOString()
    if (p.id) setItems((list) => list.map((x) => (x.id === p.id ? { ...p, updatedAt: now } : x)))
    else setItems((list) => [{ ...p, id: crypto.randomUUID(), createdAt: now, updatedAt: now, result: null }, ...list])
  }

  const remove = (id) => setItems((list) => list.filter((x) => x.id !== id))

  return { items, save, remove }
}

// 끝난 예측만 모아 맞힌 비율을 계산한다. 확신 정도별로도 나눠서 본다.
export function scoreOf(items) {
  const done = items.filter((p) => p.result)
  const hits = done.filter(isHit).length
  const byConfidence = CONFIDENCES.map((c) => {
    const group = done.filter((p) => p.confidence === c.id)
    return { ...c, total: group.length, hits: group.filter(isHit).length }
  })
  return { total: done.length, hits, byConfidence }
}
