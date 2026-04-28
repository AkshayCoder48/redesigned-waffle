/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI instead of a blank screen
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Storage keys that might need recovery
const STORAGE_KEYS_TO_CLEAR = [
  'ai-maos-settings',
  'ai-maos-convos',
  'ai-maos-image-model',
  'ai-maos-tts-model',
  'ai-maos-tts-voice',
  'ai-maos-video-model',
  'ai-maos-text-model',
];

/**
 * Clear potentially corrupted localStorage data
 */
function clearCorruptedStorage(): void {
  try {
    for (const key of STORAGE_KEYS_TO_CLEAR) {
      localStorage.removeItem(key);
    }
    console.log('[ErrorBoundary] Cleared potentially corrupted storage');
  } catch (e) {
    console.error('[ErrorBoundary] Failed to clear storage:', e);
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleClearStorageAndReload = (): void => {
    clearCorruptedStorage();
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#030712] p-6">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-900/80 p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">Something went wrong</h2>
            <p className="mb-4 text-sm text-zinc-400">
              {this.state.error?.message || 'An unexpected error occurred during rendering.'}
            </p>
            
            {this.state.errorInfo && (
              <details className="mb-6 rounded-lg border border-white/10 bg-black/30 p-3 text-left">
                <summary className="cursor-pointer text-xs font-medium text-zinc-400">
                  Error details
                </summary>
                <pre className="mt-2 overflow-x-auto text-[10px] text-zinc-500">
                  {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <button
                onClick={this.handleClearStorageAndReload}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-300 transition hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Clear saved data & reload
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-zinc-300 transition hover:bg-white/10"
              >
                <Home className="h-4 w-4" />
                Go to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error display component for explicit error states
 */
export interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({
  title = 'Error',
  message,
  details,
  onRetry,
  onDismiss,
  severity = 'error',
}: ErrorStateProps): ReactNode {
  const severityStyles = {
    error: {
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-500/5',
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10',
    },
    warning: {
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/5',
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
    info: {
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-500/5',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
  };

  const style = severityStyles[severity];
  const Icon = AlertTriangle;

  return (
    <div className={`rounded-xl border ${style.borderColor} ${style.bgColor} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${style.iconBg}`}>
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{message}</p>
          {details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
                Show details
              </summary>
              <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 text-[10px] text-zinc-500">
                {details}
              </pre>
            </details>
          )}
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/20"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/10"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;