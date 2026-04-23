import { X, Network, Brain, Cpu, Globe, ChevronRight, Info } from 'lucide-react';
import { Agent, Settings } from '../types';
import AgentModelSelector from './AgentModelSelector';
import { cn } from '../utils/cn';
import { resolveModelForAgent } from '../utils/orchestrator';

interface AgentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

export default function AgentsPanel({
  isOpen,
  onClose,
  agents,
  settings,
  onUpdateSettings,
}: AgentsPanelProps) {
  const orchestrator = agents.find(a => a.id === 'orchestrator');
  const otherAgents = agents.filter(a => a.id !== 'orchestrator');

  const handleUpdateAssignment = (agentId: string, modelIds: string[]) => {
    onUpdateSettings({
      ...settings,
      agentModelAssignments: {
        ...settings.agentModelAssignments,
        [agentId]: modelIds,
      },
    });
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

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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

          {/* Info Box */}
          <div className="mt-6 rounded-xl border border-white/5 bg-zinc-900/40 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <div className="text-[11px] leading-relaxed text-zinc-400">
                <span className="font-medium text-zinc-300">Model Assignment:</span>{' '}
                Each agent can be assigned specific models. By default, agents use
                the selected OpenAI-compatible provider. Upload local models in
                Settings and assign them to agents here for offline or specialized
                inference.
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
