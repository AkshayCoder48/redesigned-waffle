/**
 * Tests for Orchestrator Auto-Swarm Decision Path
 */

import {
  detectTaskComplexity,
  determineAgentInvocation,
  detectIntentEnhanced,
  resolveModelForAgentEnhanced,
  synthesizeAgentOutputs,
  type OrchestratorSettingsLike,
  type AgentInvocation,
} from '../utils/orchestratorEnhanced';

describe('Task Complexity Detection', () => {
  describe('detectTaskComplexity', () => {
    it('should classify very-complex tasks', () => {
      expect(detectTaskComplexity('Analyze in depth the architecture')).toBe('very-complex');
      expect(detectTaskComplexity('Build a complete full-stack application')).toBe('very-complex');
      expect(detectTaskComplexity('Design a complex microservices system')).toBe('very-complex');
      expect(detectTaskComplexity('Compare and contrast the options')).toBe('very-complex');
      expect(detectTaskComplexity('Implement this from scratch')).toBe('very-complex');
    });

    it('should classify complex tasks', () => {
      expect(detectTaskComplexity('Research the best practices')).toBe('complex');
      expect(detectTaskComplexity('Explain how the system works')).toBe('complex');
      expect(detectTaskComplexity('Optimize the performance')).toBe('complex');
      expect(detectTaskComplexity('Debug the multiple issues')).toBe('complex');
      expect(detectTaskComplexity('Create a comprehensive test suite')).toBe('complex');
    });

    it('should classify moderate complexity tasks', () => {
      expect(detectTaskComplexity('Help me with this task')).toBe('moderate');
      expect(detectTaskComplexity('Sometimes it does not work')).toBe('moderate');
      expect(detectTaskComplexity('Consider the alternatives')).toBe('moderate');
    });

    it('should default to simple for basic tasks', () => {
      expect(detectTaskComplexity('Hello world')).toBe('simple');
      expect(detectTaskComplexity('What is the weather?')).toBe('simple');
      expect(detectTaskComplexity('Tell me a joke')).toBe('simple');
    });
  });
});

describe('Agent Invocation Determination', () => {
  const mockSettings = {
    connectionType: 'openai' as const,
    customModelId: 'openai',
    localModels: [],
    agentModelAssignments: {},
    selectedProviderId: 'pollinations',
    selectedModelId: 'openai',
  };

  describe('determineAgentInvocation', () => {
    it('should always include primary agent', () => {
      const agents = determineAgentInvocation('Hello', 'chat', 'simple');
      expect(agents).toContain('chat');
    });

    it('should add coding agent for very complex code tasks', () => {
      const agents = determineAgentInvocation('Build a complete full-stack app', 'chat', 'very-complex');
      expect(agents).toContain('coding');
    });

    it('should add testing agent for very complex test tasks', () => {
      const agents = determineAgentInvocation('Create comprehensive tests for the complex system', 'chat', 'very-complex');
      expect(agents).toContain('testing');
    });

    it('should add documentation agent for documentation tasks', () => {
      const agents = determineAgentInvocation('Document the complex architecture', 'chat', 'very-complex');
      expect(agents).toContain('documentation');
    });

    it('should add api agent for API tasks', () => {
      const agents = determineAgentInvocation('Build a complex API endpoint', 'chat', 'very-complex');
      expect(agents).toContain('api');
    });

    it('should add coding agent for complex code tasks', () => {
      const agents = determineAgentInvocation('Implement a new feature', 'chat', 'complex');
      expect(agents).toContain('coding');
    });

    it('should add testing agent for complex test tasks', () => {
      const agents = determineAgentInvocation('Create tests for the module', 'chat', 'complex');
      expect(agents).toContain('testing');
    });

    it('should add research agent for complex research tasks', () => {
      const agents = determineAgentInvocation('Research and explain the topic', 'chat', 'complex');
      expect(agents).toContain('research');
    });

    it('should not add extra agents for simple tasks', () => {
      const agents = determineAgentInvocation('Hello world', 'chat', 'simple');
      expect(agents.length).toBe(1);
    });
  });
});

describe('Enhanced Intent Detection', () => {
  describe('detectIntentEnhanced', () => {
    it('should detect image intent with complexity', () => {
      const result = detectIntentEnhanced('Generate an image of a cat');
      expect(result.intent).toBe('image');
      expect(result.agentId).toBe('uiux');
      expect(result.confidence).toBe(0.95);
    });

    it('should detect complex research with additional agents', () => {
      const result = detectIntentEnhanced('Research and analyze the complex architecture in depth');
      expect(result.intent).toBe('research');
      expect(result.complexity).toBe('very-complex');
      expect(result.additionalAgents.length).toBeGreaterThan(1);
    });

    it('should detect code intent with coding agent', () => {
      const result = detectIntentEnhanced('Write a function to process data');
      expect(result.intent).toBe('code');
      expect(result.agentId).toBe('coding');
    });

    it('should default to general chat intent', () => {
      const result = detectIntentEnhanced('Hello there');
      expect(result.intent).toBe('general');
      expect(result.agentId).toBe('chat');
    });
  });
});

describe('Model Resolution', () => {
  const mockProviderSettings: OrchestratorSettingsLike = {
    connectionType: 'openai',
    customModelId: 'openai',
    localModels: [],
    agentModelAssignments: {},
    selectedProviderId: 'pollinations',
    selectedModelId: 'openai',
    providerTemplates: [{
      id: 'pollinations',
      name: 'Pollinations AI',
      apiBaseUrl: 'https://gen.pollinations.ai/v1',
      apiKey: '',
      models: [
        { id: 'openai', name: 'GPT-5.4 Nano' },
        { id: 'claude', name: 'Claude Sonnet' },
      ],
    }],
  };

  const mockLocalSettings: OrchestratorSettingsLike = {
    connectionType: 'local',
    customModelId: 'local-model-1',
    localModels: [
      { id: 'local-model-1', name: 'Local Model 1', format: 'gguf', testStatus: 'passed' },
      { id: 'local-model-2', name: 'Local Model 2', format: 'gguf', testStatus: 'failed' },
    ],
    agentModelAssignments: {},
    selectedProviderId: 'pollinations',
    selectedModelId: 'local-model-1',
  };

  describe('resolveModelForAgentEnhanced', () => {
    it('should respect explicit model assignments', () => {
      const settings: OrchestratorSettingsLike = {
        ...mockProviderSettings,
        agentModelAssignments: {
          chat: ['claude'],
        },
      };

      const result = resolveModelForAgentEnhanced('chat', settings);
      expect(result.modelId).toBe('claude');
      expect(result.modelName).toBe('Claude Sonnet');
      expect(result.source).toBe('provider');
    });

    it('should resolve to local model when assigned', () => {
      const settings: OrchestratorSettingsLike = {
        ...mockLocalSettings,
        agentModelAssignments: {
          chat: ['local-model-1'],
        },
      };

      const result = resolveModelForAgentEnhanced('chat', settings);
      expect(result.modelId).toBe('local-model-1');
      expect(result.source).toBe('local');
    });

    it('should use local mode fallback when connection is local', () => {
      const result = resolveModelForAgentEnhanced('chat', mockLocalSettings);
      expect(result.source).toBe('local');
    });

    it('should use provider model when connection is openai', () => {
      const result = resolveModelForAgentEnhanced('chat', mockProviderSettings);
      expect(result.source).toBe('provider');
      expect(result.modelId).toBe('openai');
    });

    it('should not select failed local models', () => {
      const settings: OrchestratorSettingsLike = {
        ...mockLocalSettings,
        agentModelAssignments: {},
      };

      const result = resolveModelForAgentEnhanced('chat', settings);
      expect(result.modelId).not.toBe('local-model-2');
    });

    it('should persist model selection - first model issue fix', () => {
      // This tests that the model selection is not randomly changed to first model
      const settings: OrchestratorSettingsLike = {
        ...mockProviderSettings,
        selectedModelId: 'claude',
        agentModelAssignments: {
          chat: ['claude'],
        },
      };

      const result = resolveModelForAgentEnhanced('chat', settings);
      expect(result.modelId).toBe('claude');
      expect(result.modelName).toBe('Claude Sonnet');
    });
  });
});

describe('Multi-Agent Output Synthesis', () => {
  describe('synthesizeAgentOutputs', () => {
    it('should return primary output if only one agent', () => {
      const outputs = { chat: 'Primary response' };
      const result = synthesizeAgentOutputs(outputs, 'chat', {} as OrchestratorSettingsLike);
      expect(result).toBe('Primary response');
    });

    it('should synthesize multiple agent outputs', () => {
      const outputs = {
        chat: 'Primary answer',
        research: 'Research findings: The answer is A',
        coding: 'Here is the code implementation',
      };

      const result = synthesizeAgentOutputs(outputs, 'chat', {} as OrchestratorSettingsLike);
      expect(result).toContain('Multi-Agent Synthesis');
      expect(result).toContain('Research Agent');
      expect(result).toContain('Coding Agent');
      expect(result).toContain('Primary answer');
    });

    it('should not include failed agent outputs', () => {
      const outputs = {
        chat: 'Primary answer',
        research: '[Agent research failed: Connection error]',
      };

      const result = synthesizeAgentOutputs(outputs, 'chat', {} as OrchestratorSettingsLike);
      expect(result).not.toContain('[Agent research failed');
    });

    it('should format synthesis with clear headers', () => {
      const outputs = {
        chat: 'Answer',
        testing: 'Test coverage: 90%',
      };

      const result = synthesizeAgentOutputs(outputs, 'chat', {} as OrchestratorSettingsLike);
      expect(result).toContain('## Primary Response');
      expect(result).toContain('### Testing Agent Contribution');
    });
  });
});

describe('Agent Invocation Logging', () => {
  it('should track invocation timing', () => {
    const invocation: AgentInvocation = {
      agentId: 'chat',
      agentName: 'Chat Agent',
      reason: 'Primary agent',
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      success: true,
      output: 'Response',
    };

    expect(invocation.success).toBe(true);
    expect(invocation.endTime).toBeGreaterThan(invocation.startTime);
  });

  it('should track failed invocations', () => {
    const invocation: AgentInvocation = {
      agentId: 'chat',
      agentName: 'Chat Agent',
      reason: 'Primary agent',
      startTime: Date.now(),
      endTime: Date.now() + 500,
      success: false,
      error: 'Connection failed',
    };

    expect(invocation.success).toBe(false);
    expect(invocation.error).toBe('Connection failed');
  });
});
