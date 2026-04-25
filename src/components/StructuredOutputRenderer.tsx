/**
 * Structured Output Renderer
 * Replaces markdown-style rendering with auto-detected format-specific UI components.
 * Supports progressive rendering during token streaming and mixed format output.
 */

import React, { useMemo, useState } from 'react';
import { type OutputFormat, detectFormatsComplete, segmentContent } from '../utils/outputFormatDetector';
import {
  Code2, Copy, Check, ListOrdered, ListChecks, FileText, ChevronDown, ChevronRight,
  Table, Zap, BookOpen, HelpCircle, Layers, Clock, GitBranch, AlertTriangle,
  Terminal, FileCode, MessageSquare, Quote, Users, Share2, Map, Columns, Grid3x3,
  AlertCircle, FileJson, BarChart3, Bug, Settings2, BookOpen as BookOpenIcon, MessageCircle,
  Calendar, GitPullRequest
} from 'lucide-react';

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

// Format component interfaces
interface FormatComponentProps {
  content: string;
  metadata?: Record<string, unknown>;
}

// ============ Code Box ============
export function CodeBox({ content, metadata }: FormatComponentProps) {
  const language = (metadata?.language as string) || detectLanguage(content);
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

// ============ Step-by-Step Guide ============
export function StepGuide({ content }: FormatComponentProps) {
  const steps = useMemo(() => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
      // Remove leading number/dot pattern
      const cleanLine = line.replace(/^\s*(\d+[.):]|\*)\s*/, '');
      return { id: i + 1, text: cleanLine };
    });
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Step-by-Step Guide</span>
        </div>
      </div>
      <div className="p-4">
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[12px] font-medium text-violet-300">
                {step.id}
              </div>
              <div className="flex-1 pt-0.5 text-[14px] leading-relaxed text-zinc-200">
                {step.text}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ============ Checklist ============
export function ChecklistView({ content }: FormatComponentProps) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const items = useMemo(() => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
      const match = line.match(/^\s*[-*]\s*\[([ x])\]\s*(.+)/);
      if (match) {
        return { id: i, checked: match[1] === 'x', text: match[2] };
      }
      return { id: i, checked: false, text: line.replace(/^\s*[-*]\s*/, '') };
    });
  }, [content]);

  const toggleItem = (id: number) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-400" />
          <span className="text-[13px] font-medium text-emerald-200">Checklist</span>
        </div>
      </div>
      <div className="space-y-1 p-3">
        {items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[14px] transition hover:bg-white/5">
            <input
              type="checkbox"
              checked={checked[item.id] ?? item.checked}
              onChange={() => toggleItem(item.id)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <span className={`flex-1 ${checked[item.id] ?? item.checked ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
              {item.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============ Summary Card ============
export function SummaryCard({ content }: FormatComponentProps) {
  const points = content.split('\n').filter(l => l.trim());
  
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
      <div className="border-b border-white/5 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-400" />
          <span className="text-[13px] font-medium text-amber-200">Summary</span>
        </div>
      </div>
      <div className="p-4">
        {points.map((point, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="text-[14px] leading-relaxed text-zinc-200">{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Expandable Sections ============
export function ExpandableSections({ content }: FormatComponentProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const sections = useMemo(() => {
    const parts = content.split(/\n\n+/).filter(p => p.trim());
    return parts.map((part, i) => {
      const lines = part.split('\n');
      const title = lines[0]?.replace(/^[#*\s]+/, '') || `Section ${i + 1}`;
      return { id: i, title, content: lines.slice(1).join('\n').trim() };
    });
  }, [content]);

  const toggleSection = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="my-3 space-y-2">
      {sections.map((section) => (
        <div key={section.id} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
          <button
            onClick={() => toggleSection(section.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/5"
          >
            <div className="flex items-center gap-2">
              {expanded[section.id] ? (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              )}
              <span className="text-[14px] font-medium text-zinc-200">{section.title}</span>
            </div>
          </button>
          {expanded[section.id] && (
            <div className="border-t border-white/5 px-4 py-3 text-[14px] leading-relaxed text-zinc-300">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ Comparison Table ============
export function ComparisonTable({ content }: FormatComponentProps) {
  const rows = useMemo(() => {
    const lines = content.split('\n').filter(l => l.trim() && l.includes('|'));
    return lines.map(line => line.split('|').filter(c => c.trim() && !c.match(/^[\s-]+$/)));
  }, [content]);

  const isHeader = (row: string[]) => row.some(cell => cell.match(/^-+$/));

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Comparison</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-zinc-900/30' : ''}>
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 text-zinc-300 ${j === 0 ? 'font-medium text-zinc-100' : ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Bullet Insight Panel ============
export function BulletInsightPanel({ content }: FormatComponentProps) {
  const insights = content.split('\n').filter(l => l.trim());
  
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/5">
      <div className="border-b border-white/5 bg-cyan-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-400" />
          <span className="text-[13px] font-medium text-cyan-200">Key Insights</span>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-cyan-400" />
            <span className="text-[14px] leading-relaxed text-zinc-200">{insight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Concept Breakdown ============
export function ConceptBreakdown({ content }: FormatComponentProps) {
  const sections = useMemo(() => {
    const parts: { type: 'definition' | 'example' | 'analogy' | 'default'; text: string }[] = [];
    const lines = content.split('\n');
    let currentSection = { type: 'default' as const, text: '' };

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('definition:') || lower.includes('definition')) {
        if (currentSection.text) sections.push(currentSection);
        currentSection = { type: 'definition', text: line.replace(/^[#*\s]*definition:?\s*/i, '') };
      } else if (lower.includes('example:') || lower.includes('example')) {
        if (currentSection.text) sections.push(currentSection);
        currentSection = { type: 'example', text: line.replace(/^[#*\s]*example:?\s*/i, '') };
      } else if (lower.includes('analogy:') || lower.includes('analogy')) {
        if (currentSection.text) sections.push(currentSection);
        currentSection = { type: 'analogy', text: line.replace(/^[#*\s]*analogy:?\s*/i, '') };
      } else {
        currentSection.text += (currentSection.text ? '\n' : '') + line;
      }
    }
    if (currentSection.text) sections.push(currentSection);
    return sections;
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-violet-500/20 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Concept Breakdown</span>
        </div>
      </div>
      <div className="space-y-3 p-4">
        {sections.map((section, i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-zinc-950/50 p-3">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {section.type}
            </div>
            <div className="text-[14px] leading-relaxed text-zinc-200">{section.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Q&A Panel ============
export function QAPanel({ content }: FormatComponentProps) {
  const pairs = useMemo(() => {
    // Split by any newline sequence (single or double) to capture all content
    const lines = content.split(/\n+/).filter(l => l.trim());
    const result: { question: string; answer: string }[] = [];
    let currentQuestion = '';
    let currentAnswer: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect question lines (ending with ? or containing Q: prefix)
      const isQuestion = /\?$/.test(trimmed) || /^Q[:\.\s]|^Question[:\.\s]/i.test(trimmed);
      const cleanQuestion = trimmed.replace(/^[#*\s]*(?:Q[:\.\s]|Question[:\.\s]\s*)/i, '').replace(/\?$/, '').trim();

      if (isQuestion && cleanQuestion) {
        // Save previous Q&A pair if exists
        if (currentQuestion) {
          result.push({
            question: currentQuestion,
            answer: currentAnswer.join('\n').trim() || '(no answer provided)',
          });
        }
        currentQuestion = cleanQuestion;
        currentAnswer = [];
      } else if (currentQuestion) {
        // This is answer content
        currentAnswer.push(trimmed);
      } else {
        // No question yet, treat as initial answer or preamble
        currentQuestion = trimmed.replace(/\?$/, '').trim() || 'Question';
        currentAnswer = [];
      }
    }

    // Don't forget the last pair
    if (currentQuestion) {
      result.push({
        question: currentQuestion,
        answer: currentAnswer.join('\n').trim() || '(no answer provided)',
      });
    }

    return result;
  }, [content]);

  return (
    <div className="my-3 space-y-3">
      {pairs.map((pair, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
          <div className="bg-violet-500/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <span className="text-[14px] font-medium text-violet-200">{pair.question}?</span>
            </div>
          </div>
          <div className="p-4 text-[14px] leading-relaxed text-zinc-300">
            {pair.answer}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Flashcard Mode ============
export function FlashcardMode({ content }: FormatComponentProps) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const cards = useMemo(() => {
    const parts = content.split(/\n\n+/).filter(p => p.trim());
    return parts.map((part, i) => {
      const lines = part.split('\n');
      const front = lines[0]?.replace(/^[#*\s]*(?:question:|term:|front:)\s*/i, '') || lines[0] || '';
      const back = lines.slice(1).join('\n').trim() || lines[1] || '';
      return { id: i, front, back };
    });
  }, [content]);

  return (
    <div className="my-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => setFlipped(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
          className="group min-h-[120px] cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-center transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10"
        >
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {flipped[card.id] ? 'Answer' : 'Question'}
            </div>
            <div className="text-[14px] font-medium text-zinc-100">
              {flipped[card.id] ? card.back : card.front}
            </div>
            <div className="mt-3 text-[10px] text-zinc-500 transition group-hover:text-violet-400">
              {flipped[card.id] ? 'Click to flip back' : 'Click to reveal answer'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Timeline View ============
export function TimelineView({ content }: FormatComponentProps) {
  const events = useMemo(() => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map((line, i) => ({
      id: i,
      text: line.replace(/^[#*\s\d\-\.]+\s*/, ''),
      date: extractDate(line) || `Phase ${i + 1}`
    }));
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-amber-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="text-[13px] font-medium text-amber-200">Timeline</span>
        </div>
      </div>
      <div className="p-4">
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 h-full w-px bg-gradient-to-b from-amber-500 via-violet-500 to-cyan-500" />
          {events.map((event) => (
            <div key={event.id} className="relative mb-4 last:mb-0">
              <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-amber-500 bg-zinc-950" />
              <div className="text-[11px] font-medium text-zinc-500">{event.date}</div>
              <div className="text-[14px] leading-relaxed text-zinc-200">{event.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Diagram View ============
export function DiagramView({ content }: FormatComponentProps) {
  const elements = useMemo(() => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map((line, i) => ({
      id: i,
      label: line.replace(/^[#*\s\[\]\d\-\.]+\s*/, ''),
      type: line.includes('-->') ? 'arrow' : 'node'
    }));
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Diagram</span>
        </div>
      </div>
      <div className="flex min-h-[100px] flex-col items-center justify-center gap-2 p-6">
        {elements.map((el) => (
          <div key={el.id} className="flex items-center gap-2">
            <div className={`rounded-lg border px-4 py-2 text-[14px] font-medium ${el.type === 'arrow' ? 'border-zinc-600 bg-zinc-800 text-zinc-400' : 'border-violet-500/30 bg-violet-500/10 text-violet-200'}`}>
              {el.label}
            </div>
            {el.id < elements.length - 1 && <div className="text-zinc-500">→</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Myth vs Fact Box ============
export function MythFactBox({ content }: FormatComponentProps) {
  const items = useMemo(() => {
    const parts = content.split(/\n\n+/).filter(p => p.trim());
    return parts.map((part, i) => {
      const lines = part.split('\n');
      const mythLine = lines.find(l => /myth|false/i.test(l));
      const factLine = lines.find(l => /fact|true|actually/i.test(l));
      return {
        id: i,
        myth: mythLine?.replace(/^[#*\s]*(?:myth:|false:)\s*/i, '') || lines[0],
        fact: factLine?.replace(/^[#*\s]*(?:fact:|true:|actually:)\s*/i, '') || lines[1] || ''
      };
    });
  }, [content]);

  return (
    <div className="my-3 space-y-3">
      {items.map((item) => (
        <div key={item.id} className="grid gap-2 sm:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-[12px] font-medium text-red-200">Myth</span>
            </div>
            <div className="text-[14px] text-zinc-200">{item.myth}</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-[12px] font-medium text-emerald-200">Fact</span>
            </div>
            <div className="text-[14px] text-zinc-200">{item.fact}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Terminal Simulation Box ============
export function TerminalSimulationBox({ content }: FormatComponentProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-green-500/20 bg-zinc-950">
      <div className="flex items-center border-b border-white/5 bg-zinc-900/80 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>
        <div className="ml-3 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-zinc-500" />
          <span className="text-[11px] text-zinc-400">Terminal</span>
        </div>
      </div>
      <pre className="p-4 text-[13px]">
        <code className="font-mono text-green-400">{content}</code>
      </pre>
    </div>
  );
}

// ============ API Response Viewer ============
export function APIResponseViewer({ content }: FormatComponentProps) {
  let formatted: string;
  try {
    const parsed = JSON.parse(content);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = content;
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-cyan-500/20 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/5 bg-cyan-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-cyan-400" />
          <span className="text-[13px] font-medium text-cyan-200">API Response</span>
        </div>
        <CopyButton text={formatted} />
      </div>
      <pre className="max-h-[400px] overflow-auto p-4 text-[13px]">
        <code className="text-cyan-300">{formatted}</code>
      </pre>
    </div>
  );
}

// ============ Data Table UI ============
export function DataTableUI({ content }: FormatComponentProps) {
  const [sortColumn, setSortColumn] = useState<number>(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    const lines = content.split('\n').filter(l => l.trim() && l.includes('|'));
    return lines.map(line => line.split('|').filter(c => c.trim() && !c.match(/^[\s-]+$/)));
  }, [content]);

  const filteredRows = useMemo(() => {
    if (!filter) return rows;
    return rows.filter(row => row.some(cell => cell.toLowerCase().includes(filter.toLowerCase())));
  }, [rows, filter]);

  const sortedRows = useMemo(() => {
    if (rows.length <= 1) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredRows, sortColumn, sortAsc]);

  const handleSort = (col: number) => {
    if (col === sortColumn) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(col);
      setSortAsc(true);
    }
  };

  if (rows.length === 0) return null;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Data Table</span>
        </div>
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-zinc-800/50 px-2 py-1 text-[12px] text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500/50 focus:outline-none"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/5">
              {sortedRows[0]?.map((header, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="cursor-pointer px-3 py-2 text-left text-zinc-400 hover:bg-white/5"
                >
                  <div className="flex items-center gap-1">
                    {header}
                    {sortColumn === i && (
                      <span className="text-violet-400">{sortAsc ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.slice(1).map((row, i) => (
              <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-zinc-900/30' : ''}`}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-zinc-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Error Debug Panel ============
export function ErrorDebugPanel({ content }: FormatComponentProps) {
  const sections = useMemo(() => {
    const parts = content.split(/\n\n+/).filter(p => p.trim());
    return parts.map((part, i) => {
      const lines = part.split('\n');
      const issue = lines.find(l => /issue|problem|error/i.test(l))?.replace(/^[#*\s]*(?:issue:|problem:|error:)\s*/i, '') || '';
      const cause = lines.find(l => /cause|reason/i.test(l))?.replace(/^[#*\s]*(?:cause:|reason:)\s*/i, '') || '';
      const fix = lines.find(l => /fix|solution|resolution/i.test(l))?.replace(/^[#*\s]*(?:fix:|solution:|resolution:)\s*/i, '') || '';
      return { id: i, issue, cause, fix };
    }).filter(s => s.issue || s.cause || s.fix);
  }, [content]);

  return (
    <div className="my-3 space-y-3">
      {sections.map((section) => (
        <div key={section.id} className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/5">
          {section.issue && (
            <div className="border-b border-white/5 bg-red-500/10 px-4 py-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-[12px] font-medium text-red-200">Issue</span>
              </div>
              <div className="mt-1 text-[14px] text-zinc-200">{section.issue}</div>
            </div>
          )}
          {section.cause && (
            <div className="border-b border-white/5 bg-amber-500/5 px-4 py-2">
              <div className="text-[11px] font-medium text-amber-200">Cause</div>
              <div className="mt-1 text-[14px] text-zinc-200">{section.cause}</div>
            </div>
          )}
          {section.fix && (
            <div className="bg-emerald-500/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-[12px] font-medium text-emerald-200">Fix</span>
              </div>
              <div className="mt-1 text-[14px] text-zinc-200">{section.fix}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ Config File Box ============
export function ConfigFileBox({ content }: FormatComponentProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-blue-500/20 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/5 bg-blue-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-blue-400" />
          <span className="text-[13px] font-medium text-blue-200">Configuration</span>
        </div>
        <CopyButton text={content} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px]">
        <code className="text-blue-300">{content}</code>
      </pre>
    </div>
  );
}

// ============ Story Panel ============
export function StoryPanel({ content }: FormatComponentProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/5">
      <div className="border-b border-white/5 bg-violet-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Story</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-[14px] leading-relaxed italic text-zinc-200">
          {content}
        </div>
      </div>
    </div>
  );
}

// ============ Dialogue Script View ============
export function DialogueScriptView({ content }: FormatComponentProps) {
  const lines = useMemo(() => {
    const parts = content.split('\n').filter(l => l.trim());
    return parts.map((line, i) => {
      const match = line.match(/^([A-Z][a-z]+):\s*(.+)/);
      if (match) {
        return { id: i, speaker: match[1], text: match[2] };
      }
      return { id: i, speaker: '', text: line };
    });
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Dialogue</span>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {lines.map((line) => (
          <div key={line.id} className="flex gap-3">
            {line.speaker && (
              <div className="shrink-0 rounded-lg bg-violet-500/10 px-2 py-1 text-[12px] font-medium text-violet-300">
                {line.speaker}
              </div>
            )}
            <div className="text-[14px] leading-relaxed text-zinc-200">
              {line.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Quote Card ============
export function QuoteCard({ content }: FormatComponentProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="flex gap-4 p-6">
        <Quote className="h-8 w-8 shrink-0 text-violet-400 opacity-50" />
        <div className="flex-1">
          <blockquote className="text-[16px] italic leading-relaxed text-zinc-200">
            {content}
          </blockquote>
        </div>
      </div>
    </div>
  );
}

// ============ Social Post Preview ============
export function SocialPostPreview({ content }: FormatComponentProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="flex items-center gap-3 border-b border-white/5 bg-pink-500/5 px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500" />
        <div>
          <div className="text-[13px] font-medium text-zinc-100">Your Post</div>
          <div className="text-[11px] text-zinc-500">Just now</div>
        </div>
      </div>
      <div className="p-4">
        <div className="text-[14px] leading-relaxed text-zinc-200">{content}</div>
        <div className="mt-3 flex gap-4 border-t border-white/5 pt-3 text-[12px] text-zinc-500">
          <span>Like</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      </div>
    </div>
  );
}

// ============ Roadmap View ============
export function RoadmapView({ content }: FormatComponentProps) {
  const phases = useMemo(() => {
    const parts = content.split(/\n\n+/).filter(p => p.trim());
    return parts.map((part, i) => {
      const lines = part.split('\n');
      const title = lines[0]?.replace(/^[#*\s]*/, '') || `Phase ${i + 1}`;
      const items = lines.slice(1).filter(l => l.trim());
      return { id: i, title, items };
    });
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Roadmap</span>
        </div>
      </div>
      <div className="flex overflow-x-auto">
        {phases.map((phase, i) => (
          <div key={phase.id} className="min-w-[200px] flex-1 border-r border-white/5 last:border-r-0">
            <div className="border-b border-white/5 bg-violet-500/10 px-3 py-2">
              <div className="text-[12px] font-medium text-violet-200">Phase {i + 1}</div>
              <div className="text-[14px] font-medium text-zinc-100">{phase.title}</div>
            </div>
            <div className="space-y-2 p-3">
              {phase.items.map((item, j) => (
                <div key={j} className="flex items-center gap-2 text-[13px] text-zinc-300">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Kanban Board UI ============
export function KanbanBoardUI({ content }: FormatComponentProps) {
  const columns = useMemo(() => {
    const parts = content.split(/\n\n+/).filter(p => p.trim());
    const colNames = ['To-Do', 'In Progress', 'Done'];
    return colNames.map((name, i) => ({
      id: i,
      title: name,
      items: parts[i]?.split('\n').filter(l => l.trim()).map(l => l.replace(/^[#*\s\[\]\d\-\.]+\s*/, '')) || []
    }));
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Columns className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-violet-200">Kanban Board</span>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto p-4">
        {columns.map((col) => (
          <div key={col.id} className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-zinc-950/50 p-3">
            <div className="mb-2 text-[12px] font-medium text-zinc-400">{col.title}</div>
            <div className="space-y-2">
              {col.items.map((item, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Decision Matrix ============
export function DecisionMatrix({ content }: FormatComponentProps) {
  const rows = useMemo(() => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
      const parts = line.split(/[:|]/).map(p => p.trim()).filter(Boolean);
      return { id: i, cells: parts };
    });
  }, [content]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="border-b border-white/5 bg-amber-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-amber-400" />
          <span className="text-[13px] font-medium text-amber-200">Decision Matrix</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-zinc-900/30' : ''}`}>
                {row.cells.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-zinc-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Fallback: Plain Text Renderer ============
function PlainText({ content }: FormatComponentProps) {
  // Handle markdown-style content that doesn't fit other formats
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    const isLast = i === lines.length - 1;

    // Check for heading patterns
    if (/^#{1,6}\s/.test(line)) {
      elements.push(<h1 key={i} className="text-lg font-semibold text-zinc-100 mt-4 mb-2">{line.replace(/^#{1,6}\s/, '')}</h1>);
    }
    // Check for bullet points
    else if (/^[\s]*[-*]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-200">{line.replace(/^[\s]*[-*]\s/, '')}</span>
        </div>
      );
    }
    // Check for numbered list
    else if (/^\d+[.):]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="text-zinc-500 shrink-0">{line.match(/^\d+[.):]/)?.[0]}</span>
          <span className="text-zinc-200">{line.replace(/^\d+[.):]\s/, '')}</span>
        </div>
      );
    }
    // Check for code blocks
    else if (line.startsWith('```')) {
      const codeLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }
      elements.push(
        <pre key={i} className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
          <code className="block p-4 text-[13px] text-zinc-300">{codeLines.join('\n')}</code>
        </pre>
      );
      i = j;
    }
    // Check for horizontal rule
    else if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-4 border-white/10" />);
    }
    // Check for blockquote
    else if (line.startsWith('>')) {
      elements.push(<blockquote key={i} className="border-l-2 border-violet-500 pl-3 italic text-zinc-300 my-2">{line.replace(/^>\s*/, '')}</blockquote>);
    }
    // Check for bold/italic text markers
    else if (/\*\*|__|\*|_/.test(line)) {
      elements.push(
        <div key={i} className="text-zinc-200">
          {parseInlineMarkdown(line)}
        </div>
      );
    }
    // Empty line check - add spacing
    else if (!line.trim()) {
      if (!isLast && nextLine?.trim()) {
        elements.push(<div key={i} className="h-2" />);
      }
    }
    // Regular paragraph
    else {
      elements.push(<p key={i} className="text-zinc-200 leading-relaxed">{line}</p>);
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

// Helper to parse inline markdown (bold, italic, code)
function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/) || remaining.match(/__(.+?)__/);
    // Italic: *text* or _text_ (not already captured by bold)
    const italicMatch = remaining.match(/\*(.+?)\*/) || remaining.match(/_(.+?)_/);
    // Inline code: `code`
    const codeMatch = remaining.match(/`(.+?)`/);

    if (boldMatch && (!italicMatch || boldMatch.index! <= italicMatch.index!)) {
      if (boldMatch.index! > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index!)}</span>);
      }
      parts.push(<strong key={key++} className="font-semibold text-zinc-100">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index! + boldMatch[0].length);
    } else if (italicMatch) {
      if (italicMatch.index! > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, italicMatch.index!)}</span>);
      }
      parts.push(<em key={key++} className="italic text-zinc-300">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch.index! + italicMatch[0].length);
    } else if (codeMatch) {
      if (codeMatch.index! > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index!)}</span>);
      }
      parts.push(<code key={key++} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[12px] text-violet-300">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch.index! + codeMatch[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return <>{parts}</>;
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
  return 'Code';
}

function extractDate(text: string): string | null {
  const dateMatch = text.match(/(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  return dateMatch ? dateMatch[1] : null;
}

// ============ Main Renderer Component ============
interface StructuredOutputRendererProps {
  content: string;
  className?: string;
  enableMixedFormats?: boolean;
}

export default function StructuredOutputRenderer({ content, className = '', enableMixedFormats = true }: StructuredOutputRendererProps) {
  const segments = useMemo(() => {
    if (!enableMixedFormats) {
      return [{ format: 'unstructured' as const, content, confidence: 1.0, startIndex: 0, endIndex: content.length }];
    }
    return segmentContent(content);
  }, [content, enableMixedFormats]);

  const renderFormat = (format: OutputFormat, text: string) => {
    const props: FormatComponentProps = { content: text };

    switch (format) {
      case 'code-box': return <CodeBox {...props} />;
      case 'step-guide': return <StepGuide {...props} />;
      case 'checklist': return <ChecklistView {...props} />;
      case 'summary-card': return <SummaryCard {...props} />;
      case 'expandable': return <ExpandableSections {...props} />;
      case 'comparison-table': return <ComparisonTable {...props} />;
      case 'bullet-insight': return <BulletInsightPanel {...props} />;
      case 'concept-breakdown': return <ConceptBreakdown {...props} />;
      case 'qa-panel': return <QAPanel {...props} />;
      case 'flashcard': return <FlashcardMode {...props} />;
      case 'timeline': return <TimelineView {...props} />;
      case 'diagram': return <DiagramView {...props} />;
      case 'myth-fact': return <MythFactBox {...props} />;
      case 'terminal-sim': return <TerminalSimulationBox {...props} />;
      case 'api-response': return <APIResponseViewer {...props} />;
      case 'data-table': return <DataTableUI {...props} />;
      case 'error-debug': return <ErrorDebugPanel {...props} />;
      case 'config-file': return <ConfigFileBox {...props} />;
      case 'story-panel': return <StoryPanel {...props} />;
      case 'dialogue-script': return <DialogueScriptView {...props} />;
      case 'quote-card': return <QuoteCard {...props} />;
      case 'social-post': return <SocialPostPreview {...props} />;
      case 'roadmap': return <RoadmapView {...props} />;
      case 'kanban': return <KanbanBoardUI {...props} />;
      case 'decision-matrix': return <DecisionMatrix {...props} />;
      default: return <PlainText {...props} />;
    }
  };

  if (!content.trim()) return null;

  return (
    <div className={`structured-output ${className}`}>
      {segments.map((segment, i) => (
        <div key={i}>
          {renderFormat(segment.format, segment.content)}
        </div>
      ))}
    </div>
  );
}
