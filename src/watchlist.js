import { useStoredState } from './storage.js'

// 네이버 증권 모바일 종목 화면. 앱 안에서는 아직 주가를 못 보여줘서 바깥 링크로 연결한다.
export const naverUrl = (code) => `https://m.stock.naver.com/domestic/stock/${code}/total`

export function useWatchlist() {
  const [items, setItems] = useStoredState('stock-study:watchlist', [])

  const add = (stock, memo) => {
    const now = new Date().toISOString()
    setItems((list) => [{ ...stock, memo, addedAt: now, updatedAt: now }, ...list.filter((s) => s.code !== stock.code)])
  }

  const update = (code, memo) => {
    const now = new Date().toISOString()
    setItems((list) => list.map((s) => (s.code === code ? { ...s, memo, updatedAt: now } : s)))
  }

  const remove = (code) => setItems((list) => list.filter((s) => s.code !== code))

  return { items, add, update, remove }
}

// 상장 종목 목록은 크기가 커서 처음 검색할 때 한 번만 불러온다.
let stocksPromise
export const loadStocks = () => (stocksPromise ??= import('./data/stocks.json').then((m) => m.default))

const squash = (s) => s.toLowerCase().replace(/\s+/g, '')

export function searchStocks(stocks, query, limit = 40) {
  const q = squash(query)
  if (!q) return []
  const starts = []
  const contains = []
  for (const s of stocks) {
    const name = squash(s.name)
    if (s.code === q || name.startsWith(q) || s.code.startsWith(q)) starts.push(s)
    else if (name.includes(q)) contains.push(s)
  }
  const rank = (s) => [squash(s.name) === q || s.code === q ? 0 : 1, /스팩/.test(s.name) ? 1 : 0, s.market === '코스피' ? 0 : 1, s.name.length]
  const byRank = (a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
    return a.name.localeCompare(b.name, 'ko')
  }
  return [...starts.sort(byRank), ...contains.sort(byRank)].slice(0, limit)
}
