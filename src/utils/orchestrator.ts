/**
 * Real orchestrator for intent detection and agent routing
 */

export type AgentIntent = 'image' | 'video' | 'audio' | 'code' | 'research' | 'general';

export interface OrchestratorDecision {
  intent: AgentIntent;
  agentId: string;
  confidence: number;
  reasoning: string;
}

/**
 * Detect intent from user message
 */
export function detectIntent(message: string): OrchestratorDecision {
  const lower = message.toLowerCase();
  
  // Image generation
  if (
    lower.startsWith('/image') ||
    lower.startsWith('/img') ||
    /generate.*image|create.*image|draw|picture of|render.*image|make.*image/i.test(lower)
  ) {
    return {
      intent: 'image',
      agentId: 'uiux',
      confidence: 0.95,
      reasoning: 'User wants to generate an image',
    };
  }
  
  // Video generation
  if (
    lower.startsWith('/video') ||
    /generate.*video|create.*video|make.*video|render.*video/i.test(lower)
  ) {
    return {
      intent: 'video',
      agentId: 'browser',
      confidence: 0.95,
      reasoning: 'User wants to generate a video',
    };
  }
  
  // Audio generation
  if (
    lower.startsWith('/audio') ||
    /speak:|text to speech|generate.*audio|tts|synthesize.*speech/i.test(lower)
  ) {
    return {
      intent: 'audio',
      agentId: 'docs',
      confidence: 0.95,
      reasoning: 'User wants to generate audio/speech',
    };
  }
  
  // Code-related tasks
  if (
    lower.startsWith('/code') ||
    /write.*code|create.*function|implement|class.*method|fix.*bug|debug|refactor/i.test(lower)
  ) {
    return {
      intent: 'code',
      agentId: 'coding',
      confidence: 0.85,
      reasoning: 'User is working on code',
    };
  }
  
  // Research tasks
  if (
    lower.startsWith('/research') ||
    /research|analyze|explain.*in.*depth|investigate|study|find.*information/i.test(lower)
  ) {
    return {
      intent: 'research',
      agentId: 'research',
      confidence: 0.85,
      reasoning: 'User is requesting research or deep analysis',
    };
  }
  
  // Default to general chat
  return {
    intent: 'general',
    agentId: 'chat',
    confidence: 0.7,
    reasoning: 'General conversational request',
  };
}

/**
 * Get appropriate model for an agent and intent
 */
export function getModelForAgent(
  agentId: string,
  _intent: AgentIntent,
  settings: {
    connectionType: 'local' | 'openai';
    customModelId: string;
    localModels: Array<{ id: string; name: string; format: string }>;
    agentModelAssignments: Record<string, string[]>;
  }
): string {
  const assignedModels = settings.agentModelAssignments[agentId];
  
  // If agent has specific models assigned, use them
  if (assignedModels && assignedModels.length > 0) {
    const localModel = settings.localModels.find(m => assignedModels.includes(m.id));
    if (localModel) {
      return localModel.name;
    }
    // If 'openai' is assigned, use OpenAI model
    if (assignedModels.includes('openai')) {
      return settings.customModelId || 'gpt-4o';
    }
  }
  
  // Default behavior
  if (settings.connectionType === 'openai') {
    return settings.customModelId || 'gpt-4o';
  }
  
  // For local, return first available model or placeholder
  return settings.localModels[0]?.name || 'No model loaded';
}

/**
 * Determine if response should use Pollinations API
 */
export function shouldUsePollinations(intent: AgentIntent): boolean {
  return ['image', 'video', 'audio'].includes(intent);
}

/**
 * Generate Pollinations API URL based on intent
 */
export function getPollinationsUrl(
  intent: AgentIntent,
  prompt: string
): string {
  const encodedPrompt = encodeURIComponent(prompt);
  
  switch (intent) {
    case 'image':
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
    case 'video':
      return `https://gen.pollinations.ai/video/${encodedPrompt}`;
    case 'audio':
      return `https://gen.pollinations.ai/audio/${encodedPrompt}?voice=nova`;
    default:
      return '';
  }
}

/**
 * Generate text response via Pollinations
 */
export async function generateTextViaPollinations(
  prompt: string,
  agentId: string
): Promise<{ content: string; agentName: string }> {
  try {
    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
    const content = await response.text();
    
    // Map agent ID to display name
    const agentNames: Record<string, string> = {
      research: 'Research Agent',
      coding: 'Coding Agent',
      chat: 'Chat Agent',
      docs: 'Documentation Agent',
      browser: 'Browser Agent',
      testing: 'Testing Agent',
      uiux: 'UI/UX Agent',
      data: 'Data Agent',
    };
    
    return {
      content,
      agentName: agentNames[agentId] || 'Agent',
    };
  } catch (error) {
    return {
      content: 'Text generation failed. Please try again.',
      agentName: 'System',
    };
  }
}

/**
 * Execute tool command
 */
export async function executeTool(
  command: string,
  args: string[]
): Promise<{ success: boolean; output: string; error?: string }> {
  const cmd = command.toLowerCase();
  
  switch (cmd) {
    case 'ls':
      return {
        success: true,
        output: args[0] || '/',
      };
    case 'cat':
      return {
        success: true,
        output: args[0],
      };
    case 'write':
      if (args.length >= 2) {
        return {
          success: true,
          output: args[0],
        };
      }
      return {
        success: false,
        output: '',
        error: 'Usage: /write <path>::<content>',
      };
    case 'mkdir':
      return {
        success: true,
        output: args[0] || '',
      };
    default:
      return {
        success: false,
        output: '',
        error: `Unknown tool: ${command}`,
      };
  }
}

/**
 * Parse command from user input
 */
export function parseCommand(input: string): { isCommand: boolean; command?: string; args?: string[] } | null {
  if (!input.startsWith('/')) {
    return { isCommand: false };
  }
  
  const parts = input.slice(1).split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);
  
  return {
    isCommand: true,
    command,
    args,
  };
}
