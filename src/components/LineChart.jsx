import { useEffect, useRef, useState } from 'react'

// 날짜를 가로축으로 쓰는 꺾은선 그래프. 손가락이나 마우스를 올리면 그 날 값이 보인다.
// series: [{ id, label, color, dashed, points: [[날짜, 값], ...] }]  (모든 선은 같은 날짜 목록을 쓴다)
// markers: [{ x: 날짜, kind: 'buy' | 'sell', label }]
const PAD = { top: 12, right: 12, bottom: 22, left: 48 }
const dateLabel = (d) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`

export default function LineChart({ series, markers = [], formatY = (v) => v.toLocaleString('ko-KR'), formatTick, height = 200, label }) {
  const tick = formatTick ?? formatY // 축 눈금용 짧은 표기
  const wrap = useRef(null)
  const [width, setWidth] = useState(320)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const xs = series[0]?.points.map((p) => p[0]) ?? []
  if (xs.length < 2) return null

  const values = series.flatMap((s) => s.points.map((p) => p[1]))
  let min = Math.min(...values)
  let max = Math.max(...values)
  const pad = (max - min || max || 1) * 0.08
  min -= pad
  max += pad

  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (i) => PAD.left + (i / (xs.length - 1)) * innerW
  const y = (v) => PAD.top + (1 - (v - min) / (max - min)) * innerH
  const ticks = [0, 0.5, 1].map((t) => min + pad + t * (max - min - 2 * pad))
  const xTicks = [0, Math.floor((xs.length - 1) / 2), xs.length - 1]

  const pointFor = (clientX) => {
    const rect = wrap.current.getBoundingClientRect()
    const i = Math.round(((clientX - rect.left - PAD.left) / innerW) * (xs.length - 1))
    return Math.min(xs.length - 1, Math.max(0, i))
  }

  const markerAt = markers
    .map((m) => ({ ...m, i: xs.findIndex((d) => d >= m.x) }))
    .filter((m) => m.i >= 0)

  return (
    <figure className="chart" aria-label={label}>
      <div
        ref={wrap}
        className="chart-plot"
        onPointerMove={(e) => setHover(pointFor(e.clientX))}
        onPointerDown={(e) => setHover(pointFor(e.clientX))}
        onPointerLeave={() => setHover(null)}
      >
        <svg width={width} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="chart-tick" x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
                {tick(t)}
              </text>
            </g>
          ))}
          {xTicks.map((i, k) => (
            <text key={i} className="chart-tick" x={x(i)} y={height - 6} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}>
              {dateLabel(xs[i])}
            </text>
          ))}

          {series.map((s) => (
            <path
              key={s.id}
              d={s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '5 4' : undefined}
            />
          ))}

          {markerAt.map((m, k) => {
            const cx = x(m.i)
            const cy = y(series[0].points[m.i][1])
            const up = m.kind === 'buy'
            // 산 날 ▲ 은 선 아래에서 위로, 판 날 ▼ 은 선 위에서 아래로 가리킨다
            const tri = up ? `${cx},${cy + 9} ${cx - 6},${cy + 19} ${cx + 6},${cy + 19}` : `${cx},${cy - 9} ${cx - 6},${cy - 19} ${cx + 6},${cy - 19}`
            return <polygon key={k} points={tri} className={up ? 'chart-buy' : 'chart-sell'} />
          })}

          {hover != null && (
            <g>
              <line className="chart-cross" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={height - PAD.bottom} />
              {series.map((s) => (
                <circle key={s.id} cx={x(hover)} cy={y(s.points[hover][1])} r="4.5" fill={s.color} className="chart-dot" />
              ))}
            </g>
          )}
        </svg>

        {hover != null && (
          <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover), 70), width - 70) }}>
            <strong>{xs[hover]}</strong>
            {series.map((s) => (
              <span key={s.id}>
                {series.length > 1 && <i className="swatch" style={{ borderColor: s.color, borderStyle: s.dashed ? 'dashed' : 'solid' }} />}
                {series.length > 1 && `${s.label} `}
                <b className="mono">{formatY(s.points[hover][1])}</b>
              </span>
            ))}
            {markerAt
              .filter((m) => m.i === hover)
              .map((m, k) => (
                <span key={k}>{m.label}</span>
              ))}
          </div>
        )}
      </div>

      {series.length > 1 && (
        <figcaption className="legend">
          {series.map((s) => (
            <span key={s.id}>
              <i className="swatch" style={{ borderColor: s.color, borderStyle: s.dashed ? 'dashed' : 'solid' }} /> {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
