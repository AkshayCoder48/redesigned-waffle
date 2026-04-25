/**
 * Simplified Structured Output Renderer
 * Renders only code blocks with syntax highlighting and plain text for everything else.
 * Optimized for instant code rendering during streaming.
 */

import React, { useMemo, useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

// Common utility for copy button
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-white/10 bg-zinc-800/50 p-1.5 text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ============ Code Box ============
export function CodeBox({ content, language: providedLanguage }: { content: string; language?: string }) {
  const language = providedLanguage || detectLanguage(content);
  const lines = content.split('\n');
  
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-violet-400" />
          <span className="text-[11px] font-medium text-zinc-300">{language}</span>
        </div>
        <CopyButton text={content} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="text-zinc-300">{content}</code>
      </pre>
      {lines.length > 1 && (
        <div className="flex border-t border-white/5">
          {lines.map((_, i) => (
            <div key={i} className="px-2 py-1 text-[10px] text-zinc-600">
              {i + 1}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Helper Functions ============
function detectLanguage(code: string): string {
  const lower = code.toLowerCase();
  if (lower.includes('import ') || lower.includes('export ') || lower.includes('const ')) return 'JavaScript/TypeScript';
  if (lower.includes('def ') || lower.includes('import ') || lower.includes('print(')) return 'Python';
  if (lower.includes('#include') || lower.includes('int main')) return 'C/C++';
  if (lower.includes('function ') || lower.includes('=>')) return 'JavaScript';
  if (lower.includes('class ') && lower.includes('public')) return 'Java';
  if (lower.includes('package ') || lower.includes('namespace ')) return 'C#';
  if (lower.includes('SELECT ') || lower.includes('FROM ') || lower.includes('WHERE ')) return 'SQL';
  if (lower.includes('api') || lower.includes('endpoint')) return 'API';
  if (lower.includes('{') && lower.includes(':') && lower.includes('}')) return 'JSON';
  if (lower.includes('html') || lower.includes('<!DOCTYPE')) return 'HTML';
  if (lower.includes('css') || lower.includes('background')) return 'CSS';
  return 'Code';
}

// Code detection patterns
const CODE_PATTERNS = [
  /^```[\w]*\n[\s\S]*?```$/m,  // Fenced code blocks
  /^```[\s\S]*?```$/m,          // Any fenced code
  /`[^`]+`/,                    // Inline code
  /\b(function|const|let|var|import|export|class|def|if|for|while|return|async|await)\b/,
  /\b(import|from|def|class|if __name__|print\(|console\.log)\b/,
  /\{[\s\S]*:[\s\S]*\}/,        // Object literals
  /<\/?[a-z][\s\S]*>/i,         // HTML/XML tags
];

function isCodeContent(text: string): boolean {
  // Check for fenced code blocks
  if (/```/.test(text)) return true;
  
  // Check for code patterns
  for (const pattern of CODE_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  
  return false;
}

// Extract code blocks from content
function extractCodeBlocks(text: string): Array<{ type: 'code' | 'text'; content: string }> {
  const segments: Array<{ type: 'code' | 'text'; content: string }> = [];
  
  // Check for fenced code blocks first
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  const hasCodeBlocks = codeBlockRegex.test(text);
  codeBlockRegex.lastIndex = 0; // Reset regex
  
  if (hasCodeBlocks) {
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index).trim();
        if (textBefore) {
          segments.push({ type: 'text', content: textBefore });
        }
      }
      
      // Add code block
      segments.push({ 
        type: 'code', 
        content: match[2],
        language: match[1] || undefined 
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex).trim();
      if (remaining) {
        segments.push({ type: 'text', content: remaining });
      }
    }
  } else {
    // No fenced code blocks - check if entire content is code
    segments.push({ type: isCodeContent(text) ? 'code' : 'text', content: text });
  }
  
  return segments;
}

// ============ Main Renderer Component ============
interface StructuredOutputRendererProps {
  content: string;
  className?: string;
  enableMixedFormats?: boolean;
}

export default function StructuredOutputRenderer({ content, className = '' }: StructuredOutputRendererProps) {
  const segments = useMemo(() => {
    if (!content.trim()) return [];
    return extractCodeBlocks(content);
  }, [content]);

  if (!content.trim()) return null;

  return (
    <div className={`structured-output ${className}`}>
      {segments.map((segment, i) => (
        <div key={i}>
          {segment.type === 'code' ? (
            <CodeBox content={segment.content} />
          ) : (
            <div className="whitespace-pre-wrap text-zinc-100 leading-relaxed">{segment.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}
