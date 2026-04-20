import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessLineProvider } from '@/contexts/BusinessLineContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DensityProvider } from '@/contexts/DensityContext';
import { App } from '@/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <DensityProvider>
        <BrowserRouter>
        <AuthProvider>
          <BusinessLineProvider>
            <App />
            <Toaster
              position="top-right"
              theme="system"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast: 'font-sans',
                },
              }}
            />
            <SpeedInsights />
          </BusinessLineProvider>
        </AuthProvider>
      </BrowserRouter>
      </DensityProvider>
    </ThemeProvider>
  </StrictMode>,
);
