import { Check, ChevronDown, Cpu, Globe, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Settings } from '../types';
import { cn } from '../utils/cn';
import { resolveModelForAgent } from '../utils/orchestrator';

interface AgentModelSelectorProps {
  agentId: string;
  agentName?: string;
  settings: Settings;
  onUpdateAssignment: (agentId: string, modelIds: string[]) => void;
}

export default function AgentModelSelector({
  agentId,
  settings,
  onUpdateAssignment,
}: AgentModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const assignedModels = settings.agentModelAssignments[agentId] || [];
  const localModels = settings.localModels.filter(m => m.testStatus === 'passed');

  const selectedProvider = settings.providerTemplates.find(p => p.id === settings.selectedProviderId);
  const selectedProviderModels = selectedProvider?.models || [];
  const localModelIds = new Set(localModels.map(model => model.id));

  const resolvedModel = resolveModelForAgent(agentId, settings);
  const usingRemoteModel = resolvedModel.source !== 'local';
  const selectedRemoteModel = selectedProviderModels.find(model => model.id === settings.selectedModelId);
  const remoteFallbackModelLabel = selectedRemoteModel?.name || settings.selectedModelId || settings.customModelId || 'gpt-4o';
  const remoteFallbackModelId = selectedRemoteModel?.id || settings.selectedModelId || settings.customModelId || 'gpt-4o';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleModel = (modelId: string) => {
    let next: string[];

    if (modelId === 'openai') {
      next = ['openai'];
    } else {
      const currentLocalAssignments = assignedModels.filter(id => localModelIds.has(id));
      next = currentLocalAssignments.includes(modelId)
        ? currentLocalAssignments.filter(id => id !== modelId)
        : [...currentLocalAssignments, modelId];
    }

    onUpdateAssignment(agentId, next);
    setIsOpen(false);
  };

  const getDisplayModel = () => {
    if (usingRemoteModel) {
      const usingProvider = resolvedModel.source === 'provider';
      return (
        <div className="flex items-center gap-2">
          {usingProvider ? (
            <Zap className="h-3.5 w-3.5 text-violet-400" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-zinc-400" />
          )}
          <span className="text-[12px] text-zinc-200">
            {resolvedModel.modelName || settings.customModelId || 'gpt-4o'}
          </span>
        </div>
      );
    }

    const model = localModels.find(m => m.id === resolvedModel.modelId);
    if (!model) {
      return (
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[12px] text-zinc-500">No model selected</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Cpu className="h-3.5 w-3.5 text-cyan-400" />
        <span className="truncate text-[12px] text-zinc-200">{model.name}</span>
        {assignedModels.filter(id => localModelIds.has(id)).length > 1 && (
          <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            +{assignedModels.filter(id => localModelIds.has(id)).length - 1}
          </span>
        )}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition',
          isOpen
            ? 'border-violet-500/30 bg-violet-500/10'
            : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-900/80'
        )}
      >
        {getDisplayModel()}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-zinc-500 transition',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-zinc-900/95 p-2 shadow-xl backdrop-blur-sm max-h-[300px] overflow-y-auto">
          {/* Selected Provider Models */}
          {selectedProvider && selectedProviderModels.length > 0 && (
            <>
              <div className="mb-2 px-3 text-[10px] uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                {selectedProvider.name}
              </div>
              {selectedProviderModels.slice(0, 8).map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    onUpdateAssignment(agentId, [model.id]);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
                    assignedModels.includes(model.id) || (assignedModels.length === 0 && settings.selectedModelId === model.id)
                      ? 'bg-violet-500/10 text-violet-200'
                      : 'text-zinc-300 hover:bg-zinc-800/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{model.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{model.id}</div>
                    </div>
                  </div>
                  {(assignedModels.includes(model.id) || (assignedModels.length === 0 && settings.selectedModelId === model.id)) && (
                    <Check className="h-3.5 w-3.5 text-violet-400" />
                  )}
                </button>
              ))}
              {selectedProviderModels.length > 8 && (
                <div className="px-3 py-2 text-[10px] text-zinc-500 text-center">
                  +{selectedProviderModels.length - 8} more models • Manage in Settings
                </div>
              )}
              <div className="my-2 border-t border-white/5" />
            </>
          )}

          {/* OpenAI-compatible Option (fallback) */}
          <button
            onClick={() => handleToggleModel('openai')}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
              (assignedModels.includes('openai') || (assignedModels.length === 0 && !selectedProviderModels.length))
                ? 'bg-violet-500/10 text-violet-200'
                : 'text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <div>
                <div className="text-[12px] font-medium">OpenAI-compatible API</div>
                <div className="text-[10px] text-zinc-500">
                  {remoteFallbackModelLabel} ({remoteFallbackModelId})
                </div>
              </div>
            </div>
            {(assignedModels.includes('openai') || (assignedModels.length === 0 && !selectedProviderModels.length)) && <Check className="h-3.5 w-3.5 text-violet-400" />}
          </button>

          {/* Local Models */}
          {localModels.length > 0 && (
            <>
              <div className="my-2 border-t border-white/5" />
              <div className="mb-2 px-3 text-[10px] uppercase tracking-wide text-zinc-500">
                Local Models
              </div>
              {localModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleToggleModel(model.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
                    assignedModels.includes(model.id)
                      ? 'bg-cyan-500/10 text-cyan-200'
                      : 'text-zinc-300 hover:bg-zinc-800/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{model.name}</div>
                      <div className="text-[10px] text-zinc-500">
                        {(model.size / 1024 / 1024).toFixed(1)} MB • {model.format}
                      </div>
                    </div>
                  </div>
                  {assignedModels.includes(model.id) && (
                    <Check className="h-3.5 w-3.5 text-cyan-400" />
                  )}
                </button>
              ))}
            </>
          )}

          {localModels.length === 0 && selectedProviderModels.length === 0 && (
            <div className="px-3 py-4 text-center text-[11px] text-zinc-500">
              No models available. Configure providers in Settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
