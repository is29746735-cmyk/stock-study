import { useEffect, useState } from 'react'
import { BookOpenText, Star, Crosshair, ChartLineUp } from '@phosphor-icons/react'
import NotesScreen from './screens/NotesScreen.jsx'
import ComingSoon from './screens/ComingSoon.jsx'
import { useStoredState } from './storage.js'

const TABS = [
  { id: 'notes', label: '노트', Icon: BookOpenText },
  { id: 'watch', label: '관심 종목', Icon: Star },
  { id: 'predict', label: '예측', Icon: Crosshair },
  { id: 'paper', label: '모의 투자', Icon: ChartLineUp },
]

// 디자인 시안 비교용. 하나를 고르면 이 부분은 지운다.
const VARIANTS = [
  { id: 'a', label: 'A 카드' },
  { id: 'b', label: 'B 수첩' },
  { id: 'c', label: 'C 굵게' },
]

export default function App() {
  const [tab, setTab] = useState('notes')
  const [variant, setVariant] = useStoredState('stock-study:variant', 'a')

  useEffect(() => {
    document.documentElement.dataset.variant = variant
  }, [variant])

  const current = TABS.find((t) => t.id === tab)

  return (
    <div className="app">
      <div className="variant-picker" role="group" aria-label="디자인 시안">
        {VARIANTS.map((v) => (
          <button key={v.id} aria-pressed={variant === v.id} onClick={() => setVariant(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      <main className="screen">
        {tab === 'notes' ? <NotesScreen /> : <ComingSoon title={current.label} Icon={current.Icon} />}
      </main>

      <nav className="tabbar" aria-label="메뉴">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <Icon size={24} weight={tab === id ? 'fill' : 'regular'} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
