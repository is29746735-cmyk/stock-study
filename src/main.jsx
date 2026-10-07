import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-kr/400.css'
import '@fontsource/ibm-plex-sans-kr/500.css'
import '@fontsource/ibm-plex-sans-kr/600.css'
import '@fontsource/gothic-a1/400.css'
import '@fontsource/gothic-a1/600.css'
import '@fontsource/gothic-a1/800.css'
import '@fontsource/gowun-batang/400.css'
import '@fontsource/gowun-batang/700.css'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
