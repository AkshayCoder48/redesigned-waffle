/**
 * Tests for Structured Output Renderer
 * Validates code rendering and plain text fallback
 */

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import StructuredOutputRenderer from '../components/StructuredOutputRenderer';

describe('StructuredOutputRenderer', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Code Box Rendering', () => {
    it('should render fenced code blocks with language', () => {
      const content = '```javascript\nconst x = 1;\n```';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText('javascript')).toBeTruthy();
    });

    it('should render code blocks with line numbers', () => {
      const content = '```python\ndef hello():\n    print("hi")\n```';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText('python')).toBeTruthy();
    });

    it('should detect JavaScript/TypeScript', () => {
      const content = '```\nconst x = 1;\nconst y = 2;\n```';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText('JavaScript/TypeScript')).toBeTruthy();
    });

    it('should detect Python', () => {
      const content = '```\ndef hello():\n    print("hi")\n```';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText('Python')).toBeTruthy();
    });

    it('should render inline code when content is purely code-like', () => {
      const content = 'const x = 1;\nconst y = 2;';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText(/const x = 1/)).toBeTruthy();
    });
  });

  describe('Plain Text Rendering', () => {
    it('should render plain text as plain text', () => {
      const content = 'This is a simple paragraph of text.';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText('This is a simple paragraph of text.')).toBeTruthy();
    });

    it('should render multiple paragraphs', () => {
      const content = 'First paragraph.\n\nSecond paragraph.';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText(/First paragraph/)).toBeTruthy();
      expect(screen.getByText(/Second paragraph/)).toBeTruthy();
    });
  });

  describe('Mixed Content', () => {
    it('should render text before code', () => {
      const content = 'Here is some explanation:\n\n```javascript\nconst x = 1;\n```';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText(/Here is some explanation/)).toBeTruthy();
      expect(screen.getByText('javascript')).toBeTruthy();
    });

    it('should render text after code', () => {
      const content = '```javascript\nconst x = 1;\n```\n\nThis explains the code.';
      render(<StructuredOutputRenderer content={content} />);
      expect(screen.getByText(/This explains the code/)).toBeTruthy();
      expect(screen.getByText('javascript')).toBeTruthy();
    });
  });

  describe('Empty Content', () => {
    it('should return null for empty content', () => {
      const { container } = render(<StructuredOutputRenderer content="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for whitespace-only content', () => {
      const { container } = render(<StructuredOutputRenderer content="   \n\n  " />);
      expect(container.firstChild).toBeNull();
    });
  });
});
