import { useStoredState } from './storage.js'

// AI 뉴스 연관 평가 결과를 계좌·종목별로 저장한다. 다시 부르면 요금이 나와서 저장해 두고 재사용한다.
export function useAnalyses() {
  const [map, setMap] = useStoredState('stock-study:analyses', {})
  const keyOf = (account, code) => `${account}:${code}`
  const get = (account, code) => map[keyOf(account, code)] ?? null
  const put = (account, code, value) => setMap((m) => ({ ...m, [keyOf(account, code)]: value }))
  return { get, put }
}

// 거래 기록이 바뀌었는지 알아보는 표시. 바뀌었으면 예전 평가는 "오래됨"으로 보여 준다.
export const tradesSignature = (trades) =>
  trades
    .map((t) => `${t.side}${t.at}${t.qty}${t.price}${t.memo ?? ''}`)
    .sort()
    .join('|')

export async function requestAnalysis({ passcode, account, stock, trades }) {
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
