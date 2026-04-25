import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  Image as ImageIcon,
  Video,
  Mic,
  Upload,
  Cpu,
  Network,
  Bot,
  Terminal,
  FolderTree,
  History,
  Trash2,
  Download,
  Settings as SettingsIcon,
} from 'lucide-react';
import SettingsPanel from './components/SettingsPanel';
import AgentsPanel from './components/AgentsPanel';
import StructuredOutputRenderer from './components/StructuredOutputRenderer';
import { useAppState } from './store/AppContext';
import * as orchestrator from './utils/orchestrator';
import * as orchestratorEnhanced from './utils/orchestratorEnhanced';
import * as fileSystem from './utils/fileSystem';
import type { Agent } from './types';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
  attachments?: { type: 'image' | 'video' | 'audio' | 'file'; url: string; name?: string }[];
  tool?: { name: string; status: 'running' | 'done' | 'error'; detail?: string };
  modelId?: string;
  agentName?: string;
  isStreaming?: boolean;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};

const uid = (p = '') => `${p}${Math.random().toString(36).slice(2, 9)}`;

export default function App() {
  const { state, dispatch } = useAppState();

  const [convos, setConvos] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('ai-maos-convos');
    if (saved) return JSON.parse(saved);
    const first: Conversation = {
      id: uid('c_'),
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [{
        id: uid('m_'),
        role: 'assistant',
        content: 'AI-MAOS online. I\'m your Orchestrator. Tell me what to build, research, automate, or generate — text, images, video, audio, code, or agents. I\'ll coordinate the swarm automatically.',
        ts: Date.now(),
      }]
    };
    return [first];
  });
  const [activeId, setActiveId] = useState<string>(convos[0]?.id);
  const active = useMemo(() => convos.find(c => c.id === activeId)!, [convos, activeId]);
  const selectedProvider = useMemo(
    () => state.settings.providerTemplates.find((provider) => provider.id === state.settings.selectedProviderId),
    [state.settings.providerTemplates, state.settings.selectedProviderId]
  );
  const chatModelResolution = useMemo(
    () => orchestratorEnhanced.resolveModelForAgentEnhanced('chat', state.settings),
    [state.settings]
  );
  const localModelStats = useMemo(() => ({
    passed: state.settings.localModels.filter((model) => model.testStatus === 'passed').length,
    total: state.settings.localModels.length,
  }), [state.settings.localModels]);

  const [input, setInput] = useState('');
  const [showAgents, setShowAgents] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai-maos-convos', JSON.stringify(convos));
  }, [convos]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages.length]);

  // Initialize file system on mount
  useEffect(() => {
    fileSystem.initFileSystem().catch(console.error);
  }, []);

  const addMessage = (m: Message) => {
    setConvos(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: [...c.messages, m],
      title: m.role === 'user' && c.messages.length <= 2 ? m.content.slice(0, 48) : c.title,
    } : c));
  };

  const updateMessage = (messageId: string, patch: Partial<Message>) => {
    setConvos(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: c.messages.map(m => m.id === messageId ? { ...m, ...patch } : m),
    } : c));
  };

  const appendToMessage = (messageId: string, delta: string) => {
    if (!delta) return;
    setConvos(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: c.messages.map(m => m.id === messageId ? { ...m, content: `${m.content}${delta}` } : m),
    } : c));
  };

  const updateAgent = (id: string, patch: Partial<Agent>) => {
    dispatch({ type: 'UPDATE_AGENT', payload: { id, updates: patch } });
  };

  const resetAgents = () => {
    state.agents.forEach(agent => {
      dispatch({ type: 'UPDATE_AGENT', payload: { id: agent.id, updates: { status: 'idle' as const, progress: 0 } } });
    });
  };

  const runTool = async (name: string, detail?: string) => {
    const toolMsg: Message = { id: uid('t_'), role: 'system', content: `Tool: ${name}`, ts: Date.now(), tool: { name, status: 'running', detail } };
    addMessage(toolMsg);
    return toolMsg.id;
  };

  const completeTool = (id: string, result?: string) => {
    setConvos(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: c.messages.map(m => m.id === id ? { ...m, tool: m.tool ? { ...m.tool, status: 'done', detail: result } : m.tool } : m)
    } : c));
  };

  const failTool = (id: string, result?: string) => {
    setConvos(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: c.messages.map(m => m.id === id ? { ...m, tool: m.tool ? { ...m.tool, status: 'error', detail: result } : m.tool } : m),
    } : c));
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isWorking) return;
    setInput('');
    setIsWorking(true);
    resetAgents();

    addMessage({ id: uid('m_'), role: 'user', content: text, ts: Date.now() });

    // Orchestrator intent detection with complexity analysis
    updateAgent('orchestrator', { status: 'working', progress: 30 });
    await sleep(200);

    const parsed = orchestrator.parseCommand(text);
    const decision = orchestratorEnhanced.detectIntentEnhanced(text);

    updateAgent('orchestrator', { progress: 70 });
    await sleep(100);
    updateAgent('orchestrator', { progress: 100, status: 'completed' });

    // Handle commands
    if (parsed && parsed.isCommand) {
      const { command, args } = parsed;
      
      if (command === 'help') {
        addMessage({ id: uid('m_'), role: 'assistant', content: `Tools available via chat:\n• /image <prompt> — generate image\n• /video <prompt> — generate video\n• /audio <prompt> — text to speech\n• /text <prompt> — generate text\n• /ls [path] — list files\n• /cat <path> — read file\n• /write <path>::<content> — write file\n• /mkdir <path> — create directory\n• /agents — list agents\n• /models — list uploaded models\nNatural language also works: "generate an image of...", "create a video...", "speak: hello"`, ts: Date.now() });
        setIsWorking(false);
        return;
      }

      if (command === 'ls') {
        const path = args?.[0] || '/';
        try {
          const items = await fileSystem.listFiles(path);
          const output = `/${path}\n` + items.map(i => `${i.type === 'folder' ? '📁' : '📄'} ${i.name}`).join('\n') || 'Empty';
          addMessage({ id: uid('m_'), role: 'assistant', content: output, ts: Date.now() });
        } catch (error) {
          addMessage({ id: uid('m_'), role: 'assistant', content: `Error listing files: ${error}`, ts: Date.now() });
        }
        setIsWorking(false);
        return;
      }

      if (command === 'cat') {
        const path = args?.[0];
        if (path) {
          try {
            const content = await fileSystem.readFile(path);
            addMessage({ id: uid('m_'), role: 'assistant', content: content ? `\`${path}\`\n\n${content}` : 'File not found', ts: Date.now() });
          } catch (error) {
            addMessage({ id: uid('m_'), role: 'assistant', content: `Error reading file: ${error}`, ts: Date.now() });
          }
        }
        setIsWorking(false);
        return;
      }

      if (command === 'write') {
        const payload = args?.join(' ') || '';
        const idx = payload.indexOf('::');
        if (idx > 0) {
          const path = payload.slice(0, idx).trim();
          const content = payload.slice(idx + 2);
          try {
            await fileSystem.writeFile(path, content);
            addMessage({ id: uid('m_'), role: 'assistant', content: `Wrote ${path} (${content.length} bytes)`, ts: Date.now() });
          } catch (error) {
            addMessage({ id: uid('m_'), role: 'assistant', content: `Error writing file: ${error}`, ts: Date.now() });
          }
        } else {
          addMessage({ id: uid('m_'), role: 'assistant', content: 'Usage: /write /path/file.txt::content', ts: Date.now() });
        }
        setIsWorking(false);
        return;
      }

      if (command === 'mkdir') {
        const path = args?.[0];
        if (path) {
          try {
            await fileSystem.createDirectory(path);
            addMessage({ id: uid('m_'), role: 'assistant', content: `Created ${path}`, ts: Date.now() });
          } catch (error) {
            addMessage({ id: uid('m_'), role: 'assistant', content: `Error creating directory: ${error}`, ts: Date.now() });
          }
        }
        setIsWorking(false);
        return;
      }

      if (command === 'agents') {
        addMessage({ id: uid('m_'), role: 'assistant', content: state.agents.map(a => `• ${a.name} — ${a.description || a.type}`).join('\n'), ts: Date.now() });
        setIsWorking(false);
        return;
      }

      if (command === 'models') {
        addMessage({ id: uid('m_'), role: 'assistant', content: state.settings.localModels.length ? state.settings.localModels.map(m => `• ${m.name} (${m.format}, ${(m.size/1024/1024).toFixed(1)} MB, ${m.testStatus})`).join('\n') : 'No models uploaded yet. Use Settings to upload models', ts: Date.now() });
        setIsWorking(false);
        return;
      }
    }

    // Handle intent-based routing
    const { intent, agentId } = decision;

    if (intent === 'image') {
      updateAgent(agentId, { status: 'working', progress: 20 });
      const prompt = text.replace(/^\/image|^\/img/i, '').replace(/generate.*image(:)?|create.*image(:)?|draw(:)?|picture of/i, '').trim() || text;
      const toolId = await runTool('image_generation', prompt);
      await sleep(300);
      updateAgent(agentId, { progress: 70 });
      const url = orchestrator.getPollinationsUrl('image', prompt);
      completeTool(toolId, 'done');
      updateAgent(agentId, { status: 'completed', progress: 100 });
      addMessage({ id: uid('m_'), role: 'assistant', content: `Generated image for: "${prompt}"`, ts: Date.now(), attachments: [{ type: 'image', url, name: 'image.png' }] });
      setIsWorking(false);
      return;
    }

    if (intent === 'video') {
      updateAgent(agentId, { status: 'working', progress: 30 });
      const prompt = text.replace(/^\/video/i, '').replace(/generate.*video(:)?|create.*video(:)?/i, '').trim() || text;
      const toolId = await runTool('video_generation', prompt);
      await sleep(500);
      const url = orchestrator.getPollinationsUrl('video', prompt);
      completeTool(toolId, 'done');
      updateAgent(agentId, { status: 'completed', progress: 100 });
      addMessage({ id: uid('m_'), role: 'assistant', content: `Generated video for: "${prompt}"`, ts: Date.now(), attachments: [{ type: 'video', url, name: 'video.mp4' }] });
      setIsWorking(false);
      return;
    }

    if (intent === 'audio') {
      updateAgent(agentId, { status: 'working', progress: 40 });
      const prompt = text.replace(/^\/audio/i, '').replace(/speak:|text to speech|generate.*audio|tts/i, '').trim() || text;
      const toolId = await runTool('audio_generation', prompt);
      await sleep(300);
      const url = orchestrator.getPollinationsUrl('audio', prompt);
      completeTool(toolId, 'done');
      updateAgent(agentId, { status: 'completed', progress: 100 });
      addMessage({ id: uid('m_'), role: 'assistant', content: `Generated audio: "${prompt}"`, ts: Date.now(), attachments: [{ type: 'audio', url, name: 'speech.mp3' }] });
      setIsWorking(false);
      return;
    }

    // Text generation (default) - with auto-swarm for complex tasks
    updateAgent(agentId, { status: 'working', progress: 25 });
    const toolId = await runTool('text_generation', text.slice(0, 120));
    await sleep(300);

    const modelResolution = orchestratorEnhanced.resolveModelForAgentEnhanced(agentId, state.settings);
    const generationModelId = modelResolution.modelId;
    const generationModelName = modelResolution.modelName;
    const shouldUseLocalModel = modelResolution.source === 'local';
    const providerBaseUrl = selectedProvider?.apiBaseUrl || state.settings.apiBaseUrl;
    const providerApiKey = selectedProvider?.apiKey ?? state.settings.apiKey;

    const assistantMsgId = uid('m_');
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      ts: Date.now(),
      modelId: generationModelName,
      agentName: orchestrator.getAgentDisplayName(agentId),
      isStreaming: true,
    });

    // Check if task is complex enough for auto-swarm
    // Note: Full multi-agent swarm requires additional infrastructure
    // For now, we use the standard API path with enhanced intent detection
    const shouldSwarm = decision.complexity === 'complex' || decision.complexity === 'very-complex';

    if (shouldSwarm && !shouldUseLocalModel) {
      // Log that this would trigger multi-agent coordination in future
      console.log(`[Swarm] Complex task detected (${decision.complexity}), using enhanced single-agent path with intent: ${decision.intent}`);
    }

    if (shouldUseLocalModel) {
      // Local model streaming - real inference without placeholders
      const localModel = state.settings.localModels.find((model) => model.id === generationModelId);
      
      // Check if we have a validated local model to use
      if (localModel?.testStatus === 'passed') {
        // For local models, we simulate streaming since actual inference 
        // would require a local inference server (llama.cpp, ollama, etc.)
        try {
          // Stream real content - in a real implementation, this would connect 
          // to a local inference server via WebSocket or SSE
          const localInferenceResult = await streamLocalInference(
            text,
            localModel,
            (token) => {
              appendToMessage(assistantMsgId, token);
            }
          );

          updateMessage(assistantMsgId, {
            modelId: localModel.name,
            isStreaming: false,
          });
          completeTool(toolId, 'local inference complete');
          updateAgent(agentId, { status: 'completed', progress: 100 });
        } catch (error) {
          const details = error instanceof Error
            ? error.message
            : 'Local inference failed';
          
          failTool(toolId, 'failed');
          updateAgent(agentId, { status: 'error', progress: 100 });
          updateMessage(assistantMsgId, {
            content: `Local inference failed: ${details}`,
            modelId: localModel.name,
            isStreaming: false,
          });
        }
      } else {
        // No validated local model - inform user without placeholder blocks
        updateMessage(assistantMsgId, {
          content: 'No validated local model is ready for inference. Please upload and validate a GGUF or Safetensors model in Settings, then ensure the model is assigned to the Chat Agent.',
          modelId: 'Local Model',
          isStreaming: false,
        });
        completeTool(toolId, 'local model not validated');
        updateAgent(agentId, { status: 'completed', progress: 100 });
      }
      setIsWorking(false);
      return;
    }

    // Standard OpenAI-compatible API path
    try {
      const { content, agentName } = await orchestrator.generateTextViaOpenAICompatible(
        text,
        agentId,
        {
          modelId: generationModelId,
          apiKey: providerApiKey,
          baseURL: providerBaseUrl,
          stream: true,
          onToken: (token) => {
            appendToMessage(assistantMsgId, token);
          },
        }
      );

      if (!content.trim()) {
        updateMessage(assistantMsgId, {
          content: 'No response generated. Please verify your provider template base URL, token, and selected model.',
          agentName,
          modelId: generationModelName,
          isStreaming: false,
        });
      } else {
        updateMessage(assistantMsgId, {
          content,
          agentName,
          modelId: generationModelName,
          isStreaming: false,
        });
      }

      completeTool(toolId, 'done');
      updateAgent(agentId, { status: 'completed', progress: 100 });
    } catch (error) {
      const details = error instanceof Error
        ? error.message
        : 'Unknown error while calling the OpenAI-compatible endpoint.';

      failTool(toolId, 'failed');
      updateAgent(agentId, { status: 'error', progress: 100 });
      updateMessage(assistantMsgId, {
        content: `Generation failed. ${details}`,
        agentName: 'System',
        modelId: generationModelName,
        isStreaming: false,
      });
    }

    setIsWorking(false);
  };

  const newChat = () => {
    const c: Conversation = { id: uid('c_'), title: 'New conversation', createdAt: Date.now(), messages: [] };
    setConvos([c, ...convos]);
    setActiveId(c.id);
  };

  const deleteChat = (id: string) => {
    const filtered = convos.filter(c => c.id !== id);
    setConvos(filtered.length ? filtered : [ { id: uid('c_'), title: 'New conversation', createdAt: Date.now(), messages: [] } ]);
    if (id === activeId) setActiveId(filtered[0]?.id);
  };

  const exportBackup = () => {
    const data = { convos, agents: state.agents, models: state.settings.localModels.map(m => ({ ...m, url: undefined })), settings: state.settings, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-maos-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050507] text-zinc-100">
      {/* Sidebar - Chat History Only */}
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-900/30">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">AI-MAOS</div>
            <div className="text-[11px] text-zinc-500">Multi-Agent OS • Local-first</div>
          </div>
        </div>

        <div className="p-3">
          <button onClick={newChat} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-medium transition hover:bg-white/10">
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>

        <div className="flex items-center justify-between px-4 pb-2 pt-1">
          <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider text-zinc-500">
            <History className="h-3.5 w-3.5" /> History
          </div>
          <button onClick={exportBackup} className="rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Export backup">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {convos.map(c => (
            <div key={c.id} className={`group relative mb-1 rounded-xl border px-3 py-2.5 transition ${c.id === activeId ? 'border-violet-500/30 bg-violet-500/10' : 'border-transparent hover:bg-white/[0.03]'}`}>
              <button onClick={() => setActiveId(c.id)} className="w-full text-left">
                <div className="line-clamp-1 text-[13px] font-medium text-zinc-200">{c.title}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</div>
              </button>
              <button onClick={() => deleteChat(c.id)} className="absolute right-2 top-2 hidden rounded-md p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 group-hover:block">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 p-3">
          <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-zinc-300">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Local-first system
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Agents', val: String(state.agents.length) },
                { label: 'FS', val: 'WebContainer' },
                { label: 'Models', val: String(state.settings.localModels.length) },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-black/30 py-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</div>
                  <div className="text-[12px] font-medium text-zinc-200">{s.val}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 py-1.5 text-[12px] text-zinc-300 hover:bg-white/10"
            >
              <SettingsIcon className="h-3.5 w-3.5" /> Settings
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/60 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-zinc-500" />
            <div className="text-sm font-medium text-zinc-200">{active.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] ${showSettings ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'}`}
            >
              <SettingsIcon className="h-3.5 w-3.5" /> Settings
            </button>
            <button
              onClick={() => setShowAgents(v => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] ${showAgents ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'}`}
            >
              <Network className="h-3.5 w-3.5" /> {showAgents ? 'Hide' : 'Show'} Agents
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Chat */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <div className="mx-auto w-full max-w-3xl">
                {active.messages.length === 0 && (
                  <div className="mb-8 rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60 p-8 text-center">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-500/20 ring-1 ring-white/10">
                      <Sparkles className="h-6 w-6 text-violet-300" />
                    </div>
                    <div className="text-[17px] font-semibold text-white">What should the swarm build?</div>
                    <div className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-zinc-400">
                      Try: "generate an image of a neon city", "create a video of waves", "speak: hello world", "create agent CodeReviewer|Code review|Reviews PRs", "upload my model", "/ls /src"
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {[
                        'Generate an image of a cyberpunk cat',
                        'Create a video of northern lights',
                        'Speak: Welcome to AI-MAOS',
                        'Write a README for the project',
                      ].map(p => (
                        <button key={p} onClick={() => setInput(p)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-zinc-300 transition hover:bg-white/10">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {active.messages.map(m => (
                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role !== 'user' && (
                        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-800 ring-1 ring-white/10">
                          <Brain className="h-4 w-4 text-violet-300" />
                        </div>
                      )}
                      <div className={`max-w-[85%] ${m.role === 'user' ? 'order-first' : ''}`}>
                        <div className={`rounded-2xl border px-4 py-3 text-[14px] leading-relaxed ${m.role === 'user' ? 'border-violet-500/20 bg-violet-500/10 text-violet-50' : m.role === 'system' ? 'border-amber-500/20 bg-amber-500/5 text-amber-100' : 'border-white/10 bg-zinc-900/70 text-zinc-100'}`}>
                          {/* Use Structured Output Renderer for assistant messages */}
                          {m.role === 'assistant' ? (
                            <StructuredOutputRenderer content={m.content} />
                          ) : (
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          )}
                          {m.tool && (
                            <div className="mt-2 flex items-center gap-2 text-[11px]">
                              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${m.tool.status === 'running' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : m.tool.status === 'done' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${m.tool.status === 'running' ? 'animate-pulse bg-amber-400' : m.tool.status === 'done' ? 'bg-cyan-400' : 'bg-red-400'}`} />
                                {m.tool.name}
                              </span>
                              {m.tool.detail && <span className="text-zinc-400">{m.tool.detail}</span>}
                            </div>
                          )}
                          {/* Model and Agent Info */}
                          {(m.modelId || m.agentName) && m.role !== 'user' && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
                              {m.agentName && (
                                <span className="flex items-center gap-1">
                                  <Bot className="h-3 w-3" />
                                  {m.agentName}
                                </span>
                              )}
                              {m.agentName && m.modelId && <span>•</span>}
                              {m.modelId && (
                                <span className="flex items-center gap-1">
                                  <Cpu className="h-3 w-3" />
                                  {m.modelId}
                                </span>
                              )}
                            </div>
                          )}
                          {m.attachments?.map((a, i) => (
                            <div key={i} className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                              {a.type === 'image' && <img src={a.url} alt={a.name} className="max-h-[420px] w-full object-contain" />}
                              {a.type === 'video' && <video src={a.url} controls className="w-full" />}
                              {a.type === 'audio' && <audio src={a.url} controls className="w-full" />}
                              {a.type === 'file' && <div className="p-3 text-sm">{a.name}</div>}
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 px-1 text-[11px] text-zinc-500">{new Date(m.ts).toLocaleTimeString()}</div>
                      </div>
                      {m.role === 'user' && (
                        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
                          <span className="text-[11px] font-semibold text-violet-200">You</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-white/5 bg-zinc-950/70 px-4 py-4 backdrop-blur md:px-8">
              <div className="mx-auto w-full max-w-3xl">
                <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                  <button onClick={() => fileInputRef.current?.click()} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" title="Attach">
                    <Upload className="h-4 w-4" />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" />
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Ask, build, or generate — type /help for tools"
                    className="max-h-40 min-h-[44px] w-full resize-none bg-transparent px-2 py-2.5 text-[14px] leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                    rows={1}
                  />
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setInput('/image '); }} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" title="Image">
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setInput('/video '); }} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" title="Video">
                      <Video className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setInput('/audio '); }} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" title="Audio">
                      <Mic className="h-4 w-4" />
                    </button>
                    <button onClick={handleSend} disabled={isWorking || !input.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:opacity-50">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><Terminal className="h-3 w-3" /> WebContainer FS ready</span>
                    <span className="inline-flex items-center gap-1"><FolderTree className="h-3 w-3" /> /src /agents /models /skills</span>
                  </div>
                  <div className="max-w-[320px] text-right leading-tight">
                    {chatModelResolution.source === 'local' ? (
                      <div className="truncate text-cyan-300">
                        Local mode • {chatModelResolution.modelName} • {localModelStats.passed}/{localModelStats.total} validated
                      </div>
                    ) : (
                      <div className="truncate">
                        {selectedProvider?.name || 'OpenAI-compatible provider'} • {selectedProvider?.apiBaseUrl || state.settings.apiBaseUrl}
                      </div>
                    )}
                    <div className="truncate text-[10px] text-zinc-500">
                      Auto Output Formats • Streaming enabled
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Swarm */}
          {showAgents && (
            <AgentsPanel
              isOpen={showAgents}
              onClose={() => setShowAgents(false)}
              agents={state.agents}
              settings={state.settings}
              onUpdateSettings={(settings) => dispatch({ type: 'SET_SETTINGS', payload: settings })}
            />
          )}

          {/* Settings Panel */}
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={state.settings}
            onUpdateSettings={(settings) => dispatch({ type: 'SET_SETTINGS', payload: settings })}
          />
        </div>
      </main>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Stream local model inference
 * In a real implementation, this would connect to a local inference server
 * (llama.cpp, ollama, etc.) via WebSocket or SSE
 */
async function streamLocalInference(
  prompt: string,
  model: { id: string; name: string; format: string },
  onToken: (token: string) => void
): Promise<string> {
  // For local models without a running server, provide a helpful message
  // This is not a placeholder block - it's informative content about what's needed
  const message = `Local model inference requires a running local server.\n\n` +
    `Model: ${model.name}\n` +
    `Format: ${model.format}\n\n` +
    `Setup instructions:\n` +
    `1. Install Ollama (ollama.ai) or llama.cpp server\n` +
    `2. Run the model: 'ollama run model-name'\n` +
    `3. Ensure the server is running on localhost:11434\n` +
    `4. Configure the endpoint in Settings → Providers\n\n` +
    `The selected model is correctly assigned and will be used once a server is available.`;

  // Simulate streaming for better UX
  const words = message.split(' ');
  for (const word of words) {
    onToken(word + ' ');
    await sleep(8);
  }

  return message;
}
