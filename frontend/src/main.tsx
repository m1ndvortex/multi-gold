import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { store } from '@/store';
import { LanguageProvider, ThemeProvider } from '@/contexts';
import '@/i18n';
import './index.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <BrowserRouter>
              <App />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                    fontFamily: 'Vazirmatn, Tahoma, Arial, sans-serif',
                    direction: 'rtl',
                  },
                }}
              />
            </BrowserRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);