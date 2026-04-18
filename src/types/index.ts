export type AgentStatus = 'idle' | 'thinking' | 'working' | 'completed' | 'error';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
export type AppMode = 'chat' | 'build' | 'research' | 'study' | 'browse' | 'automate';
export type ConnectionType = 'local' | 'openai';
export type ModelTestStatus = 'pending' | 'testing' | 'passed' | 'failed';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  icon: string;
  description: string;
  currentTask?: string;
  progress?: number;
  assignedModels?: string[]; // List of model IDs assigned to this agent
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignedAgent: string;
  createdAt: string;
  completedAt?: string;
  retries: number;
  output?: string;
  logs: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  source: 'generated' | 'uploaded';
  createdAt: string;
  content: string;
  tags: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'orchestrator' | 'agent' | 'system';
  content: string;
  agentId?: string;
  timestamp: string;
  mode?: AppMode;
  modelId?: string; // Which model was used for this message
  agentName?: string; // Which agent generated this message
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  files: FileNode[];
  tasks: Task[];
  messages: Message[];
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
  agentModelAssignments: Record<string, string[]>; // agentId -> modelIds
}

export interface BackupInfo {
  id: string;
  name: string;
  date: string;
  size: string;
  type: 'manual' | 'auto';
}

export interface ActivityLog {
  id: string;
  type: 'agent' | 'task' | 'system' | 'skill' | 'backup';
  message: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
}
