import { Check, ChevronDown, Cpu, Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Settings } from '../types';
import { cn } from '../utils/cn';

interface AgentModelSelectorProps {
  agentId: string;
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

  // Default to OpenAI if no local models assigned
  const useOpenAI = assignedModels.length === 0 || assignedModels.includes('openai');

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
    const current = assignedModels.includes('openai') ? ['openai'] : [...assignedModels];
    const hasOpenAI = current.includes('openai');

    let next: string[];

    if (modelId === 'openai') {
      // Toggle OpenAI - clears all local models when selected
      next = hasOpenAI ? [] : ['openai'];
    } else {
      // Toggle local model - remove OpenAI if selecting local model
      next = current.includes(modelId)
        ? current.filter(id => id !== modelId)
        : [...current.filter(id => id !== 'openai'), modelId];
    }

    onUpdateAssignment(agentId, next);
    setIsOpen(false);
  };

  const getDisplayModel = () => {
    if (useOpenAI) {
      return (
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[12px] text-zinc-200">
            {settings.customModelId || 'gpt-4o'}
          </span>
        </div>
      );
    }

    const model = localModels.find(m => m.id === assignedModels[0]);
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
        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
        <span className="truncate text-[12px] text-zinc-200">{model.name}</span>
        {assignedModels.length > 1 && (
          <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            +{assignedModels.length - 1}
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
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-zinc-900/95 p-2 shadow-xl backdrop-blur-sm">
          {/* OpenAI Option */}
          <button
            onClick={() => handleToggleModel('openai')}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
              useOpenAI
                ? 'bg-violet-500/10 text-violet-200'
                : 'text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <div>
                <div className="text-[12px] font-medium">OpenAI API</div>
                <div className="text-[10px] text-zinc-500">
                  {settings.customModelId || 'gpt-4o'}
                </div>
              </div>
            </div>
            {useOpenAI && <Check className="h-3.5 w-3.5 text-violet-400" />}
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
                    assignedModels.includes(model.id) && !useOpenAI
                      ? 'bg-emerald-500/10 text-emerald-200'
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
                  {assignedModels.includes(model.id) && !useOpenAI && (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </button>
              ))}
            </>
          )}

          {localModels.length === 0 && (
            <div className="px-3 py-4 text-center text-[11px] text-zinc-500">
              No local models available. Upload models in Settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
