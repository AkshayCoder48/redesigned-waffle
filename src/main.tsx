import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppProvider } from "./store/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/LoadingScreen";
import { setPhase, logPhase } from "./utils/startup";
import { confirmFirstPaint, registerFirstPaintFallback, resetFirstPaintState } from "./utils/firstPaint";

// Startup tracking
logPhase('init', 'Starting app initialization');

// Find the root container - crash early with fallback if missing
const container = document.getElementById("root");
if (!container) {
  // Extremely early crash - inject fallback UI directly
  document.body.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #030712;
      color: #f9fafb;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <h1 style="font-size: 1.5rem; font-weight: 600;">Startup Failed</h1>
      <p style="color: #9ca3af;">Root element not found</p>
      <button onclick="window.location.reload()" style="
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
      ">Reload</button>
    </div>
  `;
  throw new Error('Root element #root not found in DOM');
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  // Prevent console errors from appearing but don't crash the app
  event.preventDefault();
});

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('[Uncaught Error]', event.error);
});

/**
 * Create the React root
 */
let root: ReturnType<typeof createRoot>;

try {
  root = createRoot(container);
} catch (error) {
  // Cannot create React root - show fallback
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
      <h1 style="font-size: 1.25rem; font-weight: 600;">Failed to initialize</h1>
      <p style="color: #9ca3af; font-size: 0.875rem; margin: 1rem 0;">
        ${error instanceof Error ? error.message : 'Unknown error occurred'}
      </p>
      <button onclick="window.location.reload()" style="
        padding: 0.5rem 1rem;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
      ">Reload page</button>
    </div>
  `;
  throw error;
}

/**
 * Renders the loading screen first - guaranteed to show immediately
 */
function renderLoadingScreen(message?: string): void {
  logPhase('loading', 'Rendering LoadingScreen');
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <LoadingScreen message={message || "Initializing AI-MAOS..."} />
      </ErrorBoundary>
    </StrictMode>
  );
}

/**
 * Renders the actual app after loading screen
 */
function renderApp(): void {
  logPhase('rendering', 'Rendering main App');
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </ErrorBoundary>
    </StrictMode>
  );

  // Mark rendering phase complete
  setPhase('rendering');
  
  // Confirm first paint after React commits
  requestAnimationFrame(() => {
    confirmFirstPaint();
    
    // After one more frame, mark as ready
    requestAnimationFrame(() => {
      setPhase('ready');
    });
  });
}

/**
 * Guaranteed startup sequence with fallback at each stage
 */
async function startup(): Promise<void> {
  // Reset first paint state
  resetFirstPaintState();
  
  // Step 1: Immediately show loading screen (guaranteed paint)
  logPhase('init', 'Rendering initial loading screen');
  renderLoadingScreen("Initializing AI-MAOS...");
  
  // Step 2: Register first paint fallback - if React fails to mount,
  // the firstPaint mechanism will ensure the loading screen stays visible
  // with a dismiss mechanism after timeout
  registerFirstPaintFallback(() => {
    console.warn('[Startup] First paint fallback triggered');
    // Force show the app even if something is stuck
    renderApp();
  });
  
  // Step 3: After a brief delay to ensure loading screen is painted,
  // attempt to render the actual app
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Step 4: Render the main app
  renderApp();
}

// Track startup timeout
let startupTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Safety fallback if startup takes too long
 */
function startupTimeoutFallback(): void {
  console.warn('[Startup] Startup timeout - forcing app render');
  renderApp();
}

// Start the startup sequence
logPhase('init', 'Starting startup sequence');

// Set startup timeout as safety net (12 seconds)
startupTimeout = setTimeout(startupTimeoutFallback, 12000);

// Run startup sequence
startup()
  .then(() => {
    // Clear the timeout since we completed successfully
    if (startupTimeout) {
      clearTimeout(startupTimeout);
      startupTimeout = null;
    }
    logPhase('init', 'Startup sequence complete');
  })
  .catch((error) => {
    console.error('[Startup] Startup failed:', error);
    
    // Clear the timeout
    if (startupTimeout) {
      clearTimeout(startupTimeout);
      startupTimeout = null;
    }
    
    // Render the app as a last resort - the ErrorBoundary will show if it fails
    renderApp();
  });