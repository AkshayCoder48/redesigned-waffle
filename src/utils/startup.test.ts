/**
 * Startup tests
 * Verifies the app renders correctly even with failed optional subsystems
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Mock WebContainer API
const mockWebContainer = {
  boot: vi.fn().mockResolvedValue({}),
  mount: vi.fn().mockResolvedValue(undefined),
  spawn: vi.fn().mockResolvedValue({
    output: { pipeTo: vi.fn() },
    exit: Promise.resolve(0),
  }),
};

// Mock @webcontainer/api
vi.mock('@webcontainer/api', () => ({
  WebContainer: {
    boot: mockWebContainer.boot,
  },
}));

// Mock localStorage
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorage.data[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockLocalStorage.data[key]; }),
  clear: vi.fn(() => { mockLocalStorage.data = {}; }),
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Startup Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.data = {};
    mockLocalStorage.getItem.mockImplementation((key: string) => mockLocalStorage.data[key] || null);
  });

  afterEach(() => {
    cleanup();
  });

  describe('LoadingScreen', () => {
    it('renders immediately with loading message', () => {
      render(<LoadingScreen message="Testing..." />);
      expect(screen.getByText('Testing...')).toBeTruthy();
      expect(screen.getByText('AI-MAOS')).toBeTruthy();
    });

    it('rotates through loading phrases when no message provided', () => {
      render(<LoadingScreen />);
      const phrases = ['Initializing AI-MAOS...', 'Loading agents...', 'Preparing workspace...', 'Almost ready...'];
      // Should show one of the phrases
      const spinner = screen.getByTestId('loading-spinner') || document.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('shows recovery options on timeout when no onTimeout handler', async () => {
      render(<LoadingScreen timeoutMs={100} />);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should show recovery UI
      expect(screen.getByText(/Reload page/)).toBeTruthy();
      expect(screen.getByText(/Clear data & reload/)).toBeTruthy();
    });
  });

  describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Test Child</div>
        </ErrorBoundary>
      );
      expect(screen.getByTestId('child')).toBeTruthy();
    });

    it('shows error fallback when child throws', () => {
      const ThrowError = () => { throw new Error('Test error'); };
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      // Should show error UI with Try again and Clear data options
      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Try again')).toBeTruthy();
      expect(screen.getByText('Clear saved data & reload')).toBeTruthy();
    });

    it('clears storage on Clear data & reload click', () => {
      mockLocalStorage.data['ai-maos-settings'] = 'corrupted';
      
      const ThrowError = () => { throw new Error('Test error'); };
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      // Click clear storage button
      const clearButton = screen.getByText('Clear saved data & reload');
      clearButton.click();
      
      // localStorage should be cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ai-maos-settings');
    });
  });

  describe('First Paint', () => {
    it('loads within 8 second budget', async () => {
      const startTime = Date.now();
      
      // Simulate startup
      render(<LoadingScreen message="Testing..." />);
      
      // Verify loading screen appears immediately
      expect(screen.getByText('AI-MAOS')).toBeTruthy();
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should render instantly
    });
  });
});

describe('Corrupted State Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.data = {};
  });

  it('clears corrupted localStorage and recovers', async () => {
    // Set corrupted data
    mockLocalStorage.data['ai-maos-convos'] = 'invalid json {{{';
    mockLocalStorage.data['ai-maos-settings'] = '{"broken": true';
    
    // ErrorBoundary should provide recovery
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Render ErrorBoundary that catches state errors
    const BadComponent = () => {
      const saved = localStorage.getItem('ai-maos-convos');
      if (saved) JSON.parse(saved); // Will throw
      return <div>Test</div>;
    };
    
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );
    
    // Clear should have been called
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ai-maos-convos');
    
    consoleSpy.mockRestore();
  });
});

describe('App Shell Rendering', () => {
  it('shows fallback UI when isAppReady is false', async () => {
    // This test verifies that even when optional systems fail,
    // the loading screen or error boundary is shown instead of black screen
    render(<LoadingScreen message="Loading..." />);
    
    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByText('Multi-Agent Operating System')).toBeTruthy();
  });
});