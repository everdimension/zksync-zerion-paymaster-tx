import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { GlobalError } from './shared/GlobalError.tsx'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: true,
    },
  },
})
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <ErrorBoundary
        fallbackRender={({ error }) => <GlobalError error={error} />}
      >
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
