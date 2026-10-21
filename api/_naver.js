// 네이버 증권 차트 자료를 받아 JSON으로 바꾼다.
// 공식으로 열어 둔 자료는 아니라서, 막히면 공공데이터포털 주식시세 API로 바꾼다.
// 파일 이름이 _로 시작하면 Vercel이 따로 주소를 만들지 않는다.

const SYMBOL = /^(KOSPI|KOSDAQ|[0-9A-Z]{6})$/

export async function fetchPrices(symbol, tf) {
  if (!SYMBOL.test(symbol)) throw Object.assign(new Error('종목 코드가 올바르지 않아요'), { status: 400, expose: true })
  const timeframe = tf === 'minute' ? 'minute' : 'day'
  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${symbol}&timeframe=${timeframe}&count=500&requestType=0`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw Object.assign(new Error('주가를 받지 못했어요'), { status: 502, expose: true })
  const xml = new TextDecoder('euc-kr').decode(await res.arrayBuffer())

  const name = xml.match(/name="([^"]*)"/)?.[1] ?? symbol
  const items = []
  for (const [, data] of xml.matchAll(/<item data="([^"]+)"/g)) {
    const [t, , , , close] = data.split('|')
    const c = Number(close)
    if (!Number.isFinite(c) || c <= 0) continue
    const date = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`
    items.push([timeframe === 'minute' ? `${date}T${t.slice(8, 10)}:${t.slice(10, 12)}` : date, c])
  }
  if (items.length === 0) throw Object.assign(new Error('주가 자료가 비어 있어요'), { status: 404, expose: true })
  return { symbol, name, tf: timeframe, items }
}

// Vercel 함수와 개발용 서버가 함께 쓰는 처리기. Node 기본 req/res만 쓴다.
export async function handlePriceRequest(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams
  const tf = params.get('tf') === 'minute' ? 'minute' : 'day'
  try {
    const body = await fetchPrices(params.get('symbol') ?? '', tf)
    res.statusCode = 200
    res.setHeader('Cache-Control', tf === 'minute' ? 's-maxage=60' : 's-maxage=600, stale-while-revalidate=3600')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  } catch (e) {
    res.statusCode = e.status ?? 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: e.message }))
  }
}
