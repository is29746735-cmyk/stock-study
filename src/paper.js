import { useStoredState } from './storage.js'
import { closeOn } from './prices.js'

export const ACCOUNTS = [
  { id: 'short', label: '단타', hint: '며칠 안에 사고파는 연습' },
  { id: 'long', label: '장기', hint: '몇 달 이상 들고 가는 연습' },
]

const EMPTY = { accounts: { short: null, long: null }, trades: [] }

export function usePaper() {
  const [data, setData] = useStoredState('stock-study:paper', EMPTY)

  const setPrincipal = (account, principal) =>
    setData((d) => ({ ...d, accounts: { ...d.accounts, [account]: { principal, startedAt: new Date().toISOString() } } }))

  const addTrade = (t) =>
    setData((d) => ({ ...d, trades: [...d.trades, { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }))

  const removeTrade = (id) => setData((d) => ({ ...d, trades: d.trades.filter((t) => t.id !== id) }))

  // 계좌를 처음부터 다시 시작한다. 그 계좌의 거래도 함께 지운다.
  const resetAccount = (account) =>
    setData((d) => ({ accounts: { ...d.accounts, [account]: null }, trades: d.trades.filter((t) => t.account !== account) }))

  return { data, setPrincipal, addTrade, removeTrade, resetAccount }
}

const byTime = (a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.createdAt < b.createdAt ? -1 : 1)

// 거래 기록을 차례로 따라가며 현금, 보유 종목, 끝난 거래를 계산한다. 평균 단가 방식.
// 수수료와 세금은 아직 빼지 않는다.
export function replay(principal, trades, until) {
  let cash = principal
  const holdings = new Map()
  const closed = []
  for (const t of [...trades].sort(byTime)) {
    if (until && t.at.slice(0, 10) > until) break
    const amount = t.qty * t.price
    const h = holdings.get(t.code) ?? { code: t.code, name: t.name, market: t.market, qty: 0, cost: 0, firstAt: t.at }
    if (t.side === 'buy') {
      cash -= amount
      if (h.qty === 0) h.firstAt = t.at
      h.qty += t.qty
      h.cost += amount
    } else {
      const avg = h.qty ? h.cost / h.qty : 0
      cash += amount
      closed.push({
        trade: t,
        avg,
        profit: (t.price - avg) * t.qty,
        rate: avg ? ((t.price - avg) / avg) * 100 : 0,
        heldDays: daysBetween(h.firstAt, t.at),
      })
      h.cost -= avg * t.qty
      h.qty -= t.qty
    }
    if (h.qty > 0) holdings.set(t.code, h)
    else holdings.delete(t.code)
  }
  return { cash, holdings: [...holdings.values()], closed }
}

export const daysBetween = (a, b) => Math.round((new Date(b.slice(0, 10)) - new Date(a.slice(0, 10))) / 86400000)

export const holdingQty = (trades, code, exceptId) =>
  trades.filter((t) => t.code === code && t.id !== exceptId).reduce((q, t) => q + (t.side === 'buy' ? t.qty : -t.qty), 0)

// 날마다 계좌 평가액을 다시 계산해서, 같은 날 코스피와 나란히 놓는다 (시작일 = 100).
export function performanceSeries(principal, trades, priceMap, indexDays, startDate) {
  const days = indexDays.filter(([d]) => d >= startDate)
  if (days.length < 2) return null
  const base = days[0][1]
  return days.map(([date, indexClose]) => {
    const { cash, holdings } = replay(principal, trades, date)
    const value = holdings.reduce((sum, h) => sum + h.qty * (closeOn(priceMap[h.code] ?? [], date) ?? h.cost / h.qty), cash)
    return { date, mine: (value / principal) * 100, index: (indexClose / base) * 100, value }
  })
}

// ───────── 평가 ─────────
// 기준은 고정해 두고 화면에 그대로 보여 준다. 사용자의 기대와 상관없이 같은 기준을 쓴다.
export const RULES = {
  marketGap: 2, // 코스피보다 2%p 넘게 앞서거나 뒤지면 "잘함/못함"
  concentration: 40, // 한 종목이 전체의 40%를 넘으면 쏠림
  lowCash: 5, // 현금이 5% 아래면 여유 없음
  bigLoss: -10, // 산 값보다 10% 넘게 떨어진 종목을 들고 있으면 손실 관리 지적
  shortHold: 7, // 단타 계좌에서 7일 넘게 들고 있으면 단타가 아님
  longMinHold: 30, // 장기 계좌에서 30일 안에 팔면 장기가 아님
  minClosed: 3, // 끝난 거래가 3번 이상일 때만 승률을 평가
}

export function evaluate({ account, principal, total, cash, positions, closed, indexRate }) {
  const out = []
  const myRate = (total / principal - 1) * 100

  if (indexRate != null) {
    const gap = myRate - indexRate
    const level = gap > RULES.marketGap ? 'good' : gap < -RULES.marketGap ? 'bad' : 'neutral'
    let text =
      level === 'good'
        ? `같은 기간 코스피보다 ${gap.toFixed(1)}%p 더 벌었어요.`
        : level === 'bad'
          ? `같은 기간 코스피보다 ${Math.abs(gap).toFixed(1)}%p 뒤처졌어요.`
          : '같은 기간 코스피와 거의 같아요. 시장을 따라간 수준이에요.'
    if (myRate > 0 && level === 'bad') text += ' 돈은 벌었지만, 시장 전체가 더 많이 올랐어요. 판단 덕분이라고 보기 어려워요.'
    if (myRate < 0 && level === 'good') text += ' 손실이지만 시장보다는 덜 잃었어요.'
    out.push({ key: 'market', level, title: '시장 대비', text, rule: `코스피 수익률과 ${RULES.marketGap}%p 넘게 차이 나면 잘함/못함` })
  }

  const top = [...positions].sort((a, b) => b.value - a.value)[0]
  if (top) {
    const share = (top.value / total) * 100
    out.push({
      key: 'concentration',
      level: share > RULES.concentration ? 'bad' : 'neutral',
      title: '종목 쏠림',
      text:
        share > RULES.concentration
          ? `${top.name} 한 종목이 ${share.toFixed(0)}%예요. 이 종목이 크게 떨어지면 계좌 전체가 흔들려요.`
          : `가장 큰 종목(${top.name})이 ${share.toFixed(0)}%로, 한 곳에 몰리지 않았어요.`,
      rule: `한 종목이 전체의 ${RULES.concentration}%를 넘으면 쏠림`,
    })
  }

  const cashShare = (cash / total) * 100
  out.push({
    key: 'cash',
    level: cashShare < RULES.lowCash ? 'bad' : 'neutral',
    title: '현금 비중',
    text:
      cashShare < RULES.lowCash
        ? `현금이 ${cashShare.toFixed(0)}%뿐이에요. 떨어졌을 때 더 살 여유가 없어요.`
        : `현금이 ${cashShare.toFixed(0)}% 남아 있어요.`,
    rule: `현금이 ${RULES.lowCash}% 아래면 여유 없음`,
  })

  const losers = positions.filter((p) => p.rate <= RULES.bigLoss)
  if (losers.length) {
    out.push({
      key: 'loss',
      level: 'bad',
      title: '손실 관리',
      text: `${losers.map((p) => `${p.name}(${p.rate.toFixed(1)}%)`).join(', ')}을(를) 계속 들고 있어요. 처음에 산 이유가 아직 맞는지 다시 확인해야 해요.`,
      rule: `산 값보다 ${Math.abs(RULES.bigLoss)}% 넘게 떨어진 종목을 들고 있으면 지적`,
    })
  }

  const today = new Date().toISOString()
  if (account === 'short') {
    const stale = positions.filter((p) => daysBetween(p.firstAt, today) > RULES.shortHold)
    if (stale.length)
      out.push({
        key: 'style',
        level: 'bad',
        title: '투자 방식',
        text: `단타 계좌인데 ${stale.map((p) => p.name).join(', ')}을(를) ${RULES.shortHold}일 넘게 들고 있어요. 팔 때를 놓쳐서 오래 들고 있는 건 아닌지 봐야 해요.`,
        rule: `단타 계좌에서 ${RULES.shortHold}일 넘게 보유하면 지적`,
      })
  } else {
    const quick = closed.filter((c) => c.heldDays < RULES.longMinHold)
    if (quick.length)
      out.push({
        key: 'style',
        level: 'bad',
        title: '투자 방식',
        text: `장기 계좌인데 ${quick.length}번은 ${RULES.longMinHold}일 안에 팔았어요. 장기 계획이 흔들린 건 아닌지 봐야 해요.`,
        rule: `장기 계좌에서 ${RULES.longMinHold}일 안에 팔면 지적`,
      })
  }

  if (closed.length >= RULES.minClosed) {
    const wins = closed.filter((c) => c.profit > 0)
    const losses = closed.filter((c) => c.profit < 0)
    const avg = (list) => (list.length ? list.reduce((s, c) => s + c.rate, 0) / list.length : 0)
    const winRate = (wins.length / closed.length) * 100
    const avgWin = avg(wins)
    const avgLoss = avg(losses)
    let text = `팔아서 끝낸 거래 ${closed.length}번 중 ${wins.length}번 이익 (${winRate.toFixed(0)}%). 이익일 때 평균 +${avgWin.toFixed(1)}%, 손실일 때 평균 ${avgLoss.toFixed(1)}%.`
    let level = 'neutral'
    if (losses.length && Math.abs(avgLoss) > avgWin) {
      text += ' 이길 때보다 질 때 더 크게 잃어요. 이기는 횟수가 많아도 남는 게 적어요.'
      level = 'bad'
    } else if (winRate >= 50 && avgWin >= Math.abs(avgLoss)) level = 'good'
    out.push({ key: 'record', level, title: '매매 성적', text, rule: '이익 거래 비율과, 평균 이익·평균 손실 크기를 비교' })
  } else {
    out.push({
      key: 'record',
      level: 'neutral',
      title: '매매 성적',
      text: `팔아서 끝낸 거래가 ${closed.length}번이에요. ${RULES.minClosed}번 이상 쌓이면 평가해요. 적은 횟수로는 실력과 운을 구분할 수 없어요.`,
      rule: `끝난 거래 ${RULES.minClosed}번 이상부터 평가`,
    })
  }

  return out
}
