import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import ErrorBoundary from './ErrorBoundary'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'
import { ToastProvider } from './toast.jsx'
import { SoundProvider } from './sound.jsx'
import InkFilter from './brand/InkFilter.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <SoundProvider>
              <InkFilter />
              <ErrorBoundary><App /></ErrorBoundary>
            </SoundProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)
