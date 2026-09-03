import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppProvider } from './state/store';
import './styles/global.css';

const redirect = sessionStorage.getItem('abelprocure-redirect');
if (redirect) {
  sessionStorage.removeItem('abelprocure-redirect');
  const base = import.meta.env.BASE_URL;
  const stripped = redirect.startsWith(base) ? redirect.slice(base.length - 1) : redirect;
  if (stripped && stripped !== '/' && !stripped.startsWith('/?')) {
    history.replaceState(null, '', base.replace(/\/$/, '') + stripped);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
