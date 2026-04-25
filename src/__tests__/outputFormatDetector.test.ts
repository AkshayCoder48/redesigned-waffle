/**
 * Tests for Output Format Detection and Component Rendering
 */

import {
  detectFormats,
  detectPrimaryFormat,
  segmentContent,
  extractSchemaTags,
  detectFormatFromSchemaTags,
  detectFormatsComplete,
} from '../utils/outputFormatDetector';

describe('Output Format Detection', () => {
  describe('detectPrimaryFormat', () => {
    it('should detect code-box format from fenced code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('code-box');
    });

    it('should detect code-box format from inline code', () => {
      const content = 'Use the `console.log()` function';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('code-box');
    });

    it('should detect checklist format from checkbox items', () => {
      const content = '- [ ] First item\n- [x] Second item\n- [ ] Third item';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('checklist');
    });

    it('should detect step-guide format from numbered steps', () => {
      const content = '1. First step\n2. Second step\n3. Third step';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('step-guide');
    });

    it('should detect comparison-table format from markdown tables', () => {
      const content = '| Name | Value |\n|------|-------|\n| A    | 1     |';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('comparison-table');
    });

    it('should detect API response format from JSON', () => {
      const content = '{"status": "success", "data": [1, 2, 3]}';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('api-response');
    });

    it('should detect error-debug format from error patterns', () => {
      const content = 'Error: Connection refused\nCause: Server not running\nFix: Start the server';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('error-debug');
    });

    it('should detect Q&A panel format from question patterns', () => {
      const content = 'Q: What is this?\nA: It is a test.\n\nQ: How does it work?\nA: By magic.';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('qa-panel');
    });

    it('should detect terminal-sim format from command patterns', () => {
      const content = '$ npm install\n$ git init\n> docker build';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('terminal-sim');
    });

    it('should detect kanban format from column headers', () => {
      const content = 'To-Do:\n- Task 1\n- Task 2\n\nIn Progress:\n- Task 3\n\nDone:\n- Task 4';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('kanban');
    });

    it('should default to unstructured for plain text', () => {
      const content = 'This is just a regular paragraph of text.';
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe('unstructured');
    });
  });

  describe('detectFormats', () => {
    it('should return multiple formats when detected', () => {
      const content = 'Step 1: Install\nStep 2: Configure\n\n```json\n{"key": "value"}\n```';
      const results = detectFormats(content);
      expect(results.length).toBeGreaterThan(1);
      const formats = results.map(r => r.format);
      expect(formats).toContain('step-guide');
    });

    it('should respect minConfidence threshold', () => {
      const content = 'Some text';
      const results = detectFormats(content, { minConfidence: 0.9 });
      // Should not detect low-confidence formats
      const highConfidenceResults = results.filter(r => r.confidence >= 0.9);
      expect(highConfidenceResults.length).toBe(0);
    });
  });

  describe('segmentContent', () => {
    it('should segment content into format sections', () => {
      const content = 'First section\n\n```javascript\nconst x = 1;\n```\n\nSecond section';
      const segments = segmentContent(content);
      expect(segments.length).toBeGreaterThan(1);
    });

    it('should assign correct format to each segment', () => {
      const content = 'Summary:\nKey point 1\n\n```python\ndef hello():\n    print("hi")\n```';
      const segments = segmentContent(content);
      const formats = segments.map(s => s.format);
      expect(formats).toContain('summary-card');
      expect(formats).toContain('code-box');
    });
  });

  describe('schema tag detection', () => {
    it('should extract schema tags from content', () => {
      const content = '<code>const x = 1;</code>';
      const tags = extractSchemaTags(content);
      expect(tags.length).toBe(1);
      expect(tags[0].tag).toBe('code');
    });

    it('should detect format from schema tags', () => {
      const content = '<checklist>\n- [ ] Item 1\n- [ ] Item 2\n</checklist>';
      const result = detectFormatFromSchemaTags(content);
      expect(result?.format).toBe('checklist');
    });

    it('should handle JSON schema tag', () => {
      const content = '<json>{"key": "value"}</json>';
      const result = detectFormatFromSchemaTags(content);
      expect(result?.format).toBe('api-response');
    });
  });

  describe('detectFormatsComplete', () => {
    it('should prioritize schema tags over pattern detection', () => {
      const content = '<timeline>\n2024-01: Event 1\n</timeline>';
      const results = detectFormatsComplete(content, { prioritySchemaTags: true });
      expect(results[0]?.format).toBe('timeline');
    });

    it('should fall back to pattern detection without schema tags', () => {
      const content = '| A | B |\n|---|---|\n| 1 | 2 |';
      const results = detectFormatsComplete(content, { prioritySchemaTags: true });
      expect(results[0]?.format).toBe('comparison-table');
    });
  });
});

describe('Format Detection Coverage', () => {
  const formatTests: Array<{ content: string; expectedFormat: string }> = [
    { content: '```bash\necho hello\n```', expectedFormat: 'code-box' },
    { content: '- [ ] Todo item', expectedFormat: 'checklist' },
    { content: 'Step 1: Do this\nStep 2: Do that', expectedFormat: 'step-guide' },
    { content: '| Col1 | Col2 |\n|-----|-----|', expectedFormat: 'comparison-table' },
    { content: '{"json": true}', expectedFormat: 'api-response' },
    { content: '2024-01-15: Event happened', expectedFormat: 'timeline' },
    { content: 'Q: What is this?\nA: It is great', expectedFormat: 'qa-panel' },
    { content: 'Term: X\nDefinition: Y', expectedFormat: 'flashcard' },
    { content: 'Error: Failed\nCause: Bug\nFix: Patch', expectedFormat: 'error-debug' },
    { content: 'Myth: X\nFact: Y', expectedFormat: 'myth-fact' },
    { content: '$ npm run dev', expectedFormat: 'terminal-sim' },
    { content: 'PORT=3000\nDEBUG=true', expectedFormat: 'config-file' },
    { content: 'Summary: Key points here', expectedFormat: 'summary-card' },
    { content: 'Details: Click to expand', expectedFormat: 'expandable' },
    { content: 'Insight: Important tip', expectedFormat: 'bullet-insight' },
    { content: 'Definition: X\nExample: Y', expectedFormat: 'concept-breakdown' },
    { content: '> Famous quote here', expectedFormat: 'quote-card' },
    { content: 'Alice: Hello\nBob: Hi there', expectedFormat: 'dialogue-script' },
    { content: 'Once upon a time...', expectedFormat: 'story-panel' },
    { content: '@user check this out #trending', expectedFormat: 'social-post' },
    { content: 'Phase 1: Planning\nPhase 2: Build', expectedFormat: 'roadmap' },
    { content: 'To-Do:\nIn Progress:\nDone:', expectedFormat: 'kanban' },
    { content: 'Weight: 5\nScore: 8', expectedFormat: 'decision-matrix' },
    { content: 'Name: X\nType: Y\nValue: Z', expectedFormat: 'data-table' },
    { content: 'Diagram:\nA -> B -> C', expectedFormat: 'diagram' },
  ];

  formatTests.forEach(({ content, expectedFormat }) => {
    it(`should detect ${expectedFormat} format`, () => {
      const result = detectPrimaryFormat(content);
      expect(result.format).toBe(expectedFormat);
    });
  });
});
