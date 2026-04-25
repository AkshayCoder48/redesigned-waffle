/**
 * Enhanced Orchestrator with Auto-Swarming and Multi-Agent Orchestration
 * Detects task complexity and automatically invokes additional agents when needed.
 * Implements fan-out/fan-in patterns for parallel agent execution.
 */

// Task complexity levels
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'very-complex';

// Agent invocation tracking
export interface AgentInvocation {
  agentId: string;
  agentName: string;
  reason: string;
  startTime: number;
  endTime?: number;
  success?: boolean;
  output?: string;
  error?: string;
}

export interface SwarmResult {
  primaryOutput: string;
  agentOutputs: Record<string, string>;
  invocations: AgentInvocation[];
  taskComplexity: TaskComplexity;
  totalDuration: number;
  synthesis: string;
}

export interface OrchestratorSettingsLike {
  connectionType: 'local' | 'openai';
  customModelId: string;
  localModels: Array<{ id: string; name: string; format: string; testStatus?: 'pending' | 'testing' | 'passed' | 'failed' }>;
  agentModelAssignments: Record<string, string[]>;
  selectedProviderId?: string;
  selectedModelId?: string;
  providerTemplates?: Array<{
    id: string;
    name: string;
    apiBaseUrl?: string;
    apiKey?: string;
    models: Array<{ id: string; name: string }>;
  }>;
}

// Agent names mapping
const AGENT_NAMES: Record<string, string> = {
  research: 'Research Agent',
  coding: 'Coding Agent',
  chat: 'Chat Agent',
  docs: 'Documentation Agent',
  browser: 'Browser Agent',
  testing: 'Testing Agent',
  uiux: 'UI/UX Agent',
  data: 'Data Agent',
  debugging: 'Debugging Agent',
  study: 'Study Assistant',
  documentation: 'Documentation Agent',
  api: 'API Integration Agent',
  orchestrator: 'Orchestrator',
};

export function getAgentDisplayName(agentId: string): string {
  return AGENT_NAMES[agentId] || 'Agent';
}

// Complexity heuristics
const COMPLEXITY_INDICATORS = {
  // Very complex indicators
  veryComplex: [
    /\banalyze\s+(?:in\s+)?depth/i,
    /\bcomprehensive\s+(?:analysis|review)/i,
    /\bmulti[- ]?(?:step|tier|layer)/i,
    /\bcomplex\s+(?:system|architecture|algorithm)/i,
    /\bdesign\s+(?:system|architecture|framework)/i,
    /\bcompare\s+(?:and\s+)?contrast/i,
    /\bimplement\s+(?:from\s+)?scratch/i,
    /\bbuild\s+(?:a\s+)?complete/i,
    /\bfull[- ]stack/i,
    /\bend[- ]to[- ]end/i,
    /\bmicroservices?/i,
  ],
  // Complex indicators
  complex: [
    /\bresearch\b/i,
    /\binvestigate\b/i,
    /\bexplain\s+(?:how|why|what)/i,
    /\bdetailed\s+(?:explanation|guide)/i,
    /\boptimize\s+(?:performance|code)/i,
    /\brefactor\b/i,
    /\bdebug\s+(?:complex|multiple)/i,
    /\btroubleshoot\b/i,
    /\bcreate\s+(?:test|script)/i,
    /\bgenerate\s+(?:complex|multiple)/i,
    /\bextensive\s+(?:code|document)/i,
  ],
  // Moderate complexity
  moderate: [
    /\bhelp\b/i,
    /\bimprove\b/i,
    /\bmaybe\b/i,
    /\boften\b/i,
    /\bsometimes\b/i,
    /\busually\b/i,
    /\bconsider\b/i,
  ],
};

// Task complexity detection
export function detectTaskComplexity(message: string): TaskComplexity {
  const lower = message.toLowerCase();
  
  // Check for very complex indicators
  for (const pattern of COMPLEXITY_INDICATORS.veryComplex) {
    if (pattern.test(lower)) {
      return 'very-complex';
    }
  }
  
  // Check for complex indicators
  for (const pattern of COMPLEXITY_INDICATORS.complex) {
    if (pattern.test(lower)) {
      return 'complex';
    }
  }
  
  // Check for moderate indicators
  for (const pattern of COMPLEXITY_INDICATORS.moderate) {
    if (pattern.test(lower)) {
      return 'moderate';
    }
  }
  
  return 'simple';
}

// Determine which additional agents to invoke based on task complexity
export function determineAgentInvocation(
  message: string,
  primaryAgentId: string,
  complexity: TaskComplexity
): string[] {
  const lower = message.toLowerCase();
  const invoked = new Set<string>();
  
  // Always include primary agent
  invoked.add(primaryAgentId);
  
  if (complexity === 'very-complex') {
    // Very complex tasks get multiple specialized agents
    if (lower.includes('code') || lower.includes('implement') || lower.includes('build')) {
      invoked.add('coding');
    }
    if (lower.includes('test') || lower.includes('debug')) {
      invoked.add('testing');
    }
    if (lower.includes('review') || lower.includes('optimize')) {
      invoked.add('debugging');
    }
    if (lower.includes('document') || lower.includes('explain')) {
      invoked.add('documentation');
    }
    if (lower.includes('api') || lower.includes('endpoint')) {
      invoked.add('api');
    }
  } else if (complexity === 'complex') {
    // Complex tasks get 1-2 additional agents
    if (lower.includes('code') || lower.includes('implement')) {
      invoked.add('coding');
    }
    if (lower.includes('test')) {
      invoked.add('testing');
    }
    if (lower.includes('research') || lower.includes('explain')) {
      invoked.add('research');
    }
  }
  
  // Remove duplicates and return as array
  return Array.from(invoked);
}

export type AgentIntent = 'image' | 'video' | 'audio' | 'code' | 'research' | 'general';

export interface OrchestratorDecision {
  intent: AgentIntent;
  agentId: string;
  confidence: number;
  reasoning: string;
}

// Enhanced intent detection with complexity awareness
export function detectIntentEnhanced(message: string): OrchestratorDecision & { complexity: TaskComplexity; additionalAgents: string[] } {
  const decision = {
    intent: 'general' as AgentIntent,
    agentId: 'chat',
    confidence: 0.7,
    reasoning: 'General conversational request',
  };
  
  const lower = message.toLowerCase();
  
  // Image generation
  if (
    lower.startsWith('/image') ||
    lower.startsWith('/img') ||
    /generate.*image|create.*image|draw|picture of|render.*image|make.*image/i.test(lower)
  ) {
    decision.intent = 'image';
    decision.agentId = 'uiux';
    decision.confidence = 0.95;
    decision.reasoning = 'User wants to generate an image';
  }
  // Video generation
  else if (
    lower.startsWith('/video') ||
    /generate.*video|create.*video|make.*video|render.*video/i.test(lower)
  ) {
    decision.intent = 'video';
    decision.agentId = 'browser';
    decision.confidence = 0.95;
    decision.reasoning = 'User wants to generate a video';
  }
  // Audio generation
  else if (
    lower.startsWith('/audio') ||
    /speak:|text to speech|generate.*audio|tts|synthesize.*speech/i.test(lower)
  ) {
    decision.intent = 'audio';
    decision.agentId = 'docs';
    decision.confidence = 0.95;
    decision.reasoning = 'User wants to generate audio/speech';
  }
  // Code-related tasks
  else if (
    lower.startsWith('/code') ||
    /write.*code|create.*function|implement|class.*method|fix.*bug|debug|refactor/i.test(lower)
  ) {
    decision.intent = 'code';
    decision.agentId = 'coding';
    decision.confidence = 0.85;
    decision.reasoning = 'User is working on code';
  }
  // Research tasks
  else if (
    lower.startsWith('/research') ||
    /research|analyze|explain.*in.*depth|investigate|study|find.*information/i.test(lower)
  ) {
    decision.intent = 'research';
    decision.agentId = 'research';
    decision.confidence = 0.85;
    decision.reasoning = 'User is requesting research or deep analysis';
  }
  
  // Detect complexity and additional agents
  const complexity = detectTaskComplexity(message);
  const additionalAgents = determineAgentInvocation(message, decision.agentId, complexity);
  
  return {
    ...decision,
    complexity,
    additionalAgents,
  };
}

// Model resolution (copied from orchestrator to avoid circular dependency)
export interface AgentModelResolution {
  modelId: string;
  modelName: string;
  source: 'provider' | 'custom' | 'local';
}

export function resolveModelForAgentEnhanced(
  agentId: string,
  settings: OrchestratorSettingsLike
): AgentModelResolution {
  const assignedModels = settings.agentModelAssignments[agentId] || [];
  const provider = settings.selectedProviderId && settings.providerTemplates
    ? settings.providerTemplates.find(p => p.id === settings.selectedProviderId)
    : undefined;
  const providerModels = provider?.models || [];
  const healthyLocalModels = settings.localModels.filter((model) => model.testStatus !== 'failed');

  const findLocalModel = (modelId?: string) => {
    if (!modelId) return undefined;
    return healthyLocalModels.find(m => m.id === modelId);
  };

  const findProviderModel = (modelId?: string) => {
    if (!modelId) return undefined;
    return providerModels.find(m => m.id === modelId);
  };

  // Check explicit assignments first - this is the key fix for model selection
  if (assignedModels.length > 0) {
    for (const assignedId of assignedModels) {
      if (!assignedId || assignedId === 'openai') continue;

      const localModel = findLocalModel(assignedId);
      if (localModel) {
        return {
          modelId: localModel.id,
          modelName: localModel.name,
          source: 'local',
        };
      }

      const providerModel = findProviderModel(assignedId);
      if (providerModel) {
        return {
          modelId: providerModel.id,
          modelName: providerModel.name,
          source: 'provider',
        };
      }

      return {
        modelId: assignedId,
        modelName: assignedId,
        source: 'custom',
      };
    }
  }

  // If assigned to openai or no explicit assignment, use provider selection
  if (settings.connectionType === 'local') {
    const localFallback =
      findLocalModel(settings.selectedModelId) ||
      findLocalModel(settings.customModelId) ||
      healthyLocalModels.find(model => model.testStatus === 'passed') ||
      healthyLocalModels[0];

    if (localFallback) {
      return {
        modelId: localFallback.id,
        modelName: localFallback.name,
        source: 'local',
      };
    }

    return {
      modelId: 'local-model-unavailable',
      modelName: 'Local model unavailable',
      source: 'local',
    };
  }

  const selectedProviderModel = findProviderModel(settings.selectedModelId);
  if (selectedProviderModel) {
    return {
      modelId: selectedProviderModel.id,
      modelName: selectedProviderModel.name,
      source: 'provider',
    };
  }

  const fallbackModelId = settings.selectedModelId || settings.customModelId || 'gpt-4o';
  return {
    modelId: fallbackModelId,
    modelName: fallbackModelId,
    source: 'custom',
  };
}

// Synthesize multi-agent outputs into coherent response (fan-in)
export function synthesizeAgentOutputs(
  agentOutputs: Record<string, string>,
  primaryAgentId: string,
  _settings: OrchestratorSettingsLike
): string {
  const primaryOutput = agentOutputs[primaryAgentId] || '';
  const otherOutputs = Object.entries(agentOutputs)
    .filter(([id]) => id !== primaryAgentId)
    .map(([id, output]) => ({
      agentId: id,
      agentName: getAgentDisplayName(id),
      output,
    }));
  
  // If only primary agent, return its output
  if (otherOutputs.length === 0) {
    return primaryOutput;
  }
  
  // Build synthesis header
  const agentNames = otherOutputs.map(o => o.agentName).join(', ');
  let synthesis = `**Multi-Agent Synthesis**\n\n`;
  synthesis += `Coordinated agents: ${agentNames}\n\n`;
  synthesis += `---\n\n`;
  
  // Add primary output first
  if (primaryOutput) {
    synthesis += `## Primary Response\n\n${primaryOutput}\n\n`;
  }
  
  // Add other agent contributions
  for (const { agentName, output } of otherOutputs) {
    if (output && !output.startsWith('[')) {
      synthesis += `### ${agentName} Contribution\n\n${output}\n\n---\n\n`;
    }
  }
  
  return synthesis.trim();
}

// Log agent invocation for debugging
export function logInvocation(invocation: AgentInvocation, logger?: (msg: string) => void): void {
  const log = logger || console.log;
  const duration = invocation.endTime 
    ? `${invocation.endTime - invocation.startTime}ms`
    : 'pending';
  
  const status = invocation.success === true 
    ? '✓' 
    : invocation.success === false 
    ? '✗' 
    : '?';
  
  log(`[Agent ${status}] ${invocation.agentName} (${invocation.agentId}) - ${invocation.reason} [${duration}]`);
  
  if (invocation.error) {
    log(`  Error: ${invocation.error}`);
  }
}

// Export enhanced orchestrator for use in App
export const orchestratorEnhanced = {
  detectIntent: detectIntentEnhanced,
  detectTaskComplexity,
  determineAgentInvocation,
  resolveModelForAgent: resolveModelForAgentEnhanced,
  logInvocation,
  synthesizeAgentOutputs,
  getAgentDisplayName,
};

// Export from orchestrator for convenience
export { parseCommand } from './orchestrator';
export { getPollinationsUrl } from './orchestrator';
export { executeTool } from './orchestrator';
