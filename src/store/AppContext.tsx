import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Agent, Task, Message, ModelConfig, AppMode, FileNode, Settings, ProviderTemplate } from '../types';

interface AppState {
  currentView: string;
  currentMode: AppMode;
  agents: Agent[];
  tasks: Task[];
  messages: Message[];
  modelConfig: ModelConfig;
  isExecuting: boolean;
  selectedProject: string | null;
  fileTree: FileNode[];
  settings: Settings;
}

type Action =
  | { type: 'SET_VIEW'; payload: string }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_AGENT'; payload: { id: string; updates: Partial<Agent> } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'SET_MODEL_CONFIG'; payload: ModelConfig }
  | { type: 'SET_EXECUTING'; payload: boolean }
  | { type: 'SET_FILE_TREE'; payload: FileNode[] }
  | { type: 'SET_SETTINGS'; payload: Settings };

const defaultAgents: Agent[] = [
  { id: 'orchestrator', name: 'Orchestrator', type: 'primary', status: 'idle', icon: 'brain', description: 'Central intelligence layer - plans, coordinates, and manages all agent operations', progress: 0 },
  { id: 'coding', name: 'Coding Agent', type: 'sub', status: 'idle', icon: 'code', description: 'Generates, modifies, and optimizes code across all languages and frameworks', progress: 0 },
  { id: 'debugging', name: 'Debugging Agent', type: 'sub', status: 'idle', icon: 'bug', description: 'Identifies, diagnoses, and resolves bugs and runtime errors', progress: 0 },
  { id: 'testing', name: 'Testing Agent', type: 'sub', status: 'idle', icon: 'test-tube', description: 'Creates and executes test suites, validates code quality and coverage', progress: 0 },
  { id: 'browser', name: 'Browser Agent', type: 'sub', status: 'idle', icon: 'globe', description: 'Automates browser interactions, web scraping, and UI testing', progress: 0 },
  { id: 'research', name: 'Research Agent', type: 'sub', status: 'idle', icon: 'search', description: 'Conducts deep research, synthesizes information from multiple sources', progress: 0 },
  { id: 'chat', name: 'Chat Agent', type: 'sub', status: 'idle', icon: 'message-square', description: 'Handles conversational interactions and natural language understanding', progress: 0 },
  { id: 'study', name: 'Study Assistant', type: 'sub', status: 'idle', icon: 'book-open', description: 'Creates study plans, generates flashcards, and provides tutoring', progress: 0 },
  { id: 'documentation', name: 'Documentation Agent', type: 'sub', status: 'idle', icon: 'file-text', description: 'Generates technical documentation, README files, and API docs', progress: 0 },
  { id: 'api', name: 'API Integration Agent', type: 'sub', status: 'idle', icon: 'plug', description: 'Integrates external APIs, handles authentication and data mapping', progress: 0 },
  { id: 'data', name: 'Data Processing Agent', type: 'sub', status: 'idle', icon: 'database', description: 'Processes, transforms, and analyzes structured and unstructured data', progress: 0 },
  { id: 'uiux', name: 'UI/UX Agent', type: 'sub', status: 'idle', icon: 'palette', description: 'Designs user interfaces, creates layouts, and optimizes user experience', progress: 0 },
];

const defaultFileTree: FileNode[] = [
  { name: 'src', type: 'folder', path: '/src', children: [
    { name: 'components', type: 'folder', path: '/src/components', children: [
      { name: 'App.tsx', type: 'file', path: '/src/components/App.tsx', content: '// Main component' },
      { name: 'Header.tsx', type: 'file', path: '/src/components/Header.tsx', content: '// Header component' },
    ]},
    { name: 'utils', type: 'folder', path: '/src/utils', children: [
      { name: 'helpers.ts', type: 'file', path: '/src/utils/helpers.ts', content: '// Utility functions' },
    ]},
    { name: 'index.tsx', type: 'file', path: '/src/index.tsx', content: '// Entry point' },
  ]},
  { name: 'public', type: 'folder', path: '/public', children: [
    { name: 'index.html', type: 'file', path: '/public/index.html', content: '<!DOCTYPE html>' },
  ]},
  { name: 'package.json', type: 'file', path: '/package.json', content: '{ "name": "project" }' },
  { name: 'README.md', type: 'file', path: '/README.md', content: '# Project README' },
];

const pollinationsTemplate: ProviderTemplate = {
  id: 'pollinations',
  name: 'Pollinations AI',
  description: 'OpenAI-compatible API with free tier. Generate text, images, video, and audio.',
  apiBaseUrl: 'https://gen.pollinations.ai/v1',
  apiKey: '',
  models: [
    { id: 'openai', name: 'GPT-5.4 Nano', description: 'Fast & Balanced with tools' },
    { id: 'openai-fast', name: 'GPT-5 Nano', description: 'Ultra Fast & Affordable' },
    { id: 'openai-large', name: 'GPT-5.4', description: 'Most Powerful & Intelligent' },
    { id: 'qwen-coder', name: 'Qwen3 Coder 30B', description: 'Specialized for Code Generation' },
    { id: 'mistral', name: 'Mistral Small 3.2', description: 'Efficient & Cost-Effective' },
    { id: 'openai-audio', name: 'GPT Audio Mini', description: 'Voice Input & Output' },
    { id: 'openai-audio-large', name: 'GPT Audio 1.5', description: 'Premium Voice Input & Output' },
    { id: 'gemini', name: 'Gemini 3 Flash', description: 'Pro-Grade Reasoning at Flash Speed' },
    { id: 'gemini-flash-lite-3.1', name: 'Gemini 3.1 Flash Lite', description: 'Fast & Cost-Effective' },
    { id: 'gemini-fast', name: 'Gemini 2.5 Flash Lite', description: 'Ultra Fast & Cost-Effective' },
    { id: 'deepseek', name: 'DeepSeek V3.2', description: 'Efficient Reasoning & Agentic AI' },
    { id: 'grok', name: 'Grok 4.1 Fast', description: 'High Speed & Real-Time' },
    { id: 'grok-large', name: 'Grok 4.20', description: 'Most Powerful Grok' },
    { id: 'gemini-search', name: 'Gemini 2.5 Flash Lite Search', description: 'Web-grounded answers' },
    { id: 'midijourney', name: 'MIDIjourney', description: 'AI Music Composition Assistant' },
    { id: 'midijourney-large', name: 'MIDIjourney Large', description: 'Premium AI Music Composition' },
    { id: 'claude-fast', name: 'Claude Haiku 4.5', description: 'Fast & Intelligent' },
    { id: 'claude', name: 'Claude Sonnet 4.6', description: 'Most Capable & Balanced' },
    { id: 'claude-large', name: 'Claude Opus 4.6', description: 'Most Intelligent Model' },
    { id: 'perplexity-fast', name: 'Perplexity Sonar', description: 'Fast & Affordable with Web Search' },
    { id: 'perplexity-reasoning', name: 'Perplexity Sonar Reasoning', description: 'Advanced Reasoning with Web Search' },
    { id: 'kimi', name: 'Moonshot Kimi K2.5', description: 'Flagship Agentic Model with CoT Reasoning' },
    { id: 'gemini-large', name: 'Gemini 3.1 Pro', description: 'Most Intelligent Model with 1M Context' },
    { id: 'nova-fast', name: 'Nova Micro', description: 'Ultra Fast & Ultra Cheap' },
    { id: 'nova', name: 'Nova 2 Lite', description: '1M Context with Reasoning' },
    { id: 'glm', name: 'Z.ai GLM-5.1', description: '744B MoE, Long Context Reasoning' },
    { id: 'minimax', name: 'MiniMax M2.7', description: 'Coding, Agentic & Multi-Language' },
    { id: 'mistral-large', name: 'Mistral Large 3', description: 'Premium Multilingual & Reasoning' },
    { id: 'polly', name: 'Polly', description: 'Pollinations AI Assistant with GitHub & Code Search' },
    { id: 'qwen-coder-large', name: 'Qwen3 Coder Next', description: 'Advanced Code Generation' },
    { id: 'qwen-large', name: 'Qwen3.6 Plus', description: '396B MoE Flagship with Reasoning' },
    { id: 'qwen-vision', name: 'Qwen3 VL 30B', description: 'Vision-Language Reasoning' },
    { id: 'qwen-safety', name: 'Qwen3Guard 8B', description: 'Content Safety & Moderation' },
    { id: 'flux', name: 'Flux Schnell', description: 'Fast high-quality image generation' },
    { id: 'zimage', name: 'Z-Image Turbo', description: 'Fast 6B Flux with 2x upscaling' },
    { id: 'nanobanana', name: 'NanoBanana', description: 'Gemini 2.5 Flash Image' },
    { id: 'nanobanana-2', name: 'NanoBanana 2', description: 'Gemini 3.1 Flash Image' },
    { id: 'nanobanana-pro', name: 'NanoBanana Pro', description: 'Gemini 3 Pro Image (4K)' },
    { id: 'seedream5', name: 'Seedream 5.0 Lite', description: 'ByteDance ARK with web search' },
    { id: 'gptimage', name: 'GPT Image 1 Mini', description: "OpenAI's image generation model" },
    { id: 'gptimage-large', name: 'GPT Image 1.5', description: "OpenAI's advanced image generation model" },
    { id: 'wan-image', name: 'Wan 2.7 Image', description: 'Alibaba text-to-image and image editing' },
    { id: 'wan-image-pro', name: 'Wan 2.7 Image Pro', description: 'Alibaba 4K thinking mode' },
    { id: 'qwen-image', name: 'Qwen Image Plus', description: 'Alibaba text-to-image and editing' },
    { id: 'grok-imagine', name: 'Grok Imagine', description: 'xAI official image generation' },
    { id: 'grok-imagine-pro', name: 'Grok Imagine Pro', description: 'xAI pro image generation (Aurora)' },
    { id: 'klein', name: 'FLUX.2 Klein 4B', description: 'Fast image generation and editing' },
    { id: 'p-image', name: 'Pruna p-image', description: 'Fast text-to-image generation' },
    { id: 'p-image-edit', name: 'Pruna p-image-edit', description: 'Image-to-image editing' },
    { id: 'nova-canvas', name: 'Nova Canvas', description: 'Bedrock Image Generation & Editing' },
    { id: 'veo', name: 'Veo 3.1 Fast', description: "Google's video generation model" },
    { id: 'seedance', name: 'Seedance Lite', description: 'BytePlus video generation' },
    { id: 'seedance-pro', name: 'Seedance Pro-Fast', description: 'BytePlus better prompt adherence' },
    { id: 'wan', name: 'Wan 2.6', description: 'Alibaba text/image-to-video with audio' },
    { id: 'wan-fast', name: 'Wan 2.2', description: 'Fast & cheap text/image-to-video' },
    { id: 'grok-video-pro', name: 'Grok Video Pro', description: 'xAI official video generation' },
    { id: 'ltx-2', name: 'LTX-2.3', description: 'Fast text-to-video with upscaler' },
    { id: 'p-video', name: 'Pruna p-video', description: 'Text/image-to-video up to 1080p' },
    { id: 'nova-reel', name: 'Nova Reel', description: 'Bedrock Video Generation' },
    { id: 'elevenlabs', name: 'ElevenLabs v3 TTS', description: 'Expressive voices with emotions' },
    { id: 'elevenmusic', name: 'ElevenLabs Music', description: 'Generate studio-grade music' },
    { id: 'whisper', name: 'Whisper Large V3', description: 'Speech to Text Transcription' },
    { id: 'scribe', name: 'ElevenLabs Scribe v2', description: 'Speech to Text (90+ languages)' },
    { id: 'acestep', name: 'ACE-Step 1.5 Turbo', description: 'Fast open-source music generation' },
  ],
  isDefault: true,
};

const defaultSettings: Settings = {
  connectionType: 'openai',
  apiBaseUrl: pollinationsTemplate.apiBaseUrl,
  apiKey: '',
  customModelId: 'openai',
  localModels: [],
  agentModelAssignments: {},
  providerTemplates: [pollinationsTemplate],
  selectedProviderId: 'pollinations',
  selectedModelId: 'openai',
};

const loadSettingsFromStorage = (): Settings => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = localStorage.getItem('ai-maos-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Validate it's an object
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Invalid settings format');
        }
        
        const mergedTemplates = (parsed.providerTemplates?.length > 0
          ? parsed.providerTemplates
          : defaultSettings.providerTemplates)
          .map((template: ProviderTemplate) => ({
            ...template,
            apiKey: template.apiKey || '',
            models: template.models || [],
          }));

        const selectedProviderId = parsed.selectedProviderId || defaultSettings.selectedProviderId;
        const selectedProvider = mergedTemplates.find((template: ProviderTemplate) => template.id === selectedProviderId);
        const shouldUseProviderBaseUrl = !parsed.apiBaseUrl || (
          parsed.apiBaseUrl === 'https://api.openai.com/v1' && selectedProviderId === 'pollinations'
        );

        return {
          ...defaultSettings,
          ...parsed,
          providerTemplates: mergedTemplates,
          selectedProviderId,
          selectedModelId: parsed.selectedModelId || selectedProvider?.models?.[0]?.id || defaultSettings.selectedModelId,
          apiBaseUrl: shouldUseProviderBaseUrl
            ? (selectedProvider?.apiBaseUrl || defaultSettings.apiBaseUrl)
            : parsed.apiBaseUrl,
          apiKey: selectedProvider?.apiKey ?? parsed.apiKey ?? '',
        };
      } catch (parseError) {
        // Corrupted settings - clear and use defaults
        console.warn('[AppContext] Corrupted settings, resetting:', parseError);
        try {
          localStorage.removeItem('ai-maos-settings');
        } catch {}
      }
    }
  } catch (storageError) {
    console.error('[AppContext] Error loading settings from localStorage:', storageError);
  }
  return defaultSettings;
};

const initialState: AppState = {
  currentView: 'dashboard',
  currentMode: 'chat',
  agents: defaultAgents,
  tasks: [],
  messages: [
    { id: '1', role: 'system', content: 'AI-MAOS initialized. All systems operational. 12 agents ready.', timestamp: new Date().toISOString() },
  ],
  modelConfig: {
    type: 'api',
    apiBaseUrl: pollinationsTemplate.apiBaseUrl,
    apiKey: '',
    modelId: 'openai',
    localModelPath: '',
    localModelSize: '7B',
  },
  isExecuting: false,
  selectedProject: null,
  fileTree: defaultFileTree,
  settings: loadSettingsFromStorage(),
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_MODE':
      return { ...state, currentMode: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_AGENT':
      return {
        ...state,
        agents: state.agents.map(a => a.id === action.payload.id ? { ...a, ...action.payload.updates } : a),
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload.updates } : t),
      };
    case 'SET_MODEL_CONFIG':
      return { ...state, modelConfig: action.payload };
    case 'SET_EXECUTING':
      return { ...state, isExecuting: action.payload };
    case 'SET_FILE_TREE':
      return { ...state, fileTree: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Auto-save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ai-maos-settings', JSON.stringify(state.settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [state.settings]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
