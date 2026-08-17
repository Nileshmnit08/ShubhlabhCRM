import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

const rootElement = document.getElementById('root');

try {
  createRoot(rootElement).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
} catch (error) {
  // If even React fails to initialize, write directly to the DOM
  console.error("Catastrophic initialization failure", error);
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: #ef4444; background: #0f172a; min-height: 100vh; font-family: sans-serif;">
      <h1>Critical Initialization Error</h1>
      <p style="color: #94a3b8">The application failed to load. This might be due to an unsupported browser version or aggressive content blocking.</p>
      <pre style="margin-top: 2rem; font-size: 0.8rem; overflow-x: auto;">${error.message}</pre>
    </div>
  `;
}
