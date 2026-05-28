import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './intraday.css'
import IntradayApp from './IntradayApp.jsx'

createRoot(document.getElementById('intraday-root')).render(
  <StrictMode>
    <IntradayApp />
  </StrictMode>,
)
