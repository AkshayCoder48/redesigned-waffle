import { X, Network, Brain, Cpu, Globe, ChevronRight, Info, Eye, Play, Square, RefreshCw, Zap, Moon, CheckCircle2, AlertTriangle, ListTodo, Activity, Loader2, Terminal } from 'lucide-react';
import { Agent, Settings, Task } from '../types';
import AgentModelSelector from './AgentModelSelector';
import { cn } from '../utils/cn';
import { resolveModelForAgent } from '../utils/orchestrator';
import { useEffect, useState, useRef } from 'react';

interface AgentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  tasks?: Task[];
  activityPanelMode?: 'activity' | 'tasks';
  onActivityPanelModeChange?: (mode: 'activity' | 'tasks') => void;
  watchTarget?: 'none' | string;
  onWatchAgent?: (agentId: string) => void;
  onStopWatch?: () => void;
  webContainerStatus?: 'idle' | 'starting' | 'running' | 'stopped' | 'error';
  terminalOutput?: string[];
  previewUrl?: string | null;
  onRunProject?: () => void;
  onStopProject?: () => void;
  onClearTerminal?: () => void;
  onRefreshPreview?: () => void;
}

export default function AgentsPanel({
  isOpen,
  onClose,
  agents,
  settings,
  onUpdateSettings,
  tasks = [],
  activityPanelMode = 'activity',
  onActivityPanelModeChange,
  watchTarget = 'none',
  onWatchAgent,
  onStopWatch,
  webContainerStatus = 'idle',
  terminalOutput = [],
  previewUrl,
  onRunProject,
  onStopProject,
  onClearTerminal,
  onRefreshPreview,
}: AgentsPanelProps) {
  const orchestrator = agents.find(a => a.id === 'orchestrator');
  const otherAgents = agents.filter(a => a.id !== 'orchestrator');
  const terminalRef = useRef<HTMLDivElement>(null);
  const [watchedAgentName, setWatchedAgentName] = useState<string | null>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  useEffect(() => {
    if (watchTarget !== 'none') {
      const agent = agents.find(a => a.id === watchTarget);
      if (agent) {
        setWatchedAgentName(agent.name);
      }
    } else {
      setWatchedAgentName(null);
    }
  }, [watchTarget, agents]);

  const handleUpdateAssignment = (agentId: string, modelIds: string[]) => {
    onUpdateSettings({
      ...settings,
      agentModelAssignments: {
        ...settings.agentModelAssignments,
        [agentId]: modelIds,
      },
    });
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-amber-300';
      case 'completed': return 'text-cyan-300';
      case 'error': return 'text-red-300';
      case 'thinking': return 'text-violet-300';
      case 'idle': return 'text-zinc-400';
      default: return 'text-zinc-500';
    }
  };

  const getAgentStatusLabel = (status: string) => {
    switch (status) {
      case 'working': return 'Working';
      case 'completed': return 'Done';
      case 'error': return 'Error';
      case 'thinking': return 'Thinking';
      case 'idle': return 'Idle';
      case 'sleeping': return 'Sleeping';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="hidden w-[360px] shrink-0 border-l border-white/5 bg-zinc-950/60 xl:block">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-200">
            <Network className="h-4 w-4 text-violet-400" /> Agent Swarm
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Activity/Tasks Toggle */}
        <div className="flex border-b border-white/5 px-4 py-2">
          <button
            onClick={() => onActivityPanelModeChange?.('activity')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition',
              activityPanelMode === 'activity'
                ? 'bg-violet-500/10 text-violet-300'
                : 'text-zinc-500 hover:bg-white/5'
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            Activity
          </button>
          <button
            onClick={() => onActivityPanelModeChange?.('tasks')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition',
              activityPanelMode === 'tasks'
                ? 'bg-violet-500/10 text-violet-300'
                : 'text-zinc-500 hover:bg-white/5'
            )}
          >
            <ListTodo className="h-3.5 w-3.5" />
            Tasks
            {tasks.length > 0 && (
              <span className="ml-1 rounded-full bg-violet-500/30 px-1.5 py-0.5 text-[10px]">
                {tasks.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activityPanelMode === 'activity' ? (
            <>
              {/* Activity Panel - All Agents with Status */}
              <div className="mb-4">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <Activity className="h-3.5 w-3.5" /> All Agents
                </div>
                <div className="space-y-2">
                  {agents.map(agent => {
                    const isWatching = watchTarget === agent.id;
                    const isSleeping = agent.status === 'idle' || agent.status === 'sleeping';
                    
                    return (
                      <div
                        key={agent.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-2 transition',
                          isWatching
                            ? 'border-violet-500/30 bg-violet-500/5'
                            : agent.status === 'working'
                            ? 'border-amber-500/20 bg-amber-500/5'
                            : 'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'grid h-6 w-6 place-items-center rounded-md',
                              agent.status === 'working' ? 'bg-amber-500/10 ring-1 ring-amber-500/30' :
                              agent.status === 'completed' ? 'bg-cyan-500/10 ring-1 ring-cyan-500/30' :
                              agent.status === 'sleeping' ? 'bg-zinc-800/50 ring-1 ring-zinc-600/30' :
                              'bg-zinc-800 ring-1 ring-white/10'
                            )}
                          >
                            {agent.status === 'working' && <Loader2 className="h-3 w-3 animate-spin text-amber-400" />}
                            {agent.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-cyan-400" />}
                            {agent.status === 'sleeping' && <Moon className="h-3 w-3 text-zinc-500" />}
                            {(agent.status === 'idle' || agent.status === 'error') && (
                              <Brain className="h-3 w-3 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-zinc-200">{agent.name}</div>
                            <div className={cn('text-[10px]', getAgentStatusColor(agent.status))}>
                              {getAgentStatusLabel(agent.status)}
                              {agent.progress !== undefined && agent.progress > 0 && ` (${agent.progress}%)`}
                            </div>
                          </div>
                        </div>
                        {onWatchAgent && (
                          <button
                            onClick={() => onWatchAgent(agent.id)}
                            className={cn(
                              'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition',
                              isWatching
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                            )}
                          >
                            <Eye className="h-3 w-3" />
                            Watch
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Watch Panel */}
              {watchTarget !== 'none' && watchedAgentName && (
                <div className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-violet-200">
                      <Eye className="h-4 w-4" />
                      Watching: {watchedAgentName}
                    </div>
                    {onStopWatch && (
                      <button
                        onClick={onStopWatch}
                        className="rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {agents.find(a => a.id === watchTarget)?.status === 'idle' || 
                   agents.find(a => a.id === watchTarget)?.status === 'sleeping' ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                      <div className="text-[11px] text-amber-200">
                        Agent is sleeping — tag <span className="font-mono text-amber-100">@{watchTarget}</span> to make it work.
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-400">
                      Real-time activity monitoring for {watchedAgentName}
                    </div>
                  )}
                </div>
              )}

              {/* Orchestrator */}
              <div className="mb-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20 ring-1 ring-violet-500/30">
                    <Brain className="h-4 w-4 text-violet-300" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-violet-200">Orchestrator</div>
                    <div className="text-[10px] text-violet-300/70">Planning & coordination</div>
                  </div>
                </div>
                <div className="mb-3 text-[11px] leading-snug text-zinc-400">
                  Plans tasks, selects tools, spawns agents, and verifies outputs.
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Progress</span>
                    <span>{orchestrator?.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
                      style={{ width: `${orchestrator?.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Model Assignment */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
                    <Globe className="h-3 w-3 text-zinc-500" />
                    Model
                  </div>
                  <AgentModelSelector
                    agentId="orchestrator"
                    agentName="Orchestrator"
                    settings={settings}
                    onUpdateAssignment={handleUpdateAssignment}
                  />
                </div>
              </div>

              {/* Other Agents */}
              <div className="mb-4">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <ChevronRight className="h-3.5 w-3.5" /> Specialized Agents
                </div>
                <div className="space-y-3">
                  {otherAgents.map(agent => {
                    const resolvedModel = resolveModelForAgent(agent.id, settings);
                    const model: { name: string; type: 'remote' | 'local' } = {
                      name: resolvedModel.modelName,
                      type: resolvedModel.source === 'local' ? 'local' : 'remote',
                    };

                    return (
                      <div
                        key={agent.id}
                        className={cn(
                          'rounded-xl border p-3 transition',
                          agent.status === 'working'
                            ? 'border-amber-500/20 bg-amber-500/5'
                            : agent.status === 'completed'
                            ? 'border-cyan-500/20 bg-cyan-500/5'
                            : 'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60'
                        )}
                      >
                        {/* Agent Header */}
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'grid h-7 w-7 place-items-center rounded-lg ring-1',
                                agent.status === 'working'
                                  ? 'bg-amber-500/10 ring-amber-500/30'
                                  : agent.status === 'completed'
                                  ? 'bg-cyan-500/10 ring-cyan-500/30'
                                  : 'bg-zinc-800 ring-white/10'
                              )}
                            >
                              {/* Simple icon based on agent name */}
                              {agent.id.includes('coding') && (
                                <span className="text-[12px]">💻</span>
                              )}
                              {agent.id.includes('research') && (
                                <span className="text-[12px]">🔍</span>
                              )}
                              {agent.id.includes('browser') && (
                                <span className="text-[12px]">🌐</span>
                              )}
                              {agent.id.includes('testing') && (
                                <span className="text-[12px]">🧪</span>
                              )}
                              {agent.id.includes('docs') && (
                                <span className="text-[12px]">📚</span>
                              )}
                              {agent.id.includes('data') && (
                                <span className="text-[12px]">📊</span>
                              )}
                              {agent.id.includes('uiux') && (
                                <span className="text-[12px]">🎨</span>
                              )}
                              {agent.id.includes('debugging') && (
                                <span className="text-[12px]">🐛</span>
                              )}
                              {agent.id.includes('chat') && (
                                <span className="text-[12px]">💬</span>
                              )}
                              {agent.id.includes('study') && (
                                <span className="text-[12px]">📖</span>
                              )}
                              {agent.id.includes('documentation') && (
                                <span className="text-[12px]">📝</span>
                              )}
                              {agent.id.includes('api') && (
                                <span className="text-[12px]">🔌</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="truncate text-[12px] font-medium text-zinc-100">
                                  {agent.name}
                                </div>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-md border px-1 py-0.5 text-[9px] uppercase tracking-wide',
                                    agent.status === 'working'
                                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                      : agent.status === 'completed'
                                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                                      : 'border-white/10 bg-white/5 text-zinc-400'
                                  )}
                                >
                                  {agent.status === 'working' && 'Working'}
                                  {agent.status === 'completed' && 'Done'}
                                  {agent.status === 'idle' && 'Idle'}
                                  {agent.status === 'thinking' && 'Thinking'}
                                  {agent.status === 'error' && 'Error'}
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-zinc-500">
                                {agent.description || agent.type}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {agent.status !== 'idle' && agent.progress !== undefined && (
                          <div className="mb-2">
                            <div className="h-1 w-full overflow-hidden rounded-full bg-black/30">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  agent.status === 'working'
                                    ? 'bg-amber-500'
                                    : agent.status === 'completed'
                                    ? 'bg-cyan-500'
                                    : 'bg-zinc-600'
                                )}
                                style={{ width: `${agent.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Model Selector */}
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Globe className="h-3 w-3" />
                              <span>Model</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {model.type === 'remote' ? (
                                <Globe className="h-3 w-3 text-zinc-500" />
                              ) : (
                                <Cpu className="h-3 w-3 text-cyan-400" />
                              )}
                              <span className="truncate text-[10px] text-zinc-400">
                                {model.name}
                              </span>
                            </div>
                          </div>
                          <AgentModelSelector
                            agentId={agent.id}
                            agentName={agent.name}
                            settings={settings}
                            onUpdateAssignment={handleUpdateAssignment}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Tasks View */
            <>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-zinc-800/50 ring-1 ring-white/10">
                    <ListTodo className="h-6 w-6 text-zinc-500" />
                  </div>
                  <div className="text-[13px] font-medium text-zinc-300">No tasks yet</div>
                  <div className="mt-1 text-[11px] text-zinc-500">Tasks will appear here when agents are working</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        'rounded-xl border p-3',
                        task.status === 'running' ? 'border-amber-500/20 bg-amber-500/5' :
                        task.status === 'completed' ? 'border-cyan-500/20 bg-cyan-500/5' :
                        task.status === 'failed' ? 'border-red-500/20 bg-red-500/5' :
                        'border-white/5 bg-zinc-900/40'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-[12px] font-medium text-zinc-200">{task.title}</div>
                          <div className="mt-1 text-[10px] text-zinc-500">
                            Assigned to: {agents.find(a => a.id === task.assignedAgent)?.name || task.assignedAgent}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'rounded-md border px-1.5 py-0.5 text-[9px] uppercase',
                            task.status === 'running' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' :
                            task.status === 'completed' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' :
                            task.status === 'failed' ? 'border-red-500/30 bg-red-500/10 text-red-200' :
                            'border-white/10 bg-white/5 text-zinc-400'
                          )}
                        >
                          {task.status}
                        </span>
                      </div>
                      {task.output && (
                        <div className="mt-2 rounded-lg bg-black/20 p-2 text-[10px] text-zinc-400">
                          {task.output.slice(0, 100)}
                          {task.output.length > 100 && '...'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* WebContainers Terminal */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <Terminal className="h-3.5 w-3.5" /> Terminal
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onClearTerminal}
                  className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  title="Clear terminal"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Terminal Controls */}
            <div className="mb-2 flex items-center gap-2">
              {webContainerStatus === 'idle' || webContainerStatus === 'stopped' ? (
                <button
                  onClick={onRunProject}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-500"
                >
                  <Play className="h-3 w-3" />
                  Run Project
                </button>
              ) : webContainerStatus === 'running' ? (
                <button
                  onClick={onStopProject}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-red-500"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Starting...
                </div>
              )}
              {previewUrl && (
                <button
                  onClick={onRefreshPreview}
                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh Preview
                </button>
              )}
            </div>

            {/* Status Indicator */}
            <div className="mb-2 flex items-center gap-2 text-[10px]">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                  webContainerStatus === 'running' ? 'bg-emerald-500/20 text-emerald-300' :
                  webContainerStatus === 'starting' ? 'bg-amber-500/20 text-amber-300' :
                  webContainerStatus === 'error' ? 'bg-red-500/20 text-red-300' :
                  'bg-zinc-500/20 text-zinc-400'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    webContainerStatus === 'running' ? 'bg-emerald-400' :
                    webContainerStatus === 'starting' ? 'animate-pulse bg-amber-400' :
                    webContainerStatus === 'error' ? 'bg-red-400' :
                    'bg-zinc-400'
                  )}
                />
                {webContainerStatus}
              </span>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-300 hover:text-violet-200"
                >
                  {previewUrl}
                </a>
              )}
            </div>

            {/* Terminal Output */}
            <div
              ref={terminalRef}
              className="h-48 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300"
            >
              {terminalOutput.length === 0 ? (
                <div className="text-zinc-500">
                  Terminal output will appear here...
                </div>
              ) : (
                terminalOutput.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 rounded-xl border border-white/5 bg-zinc-900/40 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <div className="text-[11px] leading-relaxed text-zinc-400">
                <span className="font-medium text-zinc-300">Model Assignment:</span>{' '}
                Each agent can be assigned specific models. In OpenAI-compatible mode
                agents default to the selected provider template, and in local mode
                they default to validated GGUF/Safetensors uploads. You can override
                either direction per-agent from the selector above.
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-zinc-900/40 p-3">
            <div className="text-center">
              <div className="text-[20px] font-semibold text-zinc-100">
                {agents.filter(a => a.status === 'working').length}
              </div>
              <div className="text-[10px] text-zinc-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-semibold text-zinc-100">
                {settings.localModels.filter(m => m.testStatus === 'passed').length}
              </div>
              <div className="text-[10px] text-zinc-500">Local Models</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
