import { useMemo, useState } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Server,
  Globe,
  Cpu,
  Upload,
  Check,
  X as XIcon,
  Loader2,
  Trash2,
  Info,
  Shield,
  Plus,
  Save,
  Zap,
} from 'lucide-react';
import { Settings, ConnectionType, ModelFile, ProviderTemplate, Model } from '../types';
import { testModel, type ModelTestResult } from '../utils/testModel';
import { cn } from '../utils/cn';
import { MARKDOWN_TYPES, getMarkdownTypeById } from '../utils/markdownStyles';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

type Tab = 'connection' | 'models' | 'upload' | 'providers';

export default function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('connection');
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState<{ progress: number; message: string } | null>(null);
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<ProviderTemplate>>({
    name: '',
    description: '',
    apiBaseUrl: '',
    apiKey: '',
    models: [],
  });
  const [newModel, setNewModel] = useState<Partial<Model>>({ id: '', name: '', description: '' });

  const selectedProvider = useMemo(
    () => settings.providerTemplates.find((template) => template.id === settings.selectedProviderId),
    [settings.providerTemplates, settings.selectedProviderId]
  );

  const updateSettings = (updates: Partial<Settings>) => {
    onUpdateSettings({ ...settings, ...updates });
  };

  const updateProvider = (providerId: string, updates: Partial<ProviderTemplate>) => {
    const providerTemplates = settings.providerTemplates.map((template) =>
      template.id === providerId
        ? { ...template, ...updates }
        : template
    );

    const effectiveSelectedProvider = providerTemplates.find((template) => template.id === settings.selectedProviderId);

    updateSettings({
      providerTemplates,
      apiBaseUrl: effectiveSelectedProvider?.apiBaseUrl || settings.apiBaseUrl,
      apiKey: effectiveSelectedProvider?.apiKey ?? settings.apiKey,
    });
  };

  const handleConnectionTypeChange = (type: ConnectionType) => {
    updateSettings({ connectionType: type });
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let workingModels = [...settings.localModels];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'gguf' && ext !== 'safetensors') {
        alert(`Invalid file format: ${file.name}. Only .gguf and .safetensors files are supported.`);
        continue;
      }

      const url = URL.createObjectURL(file);
      const modelFile: ModelFile = {
        id: `model_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        format: ext as 'gguf' | 'safetensors',
        size: file.size,
        url,
        uploadedAt: Date.now(),
        testStatus: 'testing',
      };

      workingModels = [...workingModels, modelFile];
      updateSettings({ localModels: workingModels });

      setTestingModel(modelFile.id);
      setTestProgress({ progress: 0, message: 'Initializing test...' });

      try {
        const result: ModelTestResult = await testModel(file, (progress, message) => {
          setTestProgress({ progress, message });
        });

        workingModels = workingModels.map((existingModel) =>
          existingModel.id === modelFile.id
            ? {
                ...existingModel,
                testStatus: result.status,
                testDetails: result.details || result.error,
              }
            : existingModel
        );

        updateSettings({
          localModels: workingModels,
          customModelId: result.status === 'passed' && settings.connectionType === 'local'
            ? modelFile.id
            : settings.customModelId,
        });
      } catch (error) {
        workingModels = workingModels.map((existingModel) =>
          existingModel.id === modelFile.id
            ? {
                ...existingModel,
                testStatus: 'failed',
                testDetails: error instanceof Error ? error.message : 'Unknown error',
              }
            : existingModel
        );

        updateSettings({ localModels: workingModels });
      }

      setTestingModel(null);
      setTestProgress(null);
    }

    e.target.value = '';
  };

  const handleDeleteModel = (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    updateSettings({
      localModels: settings.localModels.filter((model) => model.id !== modelId),
      customModelId: settings.customModelId === modelId ? '' : settings.customModelId,
    });
  };

  const handleSelectProvider = (providerId: string) => {
    const provider = settings.providerTemplates.find((template) => template.id === providerId);
    if (!provider) return;

    updateSettings({
      selectedProviderId: providerId,
      selectedModelId: provider.models[0]?.id || '',
      apiBaseUrl: provider.apiBaseUrl,
      apiKey: provider.apiKey || '',
      customModelId: provider.models[0]?.id || settings.customModelId,
    });
  };

  const handleSelectModel = (modelId: string) => {
    updateSettings({
      selectedModelId: modelId,
      customModelId: modelId,
    });
  };

  const handleSaveNewTemplate = () => {
    if (!newTemplate.name || !newTemplate.apiBaseUrl) {
      alert('Please fill in the provider name and API base URL');
      return;
    }

    const template: ProviderTemplate = {
      id: `provider_${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description || '',
      apiBaseUrl: newTemplate.apiBaseUrl,
      apiKey: newTemplate.apiKey || '',
      models: newTemplate.models || [],
    };

    updateSettings({
      providerTemplates: [...settings.providerTemplates, template],
      selectedProviderId: template.id,
      selectedModelId: '',
      apiBaseUrl: template.apiBaseUrl,
      apiKey: template.apiKey || '',
    });

    setNewTemplate({ name: '', description: '', apiBaseUrl: '', apiKey: '', models: [] });
    setShowNewTemplateForm(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = settings.providerTemplates.find((existingTemplate) => existingTemplate.id === templateId);
    if (template?.isDefault) {
      alert('Cannot delete the default Pollinations template');
      return;
    }
    if (!confirm('Are you sure you want to delete this provider template?')) return;

    const updatedTemplates = settings.providerTemplates.filter((existingTemplate) => existingTemplate.id !== templateId);
    const fallbackProvider = updatedTemplates[0];

    updateSettings({
      providerTemplates: updatedTemplates,
      selectedProviderId: settings.selectedProviderId === templateId
        ? fallbackProvider?.id
        : settings.selectedProviderId,
      selectedModelId: settings.selectedProviderId === templateId
        ? fallbackProvider?.models?.[0]?.id || ''
        : settings.selectedModelId,
      apiBaseUrl: settings.selectedProviderId === templateId
        ? fallbackProvider?.apiBaseUrl || settings.apiBaseUrl
        : settings.apiBaseUrl,
      apiKey: settings.selectedProviderId === templateId
        ? fallbackProvider?.apiKey || ''
        : settings.apiKey,
    });
  };

  const handleAddModelToTemplate = (templateId: string) => {
    if (!newModel.id || !newModel.name) {
      alert('Please fill in the model ID and name');
      return;
    }

    const targetTemplate = settings.providerTemplates.find((template) => template.id === templateId);
    if (targetTemplate?.models.some((model) => model.id === newModel.id)) {
      alert('This model ID already exists in the selected provider');
      return;
    }

    const updatedTemplates = settings.providerTemplates.map((template) => {
      if (template.id !== templateId) return template;
      return {
        ...template,
        models: [
          ...template.models,
          {
            id: newModel.id!,
            name: newModel.name!,
            description: newModel.description,
          },
        ],
      };
    });

    const selectedTemplate = updatedTemplates.find((template) => template.id === settings.selectedProviderId);

    updateSettings({
      providerTemplates: updatedTemplates,
      selectedModelId: settings.selectedProviderId === templateId
        ? newModel.id
        : settings.selectedModelId,
      customModelId: settings.selectedProviderId === templateId
        ? newModel.id!
        : settings.customModelId,
      apiBaseUrl: selectedTemplate?.apiBaseUrl || settings.apiBaseUrl,
      apiKey: selectedTemplate?.apiKey ?? settings.apiKey,
    });

    setNewModel({ id: '', name: '', description: '' });
  };

  const handleRemoveModelFromTemplate = (templateId: string, modelId: string) => {
    const updatedTemplates = settings.providerTemplates.map((template) => {
      if (template.id !== templateId) return template;
      return {
        ...template,
        models: template.models.filter((model) => model.id !== modelId),
      };
    });

    const selectedTemplate = updatedTemplates.find((template) => template.id === settings.selectedProviderId);

    updateSettings({
      providerTemplates: updatedTemplates,
      selectedModelId: settings.selectedModelId === modelId
        ? selectedTemplate?.models?.[0]?.id || ''
        : settings.selectedModelId,
      customModelId: settings.customModelId === modelId
        ? selectedTemplate?.models?.[0]?.id || ''
        : settings.customModelId,
    });
  };

  const localPassedModels = settings.localModels.filter((model) => model.testStatus === 'passed');
  const selectedMarkdownType = getMarkdownTypeById(settings.selectedMarkdownTypeId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <SettingsIcon className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-100">Settings</h2>
              <p className="text-[11px] text-zinc-500">Configure models, providers, and markdown response styles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-white/5 px-6">
          {(['connection', 'providers', 'models', 'upload'] as Tab[]).map((tab) => (
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

        <div className="max-h-[520px] overflow-y-auto p-6">
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[13px] font-medium text-zinc-200">
                    <Zap className="h-4 w-4 text-violet-400" /> Provider Templates
                  </label>
                  <button
                    onClick={() => setShowNewTemplateForm(!showNewTemplateForm)}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-violet-500"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Template
                  </button>
                </div>

                {showNewTemplateForm && (
                  <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-zinc-300">Provider Name</label>
                      <input
                        type="text"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., My Custom Provider"
                        className="w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-zinc-300">API Base URL</label>
                      <input
                        type="text"
                        value={newTemplate.apiBaseUrl}
                        onChange={(e) => setNewTemplate({ ...newTemplate, apiBaseUrl: e.target.value })}
                        placeholder="https://api.example.com/v1"
                        className="w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-zinc-300">API Token (optional)</label>
                      <input
                        type="password"
                        value={newTemplate.apiKey}
                        onChange={(e) => setNewTemplate({ ...newTemplate, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-zinc-300">Description</label>
                      <textarea
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        placeholder="Brief description of this provider"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveNewTemplate}
                        className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-cyan-500"
                      >
                        <Save className="h-3.5 w-3.5" /> Save Template
                      </button>
                      <button
                        onClick={() => setShowNewTemplateForm(false)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {settings.providerTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        'rounded-xl border p-4 transition',
                        settings.selectedProviderId === template.id
                          ? 'border-violet-500/30 bg-violet-500/10'
                          : 'border-white/10 bg-zinc-900/40 hover:bg-zinc-900/60'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[13px] font-semibold text-zinc-100">{template.name}</h3>
                            {template.isDefault && (
                              <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                                Default
                              </span>
                            )}
                            {settings.selectedProviderId === template.id && (
                              <Check className="h-3.5 w-3.5 text-cyan-400" />
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-400">{template.description || 'No description'}</p>
                          <p className="mt-1 text-[10px] font-mono text-zinc-500">{template.apiBaseUrl}</p>
                          <p className="mt-1.5 text-[11px] text-zinc-500">
                            {template.models.length} model{template.models.length !== 1 ? 's' : ''} available
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSelectProvider(template.id)}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10"
                            disabled={settings.selectedProviderId === template.id}
                          >
                            Select
                          </button>
                          {!template.isDefault && (
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-red-400"
                              title="Delete template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {settings.selectedProviderId === template.id && (
                        <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] text-zinc-400">Base URL</label>
                              <input
                                type="text"
                                value={template.apiBaseUrl}
                                onChange={(e) => updateProvider(template.id, { apiBaseUrl: e.target.value })}
                                className="w-full rounded-lg border border-white/10 bg-zinc-900/50 px-2.5 py-1.5 text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-zinc-400">API Token</label>
                              <input
                                type="password"
                                value={template.apiKey || ''}
                                onChange={(e) => updateProvider(template.id, { apiKey: e.target.value })}
                                placeholder="Optional"
                                className="w-full rounded-lg border border-white/10 bg-zinc-900/50 px-2.5 py-1.5 text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-zinc-400">Available Models</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Model ID"
                                value={newModel.id}
                                onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                                className="w-28 rounded-lg border border-white/10 bg-zinc-900/50 px-2 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Model Name"
                                value={newModel.name}
                                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                                className="w-32 rounded-lg border border-white/10 bg-zinc-900/50 px-2 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                              />
                              <button
                                onClick={() => handleAddModelToTemplate(template.id)}
                                className="rounded-lg bg-violet-600 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-violet-500"
                                title="Add model"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="grid max-h-44 gap-2 overflow-y-auto">
                            {template.models.length === 0 && (
                              <div className="rounded-lg border border-dashed border-white/10 bg-zinc-900/20 px-3 py-2 text-[11px] text-zinc-500">
                                No models added yet. Add model ID and model name above.
                              </div>
                            )}
                            {template.models.map((model) => (
                              <div
                                key={model.id}
                                className={cn(
                                  'flex items-start justify-between rounded-lg border px-2.5 py-2 transition',
                                  settings.selectedModelId === model.id
                                    ? 'border-cyan-500/30 bg-cyan-500/10'
                                    : 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50'
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-[12px] font-medium text-zinc-100">{model.name}</span>
                                    {settings.selectedModelId === model.id && (
                                      <Check className="h-3 w-3 shrink-0 text-cyan-400" />
                                    )}
                                  </div>
                                  <div className="truncate font-mono text-[10px] text-zinc-500">{model.id}</div>
                                  {model.description && (
                                    <div className="mt-0.5 truncate text-[10px] text-zinc-400">{model.description}</div>
                                  )}
                                </div>
                                <div className="ml-2 flex shrink-0 items-center gap-1">
                                  <button
                                    onClick={() => handleSelectModel(model.id)}
                                    className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 transition hover:bg-white/10"
                                    disabled={settings.selectedModelId === model.id}
                                  >
                                    Use
                                  </button>
                                  <button
                                    onClick={() => handleRemoveModelFromTemplate(template.id, model.id)}
                                    className="rounded p-0.5 text-zinc-500 transition hover:bg-white/5 hover:text-red-400"
                                    title="Remove model"
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-900/40 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <div className="text-[12px] leading-relaxed text-zinc-400">
                  Provider templates store your base URL, token, and model list together. Add model IDs and names per provider so agent selection stays consistent.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-6">
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
                    <Cpu className={cn('h-5 w-5', settings.connectionType === 'local' ? 'text-violet-400' : 'text-zinc-500')} />
                    <div>
                      <div className="text-[13px] font-medium text-zinc-100">Local Model</div>
                      <div className="text-[11px] text-zinc-500">Use validated GGUF / Safetensors</div>
                    </div>
                    {settings.connectionType === 'local' && <Check className="ml-auto h-4 w-4 text-cyan-400" />}
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
                    <Globe className={cn('h-5 w-5', settings.connectionType === 'openai' ? 'text-violet-400' : 'text-zinc-500')} />
                    <div>
                      <div className="text-[13px] font-medium text-zinc-100">OpenAI-compatible API</div>
                      <div className="text-[11px] text-zinc-500">Uses selected provider template</div>
                    </div>
                    {settings.connectionType === 'openai' && <Check className="ml-auto h-4 w-4 text-cyan-400" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                <div className="flex items-center gap-2 text-[12px] font-medium text-violet-100">
                  <Zap className="h-3.5 w-3.5 text-violet-400" />
                  Active Provider
                </div>
                <div className="mt-1 text-[12px] text-zinc-200">
                  {selectedProvider?.name || 'No provider selected'}
                  {selectedProvider && (
                    <span className="text-zinc-500"> • {selectedProvider.models.find((model) => model.id === settings.selectedModelId)?.name || settings.selectedModelId || 'No model selected'}</span>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('providers')}
                  className="mt-1 text-[11px] text-violet-300 transition hover:text-violet-200"
                >
                  Manage providers, tokens, and model IDs →
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <label className="mb-2 block text-[13px] font-medium text-zinc-200">AI Markdown Output Type</label>
                <select
                  value={settings.selectedMarkdownTypeId || MARKDOWN_TYPES[0].id}
                  onChange={(e) => updateSettings({ selectedMarkdownTypeId: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-[13px] text-zinc-100 focus:border-violet-500/50 focus:outline-none"
                >
                  {MARKDOWN_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] text-zinc-400">{selectedMarkdownType.description}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Includes 20 markdown styles: code markdown, API reference, checklists, tutorials, troubleshooting, release notes, SOP, timeline, and more.
                </p>
              </div>

              {settings.connectionType === 'local' && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
                  <div className="text-[12px] text-cyan-100">
                    Local model status: <span className="font-medium">{localPassedModels.length} validated</span> / {settings.localModels.length} uploaded
                  </div>
                  <div className="mt-1 text-[11px] text-cyan-200/80">
                    Upload and validate GGUF or Safetensors in the Upload tab, then assign per agent from the Agent panel.
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="text-[12px] leading-relaxed text-amber-100">
                  <span className="font-medium">Security Notice:</span> Provider tokens are stored in browser localStorage. Use trusted environments only.
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
                  {settings.localModels.map((model) => (
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
                            <div className="flex items-center gap-2 text-[11px] text-cyan-300">
                              <Check className="h-3 w-3" /> {model.testDetails || 'Validated and ready'}
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
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-zinc-900/30 py-12 transition hover:border-violet-500/30 hover:bg-zinc-900/50">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
                  <Upload className="h-6 w-6 text-violet-400" />
                </div>
                <div className="mt-3 text-[13px] font-medium text-zinc-200">Upload Model Files</div>
                <div className="mt-1 text-[11px] text-zinc-500">GGUF and Safetensors files are supported</div>
                <label className="mt-4 cursor-pointer">
                  <input
                    type="file"
                    accept=".gguf,.safetensors"
                    multiple
                    className="hidden"
                    onChange={handleModelUpload}
                    disabled={testingModel !== null}
                  />
                  <span className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {testingModel ? 'Processing...' : 'Select Files'}
                  </span>
                </label>
              </div>

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

              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-900/40 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <div className="text-[12px] leading-relaxed text-zinc-400">
                  Uploaded models are validated immediately. Use the Models tab to confirm pass/fail state, then assign validated models to agents.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
          <div className="text-[11px] text-zinc-500">Settings are saved automatically to localStorage</div>
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
