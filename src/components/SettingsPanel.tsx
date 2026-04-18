import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Server,
  Globe,
  Key,
  Cpu,
  Upload,
  Check,
  X as XIcon,
  Loader2,
  Trash2,
  ChevronRight,
  Info,
  Shield,
} from 'lucide-react';
import { Settings, ConnectionType, ModelFile, ModelTestStatus } from '../types';
import { testModel, type ModelTestResult } from '../utils/testModel';
import { cn } from '../utils/cn';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

type Tab = 'connection' | 'models' | 'upload';

export default function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('connection');
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState<{ progress: number; message: string } | null>(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const updateSettings = (updates: Partial<Settings>) => {
    onUpdateSettings({ ...settings, ...updates });
  };

  const handleConnectionTypeChange = (type: ConnectionType) => {
    updateSettings({ connectionType: type });
  };

  const handleApiKeyChange = (value: string) => {
    updateSettings({ apiKey: value });
  };

  const handleApiBaseUrlChange = (value: string) => {
    updateSettings({ apiBaseUrl: value });
  };

  const handleCustomModelIdChange = (value: string) => {
    updateSettings({ customModelId: value });
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'gguf' && ext !== 'safetensors') {
        alert(`Invalid file format: ${file.name}. Only .gguf and .safetensors files are supported.`);
        continue;
      }

      const url = URL.createObjectURL(file);
      const newModel: ModelFile = {
        id: `model_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        format: ext as 'gguf' | 'safetensors',
        size: file.size,
        url,
        uploadedAt: Date.now(),
        testStatus: 'pending',
      };

      updateSettings({
        localModels: [...settings.localModels, newModel],
      });

      // Auto-test the model
      setTestingModel(newModel.id);
      setTestProgress({ progress: 0, message: 'Initializing test...' });

      try {
        const result: ModelTestResult = await testModel(file, (progress, message) => {
          setTestProgress({ progress, message });
        });

        updateSettings({
          localModels: settings.localModels.map(m =>
            m.id === newModel.id
              ? {
                  ...m,
                  testStatus: result.status,
                  testDetails: result.details || result.error,
                }
              : m
          ),
        });
      } catch (error) {
        updateSettings({
          localModels: settings.localModels.map(m =>
            m.id === newModel.id
              ? {
                  ...m,
                  testStatus: 'failed',
                  testDetails: error instanceof Error ? error.message : 'Unknown error',
                }
              : m
          ),
        });
      }

      setTestingModel(null);
      setTestProgress(null);
    }

    e.target.value = '';
  };

  const handleDeleteModel = (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    updateSettings({
      localModels: settings.localModels.filter(m => m.id !== modelId),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a0f] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <SettingsIcon className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-100">Settings</h2>
              <p className="text-[11px] text-zinc-500">Configure models, connections, and agent assignments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-6">
          {(['connection', 'models', 'upload'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative px-4 py-3 text-[13px] font-medium transition',
                activeTab === tab
                  ? 'text-violet-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto p-6">
          {activeTab === 'connection' && (
            <div className="space-y-6">
              {/* Connection Type */}
              <div>
                <label className="mb-3 flex items-center gap-2 text-[13px] font-medium text-zinc-200">
                  <Server className="h-4 w-4" /> Connection Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleConnectionTypeChange('local')}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                      settings.connectionType === 'local'
                        ? 'border-violet-500/30 bg-violet-500/10'
                        : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-900/80'
                    )}
                  >
                    <Cpu className={cn(
                      'h-5 w-5',
                      settings.connectionType === 'local' ? 'text-violet-400' : 'text-zinc-500'
                    )} />
                    <div>
                      <div className="text-[13px] font-medium text-zinc-100">Local Model</div>
                      <div className="text-[11px] text-zinc-500">Use GGUF/Safetensors</div>
                    </div>
                    {settings.connectionType === 'local' && (
                      <Check className="ml-auto h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleConnectionTypeChange('openai')}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                      settings.connectionType === 'openai'
                        ? 'border-violet-500/30 bg-violet-500/10'
                        : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-900/80'
                    )}
                  >
                    <Globe className={cn(
                      'h-5 w-5',
                      settings.connectionType === 'openai' ? 'text-violet-400' : 'text-zinc-500'
                    )} />
                    <div>
                      <div className="text-[13px] font-medium text-zinc-100">OpenAI API</div>
                      <div className="text-[11px] text-zinc-500">Use cloud models</div>
                    </div>
                    {settings.connectionType === 'openai' && (
                      <Check className="ml-auto h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* OpenAI Settings */}
              {settings.connectionType === 'openai' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-zinc-200">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={apiKeyVisible ? 'text' : 'password'}
                        value={settings.apiKey}
                        onChange={e => handleApiKeyChange(e.target.value)}
                        placeholder="sk-..."
                        className="w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 pr-10 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                      />
                      <button
                        onClick={() => setApiKeyVisible(!apiKeyVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {apiKeyVisible ? <XIcon className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-zinc-200">
                      Custom Model ID
                    </label>
                    <input
                      type="text"
                      value={settings.customModelId}
                      onChange={e => handleCustomModelIdChange(e.target.value)}
                      placeholder="gpt-4o, gpt-4-turbo, gpt-3.5-turbo"
                      className="w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Security Warning */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="text-[12px] leading-relaxed text-amber-100">
                  <span className="font-medium">Security Notice:</span> API keys are stored in your browser's localStorage. This is convenient but not secure. Only use in trusted environments.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              {settings.localModels.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/30 py-12">
                  <Cpu className="mb-3 h-10 w-10 text-zinc-600" />
                  <div className="text-[13px] font-medium text-zinc-300">No models uploaded</div>
                  <div className="mt-1 text-[11px] text-zinc-500">Upload GGUF or Safetensors files to get started</div>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-[12px] font-medium text-violet-200 transition hover:bg-violet-500/20"
                  >
                    Go to Upload
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.localModels.map(model => (
                    <div
                      key={model.id}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-900/40 p-4"
                    >
                      <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 ring-1 ring-white/10">
                        <Cpu className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-[13px] font-medium text-zinc-100">{model.name}</div>
                          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">
                            {model.format}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {(model.size / 1024 / 1024).toFixed(2)} MB • {new Date(model.uploadedAt).toLocaleString()}
                        </div>
                        <div className="mt-2">
                          {model.testStatus === 'testing' && (
                            <div className="flex items-center gap-2 text-[11px] text-amber-300">
                              <Loader2 className="h-3 w-3 animate-spin" /> Testing...
                            </div>
                          )}
                          {model.testStatus === 'passed' && (
                            <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                              <Check className="h-3 w-3" /> {model.testDetails || 'Model validated'}
                            </div>
                          )}
                          {model.testStatus === 'failed' && (
                            <div className="flex items-center gap-2 text-[11px] text-red-300">
                              <XIcon className="h-3 w-3" /> {model.testDetails || 'Validation failed'}
                            </div>
                          )}
                          {model.testStatus === 'pending' && (
                            <div className="text-[11px] text-zinc-500">Pending validation</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteModel(model.id)}
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-red-400"
                        title="Delete model"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Upload Zone */}
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-zinc-900/30 py-12 transition hover:border-violet-500/30 hover:bg-zinc-900/50">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
                  <Upload className="h-6 w-6 text-violet-400" />
                </div>
                <div className="mt-3 text-[13px] font-medium text-zinc-200">
                  Upload Model Files
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  GGUF and Safetensors files are supported
                </div>
                <label className="mt-4 cursor-pointer">
                  <input
                    type="file"
                    accept=".gguf,.safetensors"
                    multiple
                    className="hidden"
                    onChange={handleModelUpload}
                    disabled={testingModel !== null}
                  />
                  <span className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    {testingModel ? 'Processing...' : 'Select Files'}
                  </span>
                </label>
              </div>

              {/* Testing Progress */}
              {testingModel && testProgress && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-amber-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing Model
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${testProgress.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-amber-100">{testProgress.message}</div>
                </div>
              )}

              {/* Info Box */}
              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-900/40 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <div className="text-[12px] leading-relaxed text-zinc-400">
                  Uploaded models will be automatically tested for compatibility and structure. The testing process validates the file format, tensor structure, and runs a basic inference simulation.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
          <div className="text-[11px] text-zinc-500">
            Settings are saved automatically to localStorage
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-violet-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
