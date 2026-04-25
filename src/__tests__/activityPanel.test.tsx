/**
 * Tests for Activity Panel and Todo/Real-time Watch functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AgentsPanel from '../components/AgentsPanel';
import { Agent, Settings, Task } from '../types';

// Mock data
const mockAgents: Agent[] = [
  { id: 'orchestrator', name: 'Orchestrator', type: 'primary', status: 'idle', icon: 'brain', description: 'Central intelligence', progress: 0 },
  { id: 'coding', name: 'Coding Agent', type: 'sub', status: 'working', icon: 'code', description: 'Generates code', progress: 50 },
  { id: 'chat', name: 'Chat Agent', type: 'sub', status: 'idle', icon: 'message-square', description: 'Handles chat', progress: 0 },
];

const mockSettings: Settings = {
  connectionType: 'openai',
  apiBaseUrl: 'https://api.example.com',
  apiKey: 'test-key',
  customModelId: 'gpt-4',
  localModels: [],
  agentModelAssignments: {},
  providerTemplates: [],
  selectedProviderId: 'pollinations',
  selectedModelId: 'openai',
};

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Test Task',
    status: 'running',
    assignedAgent: 'coding',
    createdAt: new Date().toISOString(),
    retries: 0,
    logs: [],
  },
];

describe('AgentsPanel', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Activity Panel Mode', () => {
    it('should show Activity tab', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
        />
      );

      expect(screen.getByText('Activity')).toBeTruthy();
    });

    it('should show Tasks tab', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
        />
      );

      expect(screen.getByText('Tasks')).toBeTruthy();
    });

    it('should display agents in activity view', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          activityPanelMode="activity"
        />
      );

      expect(screen.getByText('Orchestrator')).toBeTruthy();
      expect(screen.getByText('Coding Agent')).toBeTruthy();
    });
  });

  describe('Tasks View', () => {
    it('should show empty state when no tasks', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          tasks={[]}
          activityPanelMode="tasks"
        />
      );

      expect(screen.getByText('No tasks yet')).toBeTruthy();
    });

    it('should display tasks when available', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          tasks={mockTasks}
          activityPanelMode="tasks"
        />
      );

      expect(screen.getByText('Test Task')).toBeTruthy();
      expect(screen.getByText('running')).toBeTruthy();
    });
  });

  describe('Real-time Watch', () => {
    it('should show Watch buttons', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          onWatchAgent={() => {}}
        />
      );

      const watchButtons = screen.getAllByText('Watch');
      expect(watchButtons.length).toBe(mockAgents.length);
    });

    it('should call onWatchAgent when Watch is clicked', () => {
      const onWatchAgent = vi.fn();
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          onWatchAgent={onWatchAgent}
        />
      );

      const watchButton = screen.getAllByText('Watch')[0];
      fireEvent.click(watchButton);

      expect(onWatchAgent).toHaveBeenCalled();
    });
  });

  describe('WebContainers Terminal', () => {
    it('should show Run Project button when idle', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          webContainerStatus="idle"
          onRunProject={() => {}}
        />
      );

      expect(screen.getByText('Run Project')).toBeTruthy();
    });

    it('should show Stop button when running', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          webContainerStatus="running"
          onStopProject={() => {}}
        />
      );

      expect(screen.getByText('Stop')).toBeTruthy();
    });

    it('should display terminal output', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          terminalOutput={['Line 1', 'Line 2', 'Line 3']}
        />
      );

      expect(screen.getByText('Line 1')).toBeTruthy();
      expect(screen.getByText('Line 2')).toBeTruthy();
      expect(screen.getByText('Line 3')).toBeTruthy();
    });

    it('should show status indicator', () => {
      render(
        <AgentsPanel
          isOpen={true}
          onClose={() => {}}
          agents={mockAgents}
          settings={mockSettings}
          onUpdateSettings={() => {}}
          webContainerStatus="running"
        />
      );

      expect(screen.getByText('running')).toBeTruthy();
    });
  });
});
