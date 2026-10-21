import { useSyncExternalStore } from 'react'

// AI 뉴스 연관 평가를 한곳에서 관리한다.
// 평가가 진행 중일 때 화면을 옮겨도 결과가 저장되도록, 화면(컴포넌트) 밖에 둔다.
// 평가는 사용자가 버튼을 눌렀을 때만 시작한다. 자동으로 돌리지 않는다.

const RESULTS_KEY = 'stock-study:analyses'
const PASSCODE_KEY = 'stock-study:passcode'
const CONCURRENCY = 2 // 동시에 2개까지. 더 많으면 오래 걸리는 요청이 서로 밀린다.

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 공간 문제. 화면은 계속 동작한다.
  }
}

let state = {
  results: read(RESULTS_KEY, {}), // "계좌:종목코드" → 평가 결과
  passcode: read(PASSCODE_KEY, ''),
  jobs: {}, // "계좌:종목코드" → { status: 'queued' | 'running' | 'error', error?, startedAt? }
}
const listeners = new Set()
const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const keyOf = (account, code) => `${account}:${code}`

export function useAnalysisStore() {
  return useSyncExternalStore(subscribe, () => state)
}

export function setPasscode(passcode) {
  write(PASSCODE_KEY, passcode)
  set({ passcode })
}

// 거래 기록이 바뀌었는지 알아보는 표시. 바뀌었으면 예전 평가는 "오래됨"으로 보여 준다.
export const tradesSignature = (trades) =>
  trades
    .map((t) => `${t.side}${t.at}${t.qty}${t.price}${t.memo ?? ''}`)
    .sort()
    .join('|')

// 평가 상태: 'none' 평가 없음 / 'stale' 거래가 바뀜 / 'fresh' 최신
export function statusOf(results, account, code, trades) {
  const saved = results[keyOf(account, code)]
  if (!saved) return 'none'
  return saved.signature === tradesSignature(trades) ? 'fresh' : 'stale'
}

async function requestAnalysis({ passcode, account, stock, trades }) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-passcode': passcode },
    body: JSON.stringify({
      account,
      stock: { code: stock.code, name: stock.name, market: stock.market },
      trades: trades.map(({ side, at, qty, price, memo }) => ({ side, at, qty, price, memo })),
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body.error ?? 'AI 평가를 받지 못했어요'), { status: res.status })
  return body
}

const queue = []
let active = 0

const setJob = (key, job) => {
  const jobs = { ...state.jobs }
  if (job) jobs[key] = job
  else delete jobs[key]
  set({ jobs })
}

// items: [{ account, stock, trades }]. 이미 진행 중인 종목은 건너뛴다.
export function startAnalyses(items) {
  for (const item of items) {
    const key = keyOf(item.account, item.stock.code)
    if (state.jobs[key]?.status === 'queued' || state.jobs[key]?.status === 'running') continue
    setJob(key, { status: 'queued' })
    queue.push({ ...item, key })
  }
  pump()
}

function pump() {
  while (active < CONCURRENCY && queue.length) {
    const job = queue.shift()
    active++
    run(job).finally(() => {
      active--
      pump()
    })
  }
}

async function run({ key, account, stock, trades }) {
  if (!state.passcode) return setJob(key, { status: 'error', error: '앱 비밀번호를 먼저 넣어 주세요.' })
  setJob(key, { status: 'running', startedAt: Date.now() })
  try {
    const body = await requestAnalysis({ passcode: state.passcode, account, stock, trades })
    const results = { ...state.results, [key]: { ...body, signature: tradesSignature(trades) } }
    write(RESULTS_KEY, results)
    set({ results })
    setJob(key, null)
  } catch (e) {
    if (e.status === 401) {
      setPasscode('')
      // 비밀번호가 틀리면 남은 평가도 모두 멈춘다 (어차피 다 실패한다)
      for (const j of queue.splice(0)) setJob(j.key, { status: 'error', error: e.message })
    }
    setJob(key, { status: 'error', error: e.message })
  }
}

export const clearJobError = (key) => {
  if (state.jobs[key]?.status === 'error') setJob(key, null)
}
