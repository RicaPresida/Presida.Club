import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { StripeProvider } from './contexts/StripeContext';

// Function to register service worker
async function registerServiceWorker() {
  // Only register service worker in production
  if (import.meta.env.PROD) {
    const { registerSW } = await import('virtual:pwa-register');
    
    // Register service worker with periodic updates
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('Nova versão disponível. Atualizar agora?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('App pronto para uso offline');
      },
      onRegistered(r) {
        // Check for updates every hour in production
        r && setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    });
  }
}

// Call the async function
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SupabaseProvider>
        <AuthProvider>
          <ThemeProvider>
            <StripeProvider>
              <App />
            </StripeProvider>
          </ThemeProvider>
        </AuthProvider>
      </SupabaseProvider>
    </BrowserRouter>
  </StrictMode>
);