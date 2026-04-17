export type AgentStatus = 'idle' | 'thinking' | 'working' | 'completed' | 'error';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
export type AppMode = 'chat' | 'build' | 'research' | 'study' | 'browse' | 'automate';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  icon: string;
  description: string;
  currentTask?: string;
  progress?: number;
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
