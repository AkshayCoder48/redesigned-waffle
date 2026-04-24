export interface MarkdownType {
  id: string;
  name: string;
  description: string;
  instruction: string;
}

export const MARKDOWN_TYPES: MarkdownType[] = [
  {
    id: 'general',
    name: 'General Markdown',
    description: 'Balanced headings, bullets, and short sections.',
    instruction: 'Use clean heading hierarchy, short paragraphs, and bullet lists where useful.',
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level concise summary with key decisions and actions.',
    instruction: 'Start with a short summary, then key points, risks, and action items.',
  },
  {
    id: 'step-by-step',
    name: 'Step-by-step Guide',
    description: 'Ordered process instructions with prerequisites and validation.',
    instruction: 'Provide prerequisites, numbered steps, and a verification section at the end.',
  },
  {
    id: 'code-first',
    name: 'Code Markdown',
    description: 'Code blocks first, followed by explanation and usage.',
    instruction: 'Prioritize fenced code blocks with language tags and explain each block briefly.',
  },
  {
    id: 'api-reference',
    name: 'API Reference',
    description: 'Structured endpoint or function documentation.',
    instruction: 'Use sections for purpose, parameters, response/output, examples, and error cases.',
  },
  {
    id: 'comparison',
    name: 'Comparison Table',
    description: 'Tabular comparison of options and trade-offs.',
    instruction: 'Use markdown tables for side-by-side comparison and include recommendation criteria.',
  },
  {
    id: 'checklist',
    name: 'Checklist',
    description: 'Actionable task list with completion checkboxes.',
    instruction: 'Use checkbox markdown lists grouped by phase or priority.',
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Issue/symptom to cause/fix mapping.',
    instruction: 'Organize by symptoms, probable causes, fixes, and verification steps.',
  },
  {
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Learning-oriented walkthrough with examples.',
    instruction: 'Use lesson-style structure with objectives, examples, and quick recap.',
  },
  {
    id: 'qa',
    name: 'Q&A Format',
    description: 'Question-and-answer style explanation.',
    instruction: 'Use clear questions as headings and concise practical answers below each question.',
  },
  {
    id: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions with direct answers.',
    instruction: 'Provide an FAQ list with direct, compact answers and optional links.',
  },
  {
    id: 'research-brief',
    name: 'Research Brief',
    description: 'Hypothesis, findings, sources, and limitations.',
    instruction: 'Include objective, findings, supporting evidence, limitations, and next research steps.',
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Scope, milestones, owners, and timeline.',
    instruction: 'Provide scope, phases, milestones, owners, risks, and dependencies.',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Chronological events or schedule output.',
    instruction: 'Use dated milestones in chronological order with clear status markers.',
  },
  {
    id: 'decision-log',
    name: 'Decision Log',
    description: 'Context, decision, alternatives, and rationale.',
    instruction: 'Capture context, chosen decision, alternatives considered, and rationale.',
  },
  {
    id: 'release-notes',
    name: 'Release Notes',
    description: 'Versioned change log with highlights.',
    instruction: 'Structure by added, changed, fixed, and breaking changes.',
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Repro steps, expected/actual behavior, and evidence.',
    instruction: 'Use sections for environment, reproduction steps, expected result, actual result, and impact.',
  },
  {
    id: 'sop',
    name: 'SOP',
    description: 'Standard operating procedure format.',
    instruction: 'Use purpose, scope, responsibilities, procedure, and compliance checks.',
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Agenda, discussion points, and decisions.',
    instruction: 'Use agenda, discussion summary, decisions, and follow-up actions with owners.',
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    description: 'Study card format with question/answer pairs.',
    instruction: 'Produce concise flashcards using bold Q/A blocks and optional difficulty tags.',
  },
];

const GENERAL_MARKDOWN_RULES = [
  'Return valid markdown only.',
  'Use descriptive headings and compact paragraphs.',
  'Use fenced code blocks with language names when code is present.',
  'Use tables only when they improve readability.',
  'End with a short next-steps or summary section when relevant.',
].join(' ');

export function getMarkdownTypeById(id?: string): MarkdownType {
  if (!id) return MARKDOWN_TYPES[0];
  return MARKDOWN_TYPES.find((type) => type.id === id) || MARKDOWN_TYPES[0];
}

export function buildMarkdownSystemPrompt(selectedTypeId?: string): string {
  const selectedType = getMarkdownTypeById(selectedTypeId);
  const availableTypes = MARKDOWN_TYPES.map((type) => `- ${type.name}: ${type.description}`).join('\n');

  return [
    'You are an expert assistant that must reply with polished markdown.',
    GENERAL_MARKDOWN_RULES,
    `Selected markdown style: ${selectedType.name}.`,
    `Style instruction: ${selectedType.instruction}`,
    'Available markdown styles in this app:',
    availableTypes,
  ].join('\n\n');
}
