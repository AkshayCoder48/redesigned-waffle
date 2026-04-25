/**
 * Output Format Detection Engine
 * Automatically detects content patterns and classifies them into structured output formats
 * during token streaming, enabling progressive rendering of specialized UI blocks.
 */

export type OutputFormat =
  | 'code-box'
  | 'step-guide'
  | 'checklist'
  | 'summary-card'
  | 'expandable'
  | 'comparison-table'
  | 'bullet-insight'
  | 'concept-breakdown'
  | 'qa-panel'
  | 'flashcard'
  | 'timeline'
  | 'diagram'
  | 'myth-fact'
  | 'terminal-sim'
  | 'api-response'
  | 'data-table'
  | 'error-debug'
  | 'config-file'
  | 'story-panel'
  | 'dialogue-script'
  | 'quote-card'
  | 'social-post'
  | 'roadmap'
  | 'kanban'
  | 'decision-matrix'
  | 'unstructured';

export interface DetectedFormat {
  format: OutputFormat;
  confidence: number;
  reason: string;
  startIndex: number;
  endIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface FormatPattern {
  format: OutputFormat;
  pattern: RegExp;
  confidence: number;
  reason: string;
  requiredContext?: string[];
  exclusive?: boolean;
}

const FORMAT_PATTERNS: FormatPattern[] = [
  // Code Box - fenced code blocks or code-like content
  {
    format: 'code-box',
    pattern: /```[\w]*\n[\s\S]*?```|`[^`]+`|\b(function|const|let|var|import|export|class|def|if|for|while|return)\b/,
    confidence: 0.9,
    reason: 'Contains code syntax or fenced code blocks',
    exclusive: true,
  },
  // API Response Viewer - JSON/XML structure
  {
    format: 'api-response',
    pattern: /^\s*(\{|\[)[^]*(\}|\])[\s\S]*$/,
    confidence: 0.95,
    reason: 'Contains JSON or XML structured data',
    exclusive: true,
  },
  // Checklist - checkbox patterns
  {
    format: 'checklist',
    pattern: /^\s*[-*]\s*\[[ x]\]|^\s*\d+\.\s*\[[ x]\]|^\s*☐|^\s*☑|^\s*\[ \]/m,
    confidence: 0.85,
    reason: 'Contains checkbox items',
  },
  // Step-by-Step Guide - numbered steps
  {
    format: 'step-guide',
    pattern: /^\s*(\d+[.):]|Step\s+\d+|Phase\s+\d+|Part\s+\d+|Stage\s+\d+)/m,
    confidence: 0.8,
    reason: 'Contains numbered steps or phases',
  },
  // Comparison Table - markdown table patterns
  {
    format: 'comparison-table',
    pattern: /^\|.*\|.*\|$/m,
    confidence: 0.85,
    reason: 'Contains markdown table structure',
    exclusive: true,
  },
  // Timeline - dated events
  {
    format: 'timeline',
    pattern: /(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}|Day\s+\d+|Week\s+\d+|Month\s+\d+)/i,
    confidence: 0.75,
    reason: 'Contains dated or sequential time markers',
  },
  // Q&A Panel - question/answer patterns
  {
    format: 'qa-panel',
    pattern: /(?:^|\n)\s*(?:Q:|Question:|Q\.|[A-Z][^?]*\?)/m,
    confidence: 0.8,
    reason: 'Contains question patterns',
  },
  // Flashcard - Q/A pairs with definitions
  {
    format: 'flashcard',
    pattern: /(?:Term:|Definition:|Front:|Back:|Question:|Answer:)/i,
    confidence: 0.75,
    reason: 'Contains flashcard-style term/definition pairs',
  },
  // Error Debug Panel - issue/cause/fix patterns
  {
    format: 'error-debug',
    pattern: /(?:Error:|Issue:|Problem:|Cause:|Fix:|Solution:|Resolution:)/i,
    confidence: 0.85,
    reason: 'Contains error/problem diagnostic structure',
  },
  // Myth vs Fact - myth/fact patterns
  {
    format: 'myth-fact',
    pattern: /(?:Myth:|Fact:|Common Myth|Truth:|False:)/i,
    confidence: 0.9,
    reason: 'Contains myth vs fact structure',
  },
  // Terminal Simulation - command-line patterns
  {
    format: 'terminal-sim',
    pattern: /(\$|>|#)\s*\w+(\s+\S+)*|npm\s+|yarn\s+|git\s+|pip\s+|docker\s+|bash\s+|cmd\s+/i,
    confidence: 0.85,
    reason: 'Contains terminal/shell command patterns',
  },
  // Config File - configuration patterns
  {
    format: 'config-file',
    pattern: /^(\s*[A-Z_][A-Z0-9_]*\s*=|^\s*\w+:\s*\S+|^\s*\[\w+\]|^\s*<!--.*-->$)/m,
    confidence: 0.7,
    reason: 'Contains configuration file structure',
  },
  // Summary Card - summary/overview patterns
  {
    format: 'summary-card',
    pattern: /(?:Summary:|Overview:|Key Points:|In Brief:|TL;DR|Bottom Line:)/i,
    confidence: 0.75,
    reason: 'Contains summary markers',
  },
  // Expandable - collapsible content hints
  {
    format: 'expandable',
    pattern: /(?:Details:|More:|Click to expand|Show more|Hidden:|Additional:)/i,
    confidence: 0.7,
    reason: 'Contains expandable content markers',
  },
  // Bullet Insight Panel - insight/bullet patterns
  {
    format: 'bullet-insight',
    pattern: /(?:Insight:|Key Insight:|Note:|Tip:|Pro tip:|Did you know:|Interesting:)/i,
    confidence: 0.75,
    reason: 'Contains insight or tip markers',
  },
  // Concept Breakdown - definition/example/analogy
  {
    format: 'concept-breakdown',
    pattern: /(?:Definition:|Example:|Analogy:|What is:|Concept:|Explanation:)/i,
    confidence: 0.8,
    reason: 'Contains concept explanation structure',
  },
  // Quote Card - quotation patterns
  {
    format: 'quote-card',
    pattern: /^>\s*.+|^[""]/m,
    confidence: 0.75,
    reason: 'Contains blockquote or quote patterns',
  },
  // Dialogue Script - speaker patterns
  {
    format: 'dialogue-script',
    pattern: /^([A-Z][a-z]+):\s*.+|^\s*["""][^"""]*["""]|^\s*[""]([^""]+)[""]\s*$/m,
    confidence: 0.75,
    reason: 'Contains dialogue script format',
  },
  // Story Panel - narrative patterns
  {
    format: 'story-panel',
    pattern: /(?:Once upon a time|Long ago|In a land|Chapter\s+\d+|Story:)/i,
    confidence: 0.7,
    reason: 'Contains narrative/story structure',
  },
  // Social Post Preview - social media patterns
  {
    format: 'social-post',
    pattern: /@[a-zA-Z0-9_]+|#\w+|\b(?:likes?\s+\d+|comments?\s+\d+|shares?\s+\d+)\b/i,
    confidence: 0.65,
    reason: 'Contains social media elements',
  },
  // Roadmap View - phases and milestones
  {
    format: 'roadmap',
    pattern: /(?:Phase\s+\d+|Milestone:|Roadmap:|Timeline:|Sprint\s+\d+)/i,
    confidence: 0.8,
    reason: 'Contains roadmap or phase structure',
  },
  // Kanban Board - To-do/Doing/Done columns
  {
    format: 'kanban',
    pattern: /(?:To[-\s]?Do:|In Progress:|Done:|Backlog:|WIP:|Completed:)/i,
    confidence: 0.85,
    reason: 'Contains kanban board structure',
  },
  // Decision Matrix - weighted criteria
  {
    format: 'decision-matrix',
    pattern: /(?:Weight:|Score:|Criteria:|Rating:|Priority:|Importance:)/i,
    confidence: 0.75,
    reason: 'Contains decision matrix or weighted criteria',
  },
  // Data Table - structured data patterns
  {
    format: 'data-table',
    pattern: /(?:Name|Type|Value|Status|ID|#)\s*[:|]\s*\S+/i,
    confidence: 0.65,
    reason: 'Contains structured data fields',
  },
  // Diagram View - visual structure hints
  {
    format: 'diagram',
    pattern: /(?:Diagram:|Chart:|Graph:|Flowchart:|Architecture:|Structure:)/i,
    confidence: 0.7,
    reason: 'Contains diagram or visual structure markers',
  },
];

/**
 * Detect all matching formats in the given text
 */
export function detectFormats(
  text: string,
  options?: {
    minConfidence?: number;
    includeUnstructured?: boolean;
  }
): DetectedFormat[] {
  const { minConfidence = 0.6, includeUnstructured = true } = options ?? {};
  const results: DetectedFormat[] = [];
  const seenFormats = new Set<OutputFormat>();

  for (const fmt of FORMAT_PATTERNS) {
    if (fmt.exclusive && seenFormats.has(fmt.format)) continue;

    const match = fmt.pattern.exec(text);
    if (match && fmt.confidence >= minConfidence) {
      results.push({
        format: fmt.format,
        confidence: fmt.confidence,
        reason: fmt.reason,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
      seenFormats.add(fmt.format);
    }
  }

  // If no formats detected and includeUnstructured is true, classify as unstructured
  if (results.length === 0 && includeUnstructured) {
    results.push({
      format: 'unstructured',
      confidence: 1.0,
      reason: 'No specific format pattern detected',
      startIndex: 0,
      endIndex: text.length,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect the primary format with highest confidence
 */
export function detectPrimaryFormat(text: string): DetectedFormat {
  const results = detectFormats(text);
  return results[0] ?? {
    format: 'unstructured',
    confidence: 1.0,
    reason: 'Fallback for empty or unrecognized content',
    startIndex: 0,
    endIndex: text.length,
  };
}

/**
 * Segment text into format sections for mixed content
 */
export interface FormatSegment {
  format: OutputFormat;
  content: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export function segmentContent(
  text: string,
  options?: {
    minConfidence?: number;
    greedy?: boolean;
  }
): FormatSegment[] {
  const { minConfidence = 0.6, greedy = false } = options ?? {};
  const segments: FormatSegment[] = [];
  
  // Simple segmentation: split by double newlines and detect format for each section
  const sections = text.split(/\n\n+/);
  let currentIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) {
      currentIndex += section.length;
      continue;
    }

    const detection = detectPrimaryFormat(trimmed);
    
    if (detection.confidence >= minConfidence) {
      segments.push({
        format: detection.format,
        content: trimmed,
        confidence: detection.confidence,
        startIndex: currentIndex,
        endIndex: currentIndex + section.length,
      });
    } else if (greedy) {
      segments.push({
        format: 'unstructured',
        content: trimmed,
        confidence: 1 - detection.confidence,
        startIndex: currentIndex,
        endIndex: currentIndex + section.length,
      });
    }

    currentIndex += section.length;
  }

  return segments;
}

/**
 * Parse schema-based tags from content (custom marker-based detection)
 */
export interface SchemaTag {
  tag: string;
  content: string;
  attributes?: Record<string, string>;
}

const SCHEMA_TAG_PATTERN = /<(\w+)(?:\s+([^>]*))?>((?:(?!<\/\1>)[^])*)<\/\1>/gi;
const SCHEMA_ATTR_PATTERN = /(\w+)=["']([^"']*)["']/g;

export function extractSchemaTags(text: string): SchemaTag[] {
  const tags: SchemaTag[] = [];
  
  let match;
  while ((match = SCHEMA_TAG_PATTERN.exec(text)) !== null) {
    const [, tag, attrsStr, content] = match;
    const attributes: Record<string, string> = {};
    
    let attrMatch;
    while ((attrMatch = SCHEMA_ATTR_PATTERN.exec(attrsStr)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }
    
    tags.push({ tag, content: content.trim(), attributes });
  }
  
  return tags;
}

/**
 * Detect format from schema tags if present
 */
export function detectFormatFromSchemaTags(text: string): DetectedFormat | null {
  const tags = extractSchemaTags(text);
  
  if (tags.length === 0) return null;

  const tagNames = tags.map(t => t.tag.toLowerCase());
  
  // Map schema tags to output formats
  const tagToFormatMap: Record<string, OutputFormat> = {
    code: 'code-box',
    api: 'api-response',
    json: 'api-response',
    xml: 'api-response',
    checklist: 'checklist',
    steps: 'step-guide',
    table: 'comparison-table',
    timeline: 'timeline',
    qa: 'qa-panel',
    faq: 'qa-panel',
    flashcard: 'flashcard',
    error: 'error-debug',
    debug: 'error-debug',
    myth: 'myth-fact',
    fact: 'myth-fact',
    terminal: 'terminal-sim',
    config: 'config-file',
    summary: 'summary-card',
    expandable: 'expandable',
    details: 'expandable',
    insight: 'bullet-insight',
    concept: 'concept-breakdown',
    definition: 'concept-breakdown',
    quote: 'quote-card',
    dialogue: 'dialogue-script',
    story: 'story-panel',
    social: 'social-post',
    roadmap: 'roadmap',
    kanban: 'kanban',
    matrix: 'decision-matrix',
    data: 'data-table',
    diagram: 'diagram',
  };

  for (const tagName of tagNames) {
    if (tagToFormatMap[tagName]) {
      return {
        format: tagToFormatMap[tagName],
        confidence: 1.0,
        reason: `Schema tag <${tagName}> detected`,
        startIndex: 0,
        endIndex: text.length,
        metadata: { schemaTag: tagName },
      };
    }
  }

  return null;
}

/**
 * Full format detection with schema tag support
 */
export function detectFormatsComplete(
  text: string,
  options?: {
    minConfidence?: number;
    includeUnstructured?: boolean;
    prioritySchemaTags?: boolean;
  }
): DetectedFormat[] {
  const { minConfidence = 0.6, includeUnstructured = true, prioritySchemaTags = true } = options ?? {};
  
  // First check for schema tags
  if (prioritySchemaTags) {
    const schemaDetection = detectFormatFromSchemaTags(text);
    if (schemaDetection) {
      return [schemaDetection];
    }
  }
  
  // Fall back to pattern-based detection
  return detectFormats(text, { minConfidence, includeUnstructured });
}
