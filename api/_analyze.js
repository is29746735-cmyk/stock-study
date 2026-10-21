// 한 종목의 모의 투자 거래를 뉴스·지수와 엮어 Claude가 평가한다.
// 원칙은 기획서.md "모의 투자 확장 계획 → 평가 원칙"을 따른다.
import Anthropic from '@anthropic-ai/sdk'
import { fetchPrices } from './_naver.js'

const MODEL = 'claude-opus-5-5'
const MARKET_GAP = 2 // 앱 화면 평가(src/paper.js RULES.marketGap)와 같은 기준
const GRADES = ['좋음', '보통', '나쁨', '판단 보류']

const SYSTEM = `당신은 한국 주식 모의 투자 기록을 평가하는 냉정한 평가자입니다. 사용자는 공부용으로 가상의 돈으로 거래했고, 당신의 평가로 자기 판단을 돌아봅니다.

## 해야 할 일
1. web_search로 이 종목의 뉴스를 찾습니다. 국내 뉴스와 해외 뉴스(영문 포함)를 모두 찾고, 공시와 커뮤니티 소문(찌라시)도 찾습니다. 거래 시각 전에 나온 정보와 후에 나온 정보를 구분합니다.
2. 찾은 정보와 주어진 가격·지수 자료로 평가한 뒤, 반드시 submit_evaluation 도구로 결과를 제출합니다. 제출이 이 작업의 유일한 출력입니다.

## 평가 원칙 (반드시 지킴)
- 사용자의 기대, 메모의 말투, 확신에 휘둘리지 않습니다. 같은 사실에는 같은 평가를 합니다.
- "판단"과 "결과"를 따로 평가합니다. 판단이 나빴는데 결과가 좋으면 운으로 봅니다. 판단이 좋았는데 결과가 나쁘면 그렇다고 말합니다.
- 결과가 좋아도 근거가 약했거나 앞으로 전망이 나쁘면 분명히 말합니다.
- 판단은 거래 시각에 공개되어 있던 정보로만 평가합니다. 나중에 나온 뉴스로 판단을 탓하지 않습니다(결과 설명에는 씁니다).
- 찌라시·커뮤니티 글은 확인되지 않은 정보로 표시하고 사실처럼 쓰지 않습니다. 찌라시만 보고 산 판단은 "나쁨"입니다.
- 검색 결과에 없는 기사 제목, 날짜, 주소를 지어내지 않습니다. 근거가 부족하면 "판단 보류"를 씁니다.
- 공부용 평가입니다. "사라", "팔아라" 같은 매매 권유를 하지 않습니다. 전망은 근거와 함께 "긍정/부정/불확실"로만 말합니다.

## 등급 기준 (고정)
- 판단(decision):
  - 좋음: 거래 이유가 구체적이고 그 시점 공개 정보(공시·주요 언론)로 뒷받침되며, 비중이나 손실 대비를 생각한 흔적이 있음.
  - 보통: 근거는 있지만 일부만 확인되거나, 이미 가격에 반영된 정보를 뒤늦게 따라감.
  - 나쁨: 이유가 없거나, 확인 안 된 소문만 근거이거나, 급등을 뒤쫓은 추격 매수·공포 매도.
  - 판단 보류: 이유 기록도 없고 그 시점 정보도 찾을 수 없음.
- 결과(outcome): 주어진 "결과 등급(코드 계산)"을 그대로 따르고, 왜 그렇게 됐는지 뉴스와 지수로 설명합니다.
- 종합(overall): 판단이 "나쁨"이면 결과가 좋아도 종합은 "보통" 이하입니다. 판단과 결과가 모두 좋을 때만 "좋음"입니다.

## 글쓰기
- 한국어로, 짧은 문장으로, 전문 용어는 쉬운 말로 풀어 씁니다.
- 숫자는 주어진 자료에서만 가져옵니다.`

const TOOL = {
  name: 'submit_evaluation',
  description: '평가 결과를 제출한다. 뉴스 검색을 마친 뒤 마지막에 한 번만 호출한다.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['overall', 'decision', 'outcome', 'luck_vs_skill', 'market', 'outlook', 'news', 'lessons'],
    properties: {
      overall: {
        type: 'object',
        additionalProperties: false,
        required: ['grade', 'headline'],
        properties: { grade: { type: 'string', enum: GRADES }, headline: { type: 'string', description: '한두 문장 요약' } },
      },
      decision: {
        type: 'object',
        additionalProperties: false,
        required: ['grade', 'text'],
        properties: { grade: { type: 'string', enum: GRADES }, text: { type: 'string', description: '거래 시점 정보로 본 판단 평가' } },
      },
      outcome: {
        type: 'object',
        additionalProperties: false,
        required: ['grade', 'text'],
        properties: { grade: { type: 'string', enum: GRADES }, text: { type: 'string', description: '결과와 그 이유' } },
      },
      luck_vs_skill: { type: 'string', description: '결과가 판단 덕분인지, 시장·운 덕분인지' },
      market: { type: 'string', description: '코스피 지수와의 관계' },
      outlook: {
        type: 'object',
        additionalProperties: false,
        required: ['direction', 'text'],
        properties: { direction: { type: 'string', enum: ['긍정', '부정', '불확실'] }, text: { type: 'string' } },
      },
      news: {
        type: 'array',
        description: '평가에 쓴 정보. 검색 결과에 실제로 있던 것만.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'source', 'url', 'published', 'region', 'reliability', 'timing', 'effect', 'relation'],
          properties: {
            title: { type: 'string' },
            source: { type: 'string', description: '언론사·사이트 이름' },
            url: { type: 'string' },
            published: { type: 'string', description: 'YYYY-MM-DD, 모르면 빈 문자열' },
            region: { type: 'string', enum: ['국내', '해외'] },
            reliability: { type: 'string', enum: ['공식 공시', '주요 언론', '기타 언론', '확인 안 된 소문'] },
            timing: { type: 'string', enum: ['거래 전', '거래 후', '모름'] },
            effect: { type: 'string', enum: ['상승 요인', '하락 요인', '중립'] },
            relation: { type: 'string', description: '이 정보가 거래와 어떻게 관련되는지' },
          },
        },
      },
      lessons: { type: 'array', items: { type: 'string' }, description: '다음 거래에 적용할 점 2~4개' },
    },
  },
}

const closeOn = (days, date) => days.filter(([d]) => d <= date).at(-1)?.[1] ?? null

export function buildContext({ account, stock, trades }, stockDays, kospiDays) {
  const sorted = [...trades].sort((a, b) => (a.at < b.at ? -1 : 1))
  const first = sorted[0].at.slice(0, 10)
  const last = stockDays.at(-1)
  const k0 = closeOn(kospiDays, first)
  const k1 = kospiDays.at(-1)[1]
  const indexRate = k0 ? (k1 / k0 - 1) * 100 : null

  // 평균 단가로 이 종목의 수익률을 계산한다 (앱 화면과 같은 방식)
  let qty = 0
  let cost = 0
  let realized = 0
  let invested = 0
  for (const t of sorted) {
    if (t.side === 'buy') {
      qty += t.qty
      cost += t.qty * t.price
      invested += t.qty * t.price
    } else {
      const avg = qty ? cost / qty : 0
      realized += (t.price - avg) * t.qty
      cost -= avg * t.qty
      qty -= t.qty
    }
  }
  const unrealized = qty * last[1] - cost
  const rate = invested ? ((realized + unrealized) / invested) * 100 : 0
  const gap = indexRate == null ? null : rate - indexRate
  const outcomeGrade = gap == null ? '판단 보류' : gap > MARKET_GAP ? '좋음' : gap < -MARKET_GAP ? '나쁨' : '보통'

  const window = stockDays.filter(([d]) => d >= shiftDate(first, -20))
  const lines = [
    `종목: ${stock.name} (${stock.code}, ${stock.market})`,
    `계좌: ${account === 'short' ? '단타 (며칠 안에 사고파는 연습)' : '장기 (몇 달 이상 들고 가는 연습)'}`,
    `오늘: ${new Date().toISOString().slice(0, 10)}, 최근 종가 ${last[1].toLocaleString('ko-KR')}원 (${last[0]})`,
    '',
    '## 거래 기록 (사용자가 적은 이유 포함)',
    ...sorted.map(
      (t) =>
        `- ${t.at.replace('T', ' ')} ${t.side === 'buy' ? '삼' : '팖'} ${t.qty}주 × ${t.price.toLocaleString('ko-KR')}원 / 그날 종가 ${closeOn(stockDays, t.at.slice(0, 10))?.toLocaleString('ko-KR') ?? '모름'}원 / 이유: ${t.memo || '(적지 않음)'}`,
    ),
    '',
    '## 숫자 (코드 계산)',
    `- 이 종목 수익률(실현+평가): ${rate.toFixed(2)}% (지금 ${qty}주 보유)`,
    `- 같은 기간 코스피: ${indexRate == null ? '모름' : indexRate.toFixed(2) + '%'} (${first} → ${kospiDays.at(-1)[0]})`,
    `- 결과 등급(코드 계산): ${outcomeGrade} — 기준: 코스피보다 ${MARKET_GAP}%p 넘게 앞서면 좋음, 뒤지면 나쁨`,
    '',
    '## 첫 거래 20일 전부터의 종가',
    window.map(([d, c]) => `${d.slice(5)} ${c}`).join(', '),
  ]
  return { text: lines.join('\n'), outcomeGrade, rate, indexRate }
}

function shiftDate(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function validate(body) {
  const { account, stock, trades } = body ?? {}
  if (!['short', 'long'].includes(account)) return '계좌 정보가 없어요'
  if (!stock || !/^[0-9A-Z]{6}$/.test(stock.code) || typeof stock.name !== 'string') return '종목 정보가 없어요'
  if (!Array.isArray(trades) || trades.length === 0 || trades.length > 100) return '거래 기록이 없어요'
  for (const t of trades) {
    if (!['buy', 'sell'].includes(t.side) || !(t.qty > 0) || !(t.price > 0) || typeof t.at !== 'string') return '거래 기록 형식이 올바르지 않아요'
    if (t.memo != null && (typeof t.memo !== 'string' || t.memo.length > 2000)) return '거래 이유가 너무 길어요'
  }
  return null
}

export async function analyze(body) {
  const problem = validate(body)
  if (problem) throw Object.assign(new Error(problem), { status: 400, expose: true })

  const [stockDays, kospiDays] = await Promise.all([fetchPrices(body.stock.code, 'day'), fetchPrices('KOSPI', 'day')])
  const ctx = buildContext(body, stockDays.items, kospiDays.items)

  const client = new Anthropic()
  const messages = [{ role: 'user', content: `${ctx.text}\n\n이 거래들을 평가해 주세요.` }]
  const params = {
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // 안전 분류기가 거절하면 다른 모델로 이어서 처리
    output_config: { effort: 'high' },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 8, user_location: { type: 'approximate', country: 'KR', timezone: 'Asia/Seoul' } },
      TOOL,
    ],
    tool_choice: { type: 'auto' },
  }

  let nudged = false
  for (let turn = 0; turn < 6; turn++) {
    const res = await client.beta.messages.stream({ ...params, messages }).finalMessage()
    if (res.stop_reason === 'refusal') throw Object.assign(new Error('AI가 이 요청을 처리하지 않았어요'), { status: 502, expose: true })

    const call = res.content.find((b) => b.type === 'tool_use' && b.name === 'submit_evaluation')
    if (call) {
      const result = call.input
      result.outcome.grade = ctx.outcomeGrade // 결과 등급은 코드 계산을 그대로 쓴다
      return { result, numbers: { rate: ctx.rate, indexRate: ctx.indexRate }, model: res.model, at: new Date().toISOString() }
    }

    messages.push({ role: 'assistant', content: res.content })
    if (res.stop_reason === 'pause_turn') continue // 검색이 길어져 잠시 멈춘 것. 이어서 진행한다.
    if (nudged || res.stop_reason === 'max_tokens') break
    messages.push({ role: 'user', content: '검색을 마쳤다면 submit_evaluation 도구로 평가를 제출해 주세요.' })
    nudged = true
  }
  throw Object.assign(new Error('평가를 끝내지 못했어요. 잠시 뒤 다시 해 주세요.'), { status: 502, expose: true })
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) chunks.push(c)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const send = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

// Vercel 함수와 개발용 서버가 함께 쓰는 처리기
export async function handleAnalyzeRequest(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST만 받아요' })
  if (!process.env.APP_PASSCODE || req.headers['x-app-passcode'] !== process.env.APP_PASSCODE) {
    return send(res, 401, { error: '앱 비밀번호가 맞지 않아요' })
  }
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 500, { error: '서버에 AI 키가 없어요' })
  try {
    send(res, 200, await analyze(await readBody(req)))
  } catch (e) {
    console.error(e)
    // 우리가 만든 오류만 그대로 보여 주고, 나머지(AI 서버 오류 등)는 한 문장으로 안내한다
    if (e.expose) return send(res, e.status, { error: e.message })
    send(res, 502, { error: 'AI 평가 중 문제가 생겼어요. 잠시 뒤 다시 해 주세요.' })
  }
}
