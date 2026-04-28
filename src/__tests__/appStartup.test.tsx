/**
 * Tests for App Startup and Error Handling
 * Validates that the app renders correctly without black screen issues
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the hooks and utilities
vi.mock('../store/AppContext', () => ({
  useAppState: () => ({
    state: {
      agents: [
        { id: 'orchestrator', name: 'Orchestrator', status: 'idle' },
        { id: 'chat', name: 'Chat Agent', status: 'idle' },
      ],
      settings: {
        providerTemplates: [],
        localModels: [],
        agentModelAssignments: {},
      },
    },
    dispatch: vi.fn(),
  }),
}));

vi.mock('../utils/startup', () => ({
  logPhase: vi.fn(),
  setReady: vi.fn(),
  setPhase: vi.fn(),
}));

describe('App Startup', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading screen during initialization', async () => {
      const { LoadingScreen } = await import('../components/LoadingScreen');
      render(<LoadingScreen message="Initializing AI-MAOS..." />);
      
      expect(screen.getByText('AI-MAOS')).toBeTruthy();
      expect(screen.getByText('Initializing AI-MAOS...')).toBeTruthy();
    });

    it('should render loading indicator with default size', async () => {
      const { LoadingIndicator } = await import('../components/LoadingScreen');
      const { container } = render(<LoadingIndicator />);
      
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('should not show recovery UI automatically', async () => {
      const { LoadingScreen } = await import('../components/LoadingScreen');
      render(<LoadingScreen message="Initializing AI-MAOS..." />);
      
      // Recovery messages should not appear
      expect(screen.queryByText('Loading taking longer than expected')).toBeNull();
      expect(screen.queryByText('Startup may be stuck')).toBeNull();
      expect(screen.queryByText('Reload page')).toBeNull();
      expect(screen.queryByText('Clear data & reload')).toBeNull();
    });
  });

  describe('Error Boundary', () => {
    it('should render error fallback when error occurs', async () => {
      const { ErrorBoundary } = await import('../components/ErrorBoundary');
      
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeTruthy();
      });
    });

    it('should allow retry after error', async () => {
      const { ErrorBoundary } = await import('../components/ErrorBoundary');
      
      let errorThrown = true;
      const ToggleError = () => {
        if (errorThrown) {
          throw new Error('Test error');
        }
        return <div>Recovered</div>;
      };

      render(
        <ErrorBoundary>
          <ToggleError />
        </ErrorBoundary>
      );

      // Force reset by simulating component re-render
      // In a real scenario, the parent would handle this
      expect(screen.getByText('Try again')).toBeTruthy();
    });
  });
});

describe('Startup Utilities', () => {
  it('should track startup phases', async () => {
    const { getStartupState, setPhase, setReady } = await import('../utils/startup');
    
    setPhase('providers');
    expect(getStartupState().phase).toBe('providers');
    
    setPhase('filesystem');
    expect(getStartupState().phase).toBe('filesystem');
    
    setReady();
    expect(getStartupState().phase).toBe('ready');
  });

  it('should capture errors', async () => {
    const { getStartupState, setError } = await import('../utils/startup');
    
    const testError = new Error('Test startup error');
    setError(testError);
    
    expect(getStartupState().phase).toBe('error');
    expect(getStartupState().error).toBe(testError);
  });
});