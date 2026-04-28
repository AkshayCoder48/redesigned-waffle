/**
 * Loading Screen Component
 * Displayed during app startup to prevent blank screen
 * Includes guaranteed dismiss mechanism to prevent infinite loading
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Brain, Loader2, AlertCircle } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  onTimeout?: () => void;
  timeoutMs?: number;
}

const LOADING_PHRASES = [
  'Initializing AI-MAOS...',
  'Loading agents...',
  'Preparing workspace...',
  'Almost ready...',
];

/**
 * Guaranteed loading screen that will eventually dismiss
 * even if the app is stuck or failing
 */
export function LoadingScreen({ message, progress, onTimeout, timeoutMs = 10000 }: LoadingScreenProps): React.ReactElement {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      } else {
        // If no timeout handler, show recovery option
        setDismissed(true);
      }
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [onTimeout, timeoutMs]);

  useEffect(() => {
    if (message) return;
    
    const interval = setInterval(() => {
      setPhraseIndex(i => (i + 1) % LOADING_PHRASES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [message]);

  const displayMessage = message || LOADING_PHRASES[phraseIndex];

  // If dismissed (timed out but no handler), show recovery UI
  if (dismissed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#030712] text-white">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-2xl shadow-violet-900/40">
              <Brain className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">AI-MAOS</h1>
          <p className="mb-8 text-sm text-zinc-500">Loading taking longer than expected</p>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Startup may be stuck</span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              Reload page
            </button>
            <button
              onClick={() => {
                // Clear corrupted data and reload
                const keys = ['ai-maos-settings', 'ai-maos-convos'];
                try {
                  keys.forEach(k => localStorage.removeItem(k));
                } catch {}
                window.location.reload();
              }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
            >
              Clear data & reload
            </button>
          </div>
        </div>
        
        <div className="absolute bottom-8 text-xs text-zinc-600">
          Local-first • Privacy-focused • Open source
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#030712] text-white">
      <div className="mb-8 flex flex-col items-center">
        {/* Logo */}
        <div className="relative mb-6">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-2xl shadow-violet-900/40">
            <Brain className="h-10 w-10 text-white" />
          </div>
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-violet-600/20 opacity-75" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold tracking-tight">AI-MAOS</h1>
        <p className="mb-8 text-sm text-zinc-500">Multi-Agent Operating System</p>

        {/* Loading indicator */}
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          <span className="text-sm text-zinc-400">{displayMessage}</span>
        </div>

        {/* Progress bar (optional) */}
        {progress !== undefined && (
          <div className="mt-6 w-48 rounded-full bg-zinc-800">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-xs text-zinc-600">
        Local-first • Privacy-focused • Open source
      </div>
    </div>
  );
}

/**
 * Minimal loading indicator for inline use
 */
export function LoadingIndicator({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }): React.ReactElement {
  const sizeMap = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6',
  };

  return (
    <Loader2 className={`${sizeMap[size]} animate-spin text-violet-400`} />
  );
}

export default LoadingScreen;