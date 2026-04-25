import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppProvider } from "./store/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/LoadingScreen";
import { setPhase, setReady, setError, logPhase } from "./utils/startup";

// Startup tracking
logPhase('init', 'Starting app initialization');

const container = document.getElementById("root");
if (!container) {
  throw new Error('Root element #root not found in DOM');
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  // Don't let unhandled rejections crash the app
  event.preventDefault();
});

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('[Uncaught Error]', event.error);
});

const root = createRoot(container);

function renderApp(): void {
  logPhase('rendering', 'Rendering React app');
  
  root.render(
    <StrictMode>
      <ErrorBoundary
        fallback={
          <LoadingScreen message="Something went wrong. Please refresh the page." />
        }
      >
        <AppProvider>
          <App />
        </AppProvider>
      </ErrorBoundary>
    </StrictMode>
  );
  
  setPhase('rendering');
  
  // Mark as ready after a short delay to ensure first paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      setReady();
    }, 100);
  });
}

// Try to render, handle any startup errors gracefully
try {
  logPhase('init', 'Initializing React root');
  renderApp();
} catch (error) {
  console.error('[Startup] Failed to render app:', error);
  
  // Show error state directly in the container
  container.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #030712;
      color: #f9fafb;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
      text-align: center;
    ">
      <div style="
        max-width: 400px;
        padding: 2rem;
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 1rem;
        background: rgba(239, 68, 68, 0.05);
      ">
        <h1 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
          Failed to initialize
        </h1>
        <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 1rem;">
          ${error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        <button
          onclick="window.location.reload()"
          style="
            padding: 0.5rem 1rem;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.875rem;
          "
        >
          Reload page
        </button>
      </div>
    </div>
  `;
  
  setError(error instanceof Error ? error : new Error('Unknown startup error'));
}