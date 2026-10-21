// 한국거래소(KIND)의 상장법인 목록을 받아 src/data/stocks.json으로 저장한다.
// 새로 상장한 종목을 반영하고 싶을 때 `npm run stocks`로 다시 돌린다.
import { writeFileSync, mkdirSync } from 'node:fs'

const MARKETS = [
  { type: 'stockMkt', label: '코스피' },
  { type: 'kosdaqMkt', label: '코스닥' },
]

const clean = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

async function fetchMarket({ type, label }) {
  const url = `https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13&marketType=${type}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label} 목록을 못 받았어요 (${res.status})`)
  const html = new TextDecoder('euc-kr').decode(await res.arrayBuffer())

  const rows = html.split(/<tr>/i).slice(2) // 첫 조각은 머리말, 다음은 제목 줄
  return rows
    .map((row) => row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi)?.map(clean) ?? [])
    .filter((cells) => cells.length >= 4 && cells[2])
    .map(([name, , code, sector]) => ({ code, name, market: label, sector }))
}

const all = (await Promise.all(MARKETS.map(fetchMarket))).flat()
all.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/stocks.json', JSON.stringify(all))
console.log(`종목 ${all.length}개 저장 (코스피 ${all.filter((s) => s.market === '코스피').length}, 코스닥 ${all.filter((s) => s.market === '코스닥').length})`)
