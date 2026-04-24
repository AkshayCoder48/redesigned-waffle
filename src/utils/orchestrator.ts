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

export interface AgentModelResolution {
  modelId: string;
  modelName: string;
  source: 'provider' | 'custom' | 'local';
}

export class OpenAICompatibleApiError extends Error {
  status?: number;
  endpoint?: string;
  isAuthError: boolean;
  isBaseUrlError: boolean;
  isEndpointUnsupported: boolean;

  constructor(
    message: string,
    options?: {
      status?: number;
      endpoint?: string;
      isAuthError?: boolean;
      isBaseUrlError?: boolean;
      isEndpointUnsupported?: boolean;
    }
  ) {
    super(message);
    this.name = 'OpenAICompatibleApiError';
    this.status = options?.status;
    this.endpoint = options?.endpoint;
    this.isAuthError = options?.isAuthError ?? false;
    this.isBaseUrlError = options?.isBaseUrlError ?? false;
    this.isEndpointUnsupported = options?.isEndpointUnsupported ?? false;
  }
}

const DEFAULT_OPENAI_COMPAT_BASE_URL = 'https://api.openai.com/v1';

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

type EndpointKind = 'chat' | 'responses';

interface GenerationEndpoint {
  kind: EndpointKind;
  url: string;
}

interface GenerateTextOptions {
  modelId?: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  onToken?: (token: string, fullText: string) => void;
}

interface OrchestratorSettingsLike {
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

export function getAgentDisplayName(agentId: string): string {
  return AGENT_NAMES[agentId] || 'Agent';
}

export function resolveModelForAgent(
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

  if (assignedModels.includes('openai')) {
    const selectedProviderModel = findProviderModel(settings.selectedModelId);
    if (selectedProviderModel) {
      return {
        modelId: selectedProviderModel.id,
        modelName: selectedProviderModel.name,
        source: 'provider',
      };
    }

    const remoteModelId = settings.selectedModelId || settings.customModelId || 'gpt-4o';
    return {
      modelId: remoteModelId,
      modelName: remoteModelId,
      source: 'custom',
    };
  }

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

/**
 * Get appropriate model for an agent and intent
 */
export function getModelForAgent(
  agentId: string,
  _intent: AgentIntent,
  settings: OrchestratorSettingsLike
): string {
  return resolveModelForAgent(agentId, settings).modelName;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';

  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!isRecord(item)) return '';

      if (typeof item.text === 'string') return item.text;
      if (typeof item.content === 'string') return item.content;

      if (isRecord(item.text) && typeof item.text.value === 'string') {
        return item.text.value;
      }

      return '';
    })
    .join('');
}

function extractTextFromPayload(payload: unknown): string {
  if (!isRecord(payload)) return '';

  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  if (Array.isArray(payload.choices) && payload.choices.length > 0) {
    const firstChoice = payload.choices[0];
    if (isRecord(firstChoice)) {
      if (typeof firstChoice.text === 'string') {
        return firstChoice.text;
      }

      if (isRecord(firstChoice.message)) {
        const messageContent = toText(firstChoice.message.content);
        if (messageContent) return messageContent;
      }
    }
  }

  if (Array.isArray(payload.output)) {
    const outputText = payload.output
      .map((item) => {
        if (!isRecord(item)) return '';
        if (typeof item.text === 'string') return item.text;
        if (!Array.isArray(item.content)) return '';

        return item.content
          .map((contentItem) => {
            if (!isRecord(contentItem)) return '';
            if (typeof contentItem.text === 'string') return contentItem.text;
            if (typeof contentItem.output_text === 'string') return contentItem.output_text;
            return '';
          })
          .join('');
      })
      .join('');

    if (outputText) return outputText;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return '';
}

function extractStreamingDelta(payload: unknown): string {
  if (!isRecord(payload)) return '';

  if (Array.isArray(payload.choices) && payload.choices.length > 0) {
    const firstChoice = payload.choices[0];
    if (isRecord(firstChoice) && isRecord(firstChoice.delta)) {
      const deltaText = toText(firstChoice.delta.content);
      if (deltaText) return deltaText;
    }
  }

  if (typeof payload.delta === 'string') {
    return payload.delta;
  }

  if (payload.type === 'response.output_text.delta' && typeof payload.delta === 'string') {
    return payload.delta;
  }

  return '';
}

function parseMaybeJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

async function toCompatibilityError(response: Response, endpoint: string): Promise<OpenAICompatibleApiError> {
  const rawText = await response.text();
  const payload = parseMaybeJson(rawText);
  const apiMessage = isRecord(payload)
    ? (
      (isRecord(payload.error) && typeof payload.error.message === 'string' ? payload.error.message : '') ||
      (typeof payload.message === 'string' ? payload.message : '')
    )
    : '';

  const details = apiMessage || rawText || `HTTP ${response.status}`;
  const endpointUnsupported = [404, 405, 501].includes(response.status);

  if (response.status === 401 || response.status === 403) {
    return new OpenAICompatibleApiError(
      `Authentication failed (${response.status}). Verify your API key for this provider. ${details}`,
      {
        status: response.status,
        endpoint,
        isAuthError: true,
      }
    );
  }

  if (response.status === 404) {
    return new OpenAICompatibleApiError(
      `Endpoint not found at ${endpoint}. Verify your OpenAI-compatible base URL (for example, include /v1).`,
      {
        status: response.status,
        endpoint,
        isEndpointUnsupported: true,
      }
    );
  }

  if (response.status === 429) {
    return new OpenAICompatibleApiError(
      `Rate limit reached (429). Please wait and retry, or switch provider/model. ${details}`,
      {
        status: response.status,
        endpoint,
      }
    );
  }

  if (response.status >= 500) {
    return new OpenAICompatibleApiError(
      `Provider server error (${response.status}) at ${endpoint}. ${details}`,
      {
        status: response.status,
        endpoint,
      }
    );
  }

  return new OpenAICompatibleApiError(
    `OpenAI-compatible request failed (${response.status}) at ${endpoint}. ${details}`,
    {
      status: response.status,
      endpoint,
      isEndpointUnsupported: endpointUnsupported,
    }
  );
}

function normalizeBaseUrl(baseURL?: string): string {
  const trimmed = (baseURL || DEFAULT_OPENAI_COMPAT_BASE_URL).trim();
  if (!trimmed) {
    return DEFAULT_OPENAI_COMPAT_BASE_URL;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new OpenAICompatibleApiError(
      'Invalid API base URL. Include http:// or https:// (for example: https://api.example.com/v1).',
      { isBaseUrlError: true }
    );
  }

  try {
    new URL(trimmed);
  } catch {
    throw new OpenAICompatibleApiError(
      `Invalid API base URL: ${trimmed}`,
      { isBaseUrlError: true }
    );
  }

  return trimmed.replace(/\/+$/, '');
}

function buildEndpoints(baseURL?: string): GenerationEndpoint[] {
  const base = normalizeBaseUrl(baseURL);

  if (base.endsWith('/chat/completions')) {
    return [
      { kind: 'chat', url: base },
      { kind: 'responses', url: base.replace(/\/chat\/completions$/, '/responses') },
    ];
  }

  if (base.endsWith('/responses')) {
    return [
      { kind: 'responses', url: base },
      { kind: 'chat', url: base.replace(/\/responses$/, '/chat/completions') },
    ];
  }

  return [
    { kind: 'chat', url: `${base}/chat/completions` },
    { kind: 'responses', url: `${base}/responses` },
  ];
}

async function readStreamingText(
  response: Response,
  onToken?: (token: string, fullText: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  const handleEvent = (eventBlock: string) => {
    const lines = eventBlock
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const dataLines = lines
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim());

    if (dataLines.length === 0) return;

    const data = dataLines.join('\n').trim();
    if (!data || data === '[DONE]') return;

    const payload = parseMaybeJson(data);
    if (!payload) return;

    const delta = extractStreamingDelta(payload);
    if (delta) {
      content += delta;
      onToken?.(delta, content);
      return;
    }

    if (!content) {
      const fullText = extractTextFromPayload(payload);
      if (fullText) {
        content = fullText;
        onToken?.(fullText, content);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    let boundaryIndex = buffer.indexOf('\n\n');
    while (boundaryIndex >= 0) {
      const eventBlock = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);
      handleEvent(eventBlock);
      boundaryIndex = buffer.indexOf('\n\n');
    }
  }

  if (buffer.trim()) {
    handleEvent(buffer);
  }

  return content;
}

async function requestCompatibleGeneration(
  endpoint: GenerationEndpoint,
  prompt: string,
  options: Required<Pick<GenerateTextOptions, 'modelId' | 'temperature' | 'maxTokens' | 'stream'>> & Pick<GenerateTextOptions, 'apiKey' | 'onToken' | 'systemPrompt'>
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: options.stream ? 'text/event-stream, application/json' : 'application/json',
  };

  if (options.apiKey?.trim()) {
    headers.Authorization = `Bearer ${options.apiKey.trim()}`;
  }

  const body = endpoint.kind === 'chat'
    ? {
      model: options.modelId,
      messages: [
        ...(options.systemPrompt
          ? [{ role: 'system', content: options.systemPrompt }]
          : []),
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: options.stream,
    }
    : {
      model: options.modelId,
      input: options.systemPrompt
        ? [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: prompt },
        ]
        : prompt,
      temperature: options.temperature,
      max_output_tokens: options.maxTokens,
      stream: options.stream,
    };

  let response: Response;
  try {
    response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new OpenAICompatibleApiError(
      `Unable to reach ${endpoint.url}. Check network access and API base URL. ${message}`,
      {
        endpoint: endpoint.url,
        isBaseUrlError: true,
      }
    );
  }

  if (!response.ok) {
    throw await toCompatibilityError(response, endpoint.url);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (options.stream && response.body && !contentType.includes('application/json')) {
    const streamResult = await readStreamingText(response.clone(), options.onToken);
    if (streamResult) {
      return streamResult;
    }
  }

  const raw = await response.text();
  const payload = parseMaybeJson(raw);
  const content = payload ? extractTextFromPayload(payload) : raw.trim();

  if (content) {
    if (options.stream && options.onToken && !raw.includes('data:')) {
      options.onToken(content, content);
    }
    return content;
  }

  throw new OpenAICompatibleApiError(
    `The provider returned an empty response from ${endpoint.url}.`,
    { endpoint: endpoint.url }
  );
}

/**
 * Generate text response via OpenAI-compatible API
 */
export async function generateTextViaOpenAICompatible(
  prompt: string,
  agentId: string,
  options?: GenerateTextOptions
): Promise<{ content: string; agentName: string; endpoint: string }> {
  const model = options?.modelId || 'gpt-4o';
  const stream = options?.stream ?? true;
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2048;

  const endpoints = buildEndpoints(options?.baseURL);
  const attemptedEndpoints: string[] = [];
  let lastError: OpenAICompatibleApiError | null = null;

  for (const endpoint of endpoints) {
    attemptedEndpoints.push(endpoint.url);

    try {
      const content = await requestCompatibleGeneration(endpoint, prompt, {
        modelId: model,
        apiKey: options?.apiKey,
        stream,
        temperature,
        maxTokens,
        systemPrompt: options?.systemPrompt,
        onToken: options?.onToken,
      });

      return {
        content,
        agentName: getAgentDisplayName(agentId),
        endpoint: endpoint.url,
      };
    } catch (error) {
      const compatError = error instanceof OpenAICompatibleApiError
        ? error
        : new OpenAICompatibleApiError(
          `Unexpected compatibility error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { endpoint: endpoint.url }
        );

      // Fallback only when endpoint itself is unsupported (404/405/501)
      if (compatError.isEndpointUnsupported) {
        lastError = compatError;
        continue;
      }

      throw compatError;
    }
  }

  if (lastError) {
    throw new OpenAICompatibleApiError(
      `No supported OpenAI-compatible text endpoint was found. Tried: ${attemptedEndpoints.join(', ')}. ${lastError.message}`,
      {
        endpoint: attemptedEndpoints.join(', '),
      }
    );
  }

  throw new OpenAICompatibleApiError(
    `Text generation failed. Tried: ${attemptedEndpoints.join(', ')}`,
    {
      endpoint: attemptedEndpoints.join(', '),
    }
  );
}

/**
 * Backward-compatible alias
 */
export async function generateTextViaPollinations(
  prompt: string,
  agentId: string,
  options?: {
    modelId?: string;
    apiKey?: string;
    baseURL?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    systemPrompt?: string;
    onToken?: (token: string, fullText: string) => void;
  }
): Promise<{ content: string; agentName: string; endpoint?: string }> {
  const result = await generateTextViaOpenAICompatible(prompt, agentId, options);
  return result;
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
