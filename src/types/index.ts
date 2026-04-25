export type AgentStatus = 'idle' | 'thinking' | 'working' | 'completed' | 'error';
export type AppMode = 'chat' | 'build' | 'research' | 'study' | 'browse' | 'automate';
export type ConnectionType = 'local' | 'openai';
export type ModelTestStatus = 'pending' | 'testing' | 'passed' | 'failed';

// Modality types for generation routing
export type Modality = 'text' | 'image' | 'tts' | 'video';
export type GenerationSource = 'local' | 'cloud' | 'openai-compatible';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  icon: string;
  description: string;
  currentTask?: string;
  progress?: number;
  assignedModels?: string[];
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  assignedAgent: string;
  createdAt: string;
  completedAt?: string;
  retries: number;
  output?: string;
  logs: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'orchestrator' | 'agent' | 'system';
  content: string;
  agentId?: string;
  timestamp: string;
  mode?: AppMode;
  modelId?: string;
  agentName?: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  path: string;
}

export interface ModelConfig {
  type: 'api' | 'local';
  apiBaseUrl: string;
  apiKey: string;
  modelId: string;
  localModelPath?: string;
  localModelSize?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
}

export interface ProviderTemplate {
  id: string;
  name: string;
  description: string;
  apiBaseUrl: string;
  apiKey?: string;
  models: Model[];
  isDefault?: boolean;
}

export interface ModelFile {
  id: string;
  name: string;
  format: 'gguf' | 'safetensors';
  size: number;
  url: string;
  uploadedAt: number;
  testStatus: ModelTestStatus;
  testDetails?: string;
}

export interface Settings {
  connectionType: ConnectionType;
  apiBaseUrl: string;
  apiKey: string;
  customModelId: string;
  localModels: ModelFile[];
  agentModelAssignments: Record<string, string[]>;
  providerTemplates: ProviderTemplate[];
  selectedProviderId?: string;
  selectedModelId?: string;
}
