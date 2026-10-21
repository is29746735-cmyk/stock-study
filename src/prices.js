// /api/price에서 주가를 받아 온다. 같은 종목은 한 번만 받아서 재사용한다.
const cache = new Map()

export function getPrices(symbol, tf = 'day') {
  const key = `${symbol}:${tf}`
  if (!cache.has(key)) {
    const p = fetch(`/api/price?symbol=${encodeURIComponent(symbol)}&tf=${tf}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? '주가를 받지 못했어요')
        return body.items
      })
      .catch((e) => {
        cache.delete(key) // 실패하면 다음에 다시 시도한다
        throw e
      })
    cache.set(key, p)
  }
  return cache.get(key)
}

// 그 시각 가격: 분 단위 자료(최근 약 1주)에 있으면 그 분의 가격, 없으면 그날 종가.
export async function priceAt(symbol, at) {
  const date = at.slice(0, 10)
  try {
    const minutes = await getPrices(symbol, 'minute')
    if (minutes.length && minutes[0][0] <= at) {
      const sameDay = minutes.filter(([t]) => t.startsWith(date) && t <= at)
      if (sameDay.length) return { price: sameDay.at(-1)[1], source: 'minute', time: sameDay.at(-1)[0] }
    }
  } catch {
    // 분 단위 자료가 없으면 아래 하루 단위로 넘어간다
  }
  const days = await getPrices(symbol, 'day')
  const hit = days.filter(([d]) => d <= date).at(-1)
  if (!hit) throw new Error('그 날짜의 가격이 없어요')
  return { price: hit[1], source: 'day', time: hit[0] }
}

// 날짜 목록에서 그날(또는 그 전 가장 가까운 날) 종가
export function closeOn(days, date) {
  let lo = 0
  let hi = days.length - 1
  let found = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (days[mid][0] <= date) {
      found = days[mid][1]
      lo = mid + 1
    } else hi = mid - 1
  }
  return found
}
