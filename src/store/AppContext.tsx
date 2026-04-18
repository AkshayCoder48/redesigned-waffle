import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Agent, Task, Skill, Message, ActivityLog, ModelConfig, BackupInfo, AppMode, FileNode, Settings } from '../types';

interface AppState {
  currentView: string;
  currentMode: AppMode;
  agents: Agent[];
  tasks: Task[];
  skills: Skill[];
  messages: Message[];
  activityLogs: ActivityLog[];
  modelConfig: ModelConfig;
  backups: BackupInfo[];
  isExecuting: boolean;
  selectedProject: string | null;
  fileTree: FileNode[];
  terminalOutput: string[];
  settings: Settings;
}

type Action =
  | { type: 'SET_VIEW'; payload: string }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_AGENT'; payload: { id: string; updates: Partial<Agent> } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'ADD_SKILL'; payload: Skill }
  | { type: 'DELETE_SKILL'; payload: string }
  | { type: 'ADD_ACTIVITY_LOG'; payload: ActivityLog }
  | { type: 'SET_MODEL_CONFIG'; payload: ModelConfig }
  | { type: 'ADD_BACKUP'; payload: BackupInfo }
  | { type: 'SET_EXECUTING'; payload: boolean }
  | { type: 'SET_TERMINAL_OUTPUT'; payload: string[] }
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

const defaultSettings: Settings = {
  connectionType: 'openai',
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  customModelId: 'gpt-4o',
  localModels: [],
  agentModelAssignments: {},
};

const loadSettingsFromStorage = (): Settings => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = localStorage.getItem('ai-maos-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new fields
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
  return defaultSettings;
};

const initialState: AppState = {
  currentView: 'dashboard',
  currentMode: 'chat',
  agents: defaultAgents,
  tasks: [],
  skills: [
    { id: '1', name: 'React Component Generator', description: 'Generates React components from descriptions', category: 'Development', source: 'generated', createdAt: '2024-01-15', content: '# React Component Generator Skill...', tags: ['react', 'frontend', 'generation'] },
    { id: '2', name: 'API Documentation Parser', description: 'Parses and structures API documentation', category: 'Integration', source: 'uploaded', createdAt: '2024-01-20', content: '# API Parser Skill...', tags: ['api', 'documentation'] },
    { id: '3', name: 'Research Synthesis', description: 'Synthesizes research from multiple sources into structured reports', category: 'Research', source: 'generated', createdAt: '2024-02-01', content: '# Research Synthesis Skill...', tags: ['research', 'synthesis'] },
    { id: '4', name: 'Test Suite Generator', description: 'Generates comprehensive test suites for any codebase', category: 'Testing', source: 'generated', createdAt: '2024-02-10', content: '# Test Generator Skill...', tags: ['testing', 'automation'] },
  ],
  messages: [
    { id: '1', role: 'system', content: 'AI-MAOS initialized. All systems operational. 12 agents ready.', timestamp: new Date().toISOString() },
  ],
  activityLogs: [
    { id: '1', type: 'system', message: 'System initialized with 12 agents', timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'info' },
    { id: '2', type: 'skill', message: 'Skill "React Component Generator" loaded', timestamp: new Date(Date.now() - 3000000).toISOString(), level: 'success' },
    { id: '3', type: 'system', message: 'Local model cache verified (3 models available)', timestamp: new Date(Date.now() - 2400000).toISOString(), level: 'info' },
  ],
  modelConfig: {
    type: 'api',
    apiBaseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelId: 'gpt-4o',
    localModelPath: '',
    localModelSize: '7B',
  },
  backups: [
    { id: '1', name: 'Auto Backup', date: new Date(Date.now() - 86400000).toISOString(), size: '2.4 MB', type: 'auto' },
    { id: '2', name: 'Manual Backup', date: new Date(Date.now() - 172800000).toISOString(), size: '2.1 MB', type: 'manual' },
  ],
  isExecuting: false,
  selectedProject: null,
  fileTree: defaultFileTree,
  terminalOutput: [
    '$ ai-maos init',
    '✓ System initialized',
    '✓ 12 agents loaded',
    '✓ 4 skills indexed',
    '✓ Database connected (RxDB local)',
    '✓ Ready for commands',
  ],
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
    case 'ADD_SKILL':
      return { ...state, skills: [...state.skills, action.payload] };
    case 'DELETE_SKILL':
      return { ...state, skills: state.skills.filter(s => s.id !== action.payload) };
    case 'ADD_ACTIVITY_LOG':
      return { ...state, activityLogs: [action.payload, ...state.activityLogs].slice(0, 100) };
    case 'SET_MODEL_CONFIG':
      return { ...state, modelConfig: action.payload };
    case 'ADD_BACKUP':
      return { ...state, backups: [action.payload, ...state.backups] };
    case 'SET_EXECUTING':
      return { ...state, isExecuting: action.payload };
    case 'SET_TERMINAL_OUTPUT':
      return { ...state, terminalOutput: action.payload };
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
