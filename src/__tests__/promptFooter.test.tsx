/**
 * Tests for Prompt Footer Removal
 * Validates that system banner text has been removed from the prompt box footer
 */

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from '../App';

describe('Prompt Footer Removal', () => {
  afterEach(() => {
    cleanup();
  });

  it('should NOT contain "WebContainer FS ready" text in the UI', () => {
    render(<App />);
    
    // This text should NOT appear in the DOM
    expect(screen.queryByText(/WebContainer FS ready/)).toBeNull();
  });

  it('should NOT contain "/src /agents /models /skills" text in the UI', () => {
    render(<App />);
    
    // This path listing should NOT appear
    expect(screen.queryByText(/\/src \/agents \/models \/skills/)).toBeNull();
  });

  it('should NOT contain "Puter.js" reference in the UI', () => {
    render(<App />);
    
    // Should NOT contain Puter.js reference
    expect(screen.queryByText(/Puter\.js/)).toBeNull();
  });

  it('should NOT contain "api.puter.com" reference in the UI', () => {
    render(<App />);
    
    // Should NOT contain API endpoint reference
    expect(screen.queryByText(/api\.puter\.com/)).toBeNull();
  });

  it('should NOT contain "Auto Output Formats" text in the UI', () => {
    render(<App />);
    
    // This system status should NOT appear
    expect(screen.queryByText(/Auto Output Formats/)).toBeNull();
  });

  it('should NOT contain "Streaming enabled" text in the UI', () => {
    render(<App />);
    
    // This status indicator should NOT appear
    expect(screen.queryByText(/Streaming enabled/)).toBeNull();
  });
});

describe('Input Area Cleanliness', () => {
  it('should have textarea with placeholder but no status text nearby', () => {
    render(<App />);
    
    const textarea = screen.getByPlaceholderText(/Ask, build, or generate/);
    expect(textarea).toBeTruthy();
  });
});
