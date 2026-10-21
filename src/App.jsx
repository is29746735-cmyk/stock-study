import { useState } from 'react'
import { BookOpenText, Star, Crosshair, ChartLineUp } from '@phosphor-icons/react'
import NotesScreen from './screens/NotesScreen.jsx'
import WatchlistScreen from './screens/WatchlistScreen.jsx'
import PredictionsScreen from './screens/PredictionsScreen.jsx'
import PaperScreen from './screens/PaperScreen.jsx'

const TABS = [
  { id: 'notes', label: '노트', Icon: BookOpenText },
  { id: 'watch', label: '관심 종목', Icon: Star },
  { id: 'predict', label: '예측', Icon: Crosshair },
  { id: 'paper', label: '모의 투자', Icon: ChartLineUp },
]

export default function App() {
  const [tab, setTab] = useState('notes')

  return (
    <div className="app">
      <main className="screen">
        {tab === 'notes' ? (
          <NotesScreen />
        ) : tab === 'watch' ? (
          <WatchlistScreen />
        ) : tab === 'predict' ? (
          <PredictionsScreen />
        ) : (
          <PaperScreen />
        )}
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
