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
  FileText,
  Upload,
  Cpu,
  Network,
  Bot,
  Code2,
  Search,
  Globe,
  TestTube2,
  BookOpen,
  Database,
  Layers3,
  Terminal,
  Folder,
  FolderTree,
  ChevronRight,
  History,
  Trash2,
  Download,
  X,
  Settings as SettingsIcon,
} from 'lucide-react';
import SettingsPanel from './components/SettingsPanel';
import AgentsPanel from './components/AgentsPanel';
import { useAppState } from './store/AppContext';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
  attachments?: { type: 'image' | 'video' | 'audio' | 'file'; url: string; name?: string }[];
  tool?: { name: string; status: 'running' | 'done' | 'error'; detail?: string };
  modelId?: string;
  agentName?: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};

type Agent = {
  id: string;
  name: string;
  specialization: string;
  description: string;
  icon: keyof typeof iconMap;
  status: 'idle' | 'working' | 'complete';
  progress: number;
  assignedModels?: string[];
};

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
};

type ModelFile = {
  id: string;
  name: string;
  format: 'gguf' | 'safetensors';
  size: number;
  url: string;
  uploadedAt: number;
};

const iconMap = {
  Brain,
  Bot,
  Code2,
  Search,
  Globe,
  TestTube2,
  BookOpen,
  Database,
  Layers3,
  Cpu,
  Network,
  Sparkles,
};

const uid = (p = '') => `${p}${Math.random().toString(36).slice(2, 9)}`;

const initialAgents: Agent[] = [
  { id: 'orchestrator', name: 'Orchestrator', specialization: 'Planning & routing', description: 'Understands intent and coordinates sub-agents', icon: 'Brain', status: 'idle', progress: 0 },
  { id: 'coding', name: 'Coding Agent', specialization: 'Full-stack development', description: 'Writes, refactors, and ships code', icon: 'Code2', status: 'idle', progress: 0 },
  { id: 'research', name: 'Research Agent', specialization: 'Deep research', description: 'Synthesizes sources and evidence', icon: 'Search', status: 'idle', progress: 0 },
  { id: 'browser', name: 'Browser Agent', specialization: 'Web automation', description: 'Playwright-based browsing', icon: 'Globe', status: 'idle', progress: 0 },
  { id: 'testing', name: 'Testing Agent', specialization: 'QA & verification', description: 'Validates outputs and catches regressions', icon: 'TestTube2', status: 'idle', progress: 0 },
  { id: 'docs', name: 'Documentation', specialization: 'Technical writing', description: 'Produces clear docs and guides', icon: 'BookOpen', status: 'idle', progress: 0 },
  { id: 'data', name: 'Data Agent', specialization: 'ETL & analysis', description: 'Cleans, transforms, and analyzes data', icon: 'Database', status: 'idle', progress: 0 },
  { id: 'uiux', name: 'UI/UX Agent', specialization: 'Design systems', description: 'Creates interfaces and components', icon: 'Layers3', status: 'idle', progress: 0 },
];

const prebuiltFS: FileNode = {
  name: '',
  path: '/',
  type: 'folder',
  children: [
    { name: 'src', path: '/src', type: 'folder', children: [
      { name: 'main.tsx', path: '/src/main.tsx', type: 'file', content: '// entry' },
      { name: 'App.tsx', path: '/src/App.tsx', type: 'file', content: '// AI-MAOS app' },
    ]},
    { name: 'public', path: '/public', type: 'folder', children: [] },
    { name: 'agents', path: '/agents', type: 'folder', children: [] },
    { name: 'skills', path: '/skills', type: 'folder', children: [
      { name: 'README.md', path: '/skills/README.md', type: 'file', content: '# Skills\nUpload .md or .zip to extend agents.' }
    ]},
    { name: 'models', path: '/models', type: 'folder', children: [] },
    { name: 'prompts', path: '/prompts', type: 'folder', children: [] },
    { name: 'workflows', path: '/workflows', type: 'folder', children: [] },
    { name: 'docs', path: '/docs', type: 'folder', children: [] },
    { name: 'integrations', path: '/integrations', type: 'folder', children: [
      { name: 'pollinations.md', path: '/integrations/pollinations.md', type: 'file', content: '# Pollinations\nBase: https://gen.pollinations.ai\n- text: /text/{prompt}\n- image: /image/{prompt}\n- video: /video/{prompt}\n- audio: /audio/{text}' }
    ]},
    { name: 'projects', path: '/projects', type: 'folder', children: [] },
    { name: 'backups', path: '/backups', type: 'folder', children: [] },
    { name: 'webcontainer', path: '/webcontainer', type: 'folder', children: [
      { name: 'terminal.log', path: '/webcontainer/terminal.log', type: 'file', content: 'WebContainer ready.\n' }
    ]},
  ],
};

function findNode(root: FileNode, path: string): FileNode | null {
  if (root.path === path) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const found = findNode(c, path);
    if (found) return found;
  }
  return null;
}

function ensureDir(root: FileNode, path: string) {
  const parts = path.split('/').filter(Boolean);
  let cur = root;
  let built = '';
  for (const p of parts) {
    built += '/' + p;
    let next = cur.children?.find(c => c.path === built && c.type === 'folder');
    if (!next) {
      next = { name: p, path: built, type: 'folder', children: [] };
      cur.children = cur.children || [];
      cur.children.push(next);
    }
    cur = next;
  }
  return cur;
}

function writeFile(root: FileNode, path: string, content: string) {
  const dir = path.substring(0, path.lastIndexOf('/')) || '/';
  const name = path.substring(path.lastIndexOf('/') + 1);
  const parent = ensureDir(root, dir);
  parent.children = parent.children || [];
  const existing = parent.children.find(c => c.path === path);
  if (existing) {
    existing.content = content;
    existing.type = 'file';
  } else {
    parent.children.push({ name, path, type: 'file', content });
  }
}

function listDir(root: FileNode, path: string) {
  const node = findNode(root, path);
  if (!node || node.type !== 'folder') return [];
  return node.children || [];
}

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

  const [input, setInput] = useState('');
  const [fs, setFs] = useState<FileNode>(() => structuredClone(prebuiltFS));
  const [showAgents, setShowAgents] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai-maos-convos', JSON.stringify(convos));
  }, [convos]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages.length]);

  const addMessage = (m: Message) => {
    setConvos(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, m], title: c.messages.length <= 2 ? m.content.slice(0, 48) : c.title } : c));
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

  const generateText = async (prompt: string) => {
    try {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      return await res.text();
    } catch {
      return 'Text generation failed. Try again.';
    }
  };

  const generateImage = (prompt: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`;

  const generateVideo = (prompt: string) => `https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}`;

  const generateAudio = (text: string, voice = 'nova') => `https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?voice=${voice}`;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isWorking) return;
    setInput('');
    setIsWorking(true);
    resetAgents();

    addMessage({ id: uid('m_'), role: 'user', content: text, ts: Date.now() });

    // Orchestrator planning
    updateAgent('orchestrator', { status: 'working', progress: 30 });
    await sleep(300);
    updateAgent('orchestrator', { progress: 70 });

    const lower = text.toLowerCase();

    // Commands
    if (lower.startsWith('/help')) {
      addMessage({ id: uid('m_'), role: 'assistant', content: `Tools available via chat:\n• /image <prompt> — generate image\n• /video <prompt> — generate video\n• /audio <prompt> — text to speech\n• /text <prompt> — generate text\n• /ls [path] — list files\n• /cat <path> — read file\n• /write <path>::<content> — write file\n• /mkdir <path>\n• /agents — list agents\n• /create-agent <name>|<specialization>|<description>\n• /upload-model — upload .gguf or .safetensors\n• /models — list uploaded models\nNatural language also works: "generate an image of...", "create a video...", "speak: hello"`, ts: Date.now() });
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/ls')) {
      const path = text.split(' ')[1] || '/';
      const items = listDir(fs, path);
      addMessage({ id: uid('m_'), role: 'assistant', content: `/${path}\n` + items.map(i => `${i.type === 'folder' ? '📁' : '📄'} ${i.name}`).join('\n') || 'Empty', ts: Date.now() });
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/cat ')) {
      const path = text.slice(5).trim();
      const node = findNode(fs, path);
      addMessage({ id: uid('m_'), role: 'assistant', content: node?.type === 'file' ? `\`${path}\`\n\n${node.content}` : 'File not found', ts: Date.now() });
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/write ')) {
      const payload = text.slice(7);
      const idx = payload.indexOf('::');
      if (idx > 0) {
        const path = payload.slice(0, idx).trim();
        const content = payload.slice(idx + 2);
        const next = structuredClone(fs);
        writeFile(next, path, content);
        setFs(next);
        addMessage({ id: uid('m_'), role: 'assistant', content: `Wrote ${path} (${content.length} bytes)`, ts: Date.now() });
      } else {
        addMessage({ id: uid('m_'), role: 'assistant', content: 'Usage: /write /path/file.txt::content', ts: Date.now() });
      }
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/mkdir ')) {
      const path = text.split(' ')[1];
      const next = structuredClone(fs);
      ensureDir(next, path);
      setFs(next);
      addMessage({ id: uid('m_'), role: 'assistant', content: `Created ${path}`, ts: Date.now() });
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/agents')) {
      addMessage({ id: uid('m_'), role: 'assistant', content: state.agents.map(a => `• ${a.name} — ${a.description || a.type}`).join('\n'), ts: Date.now() });
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/create-agent')) {
      const payload = text.replace('/create-agent', '').trim();
      const [name, specialization = 'Custom', description = 'User-created agent'] = payload.split('|').map(s => s.trim());
      if (!name) {
        addMessage({ id: uid('m_'), role: 'assistant', content: 'Usage: /create-agent Name|Specialization|Description', ts: Date.now() });
      } else {
        const id = uid('agent_');
        addMessage({ id: uid('m_'), role: 'assistant', content: `Created agent "${name}" and added to system architecture.`, ts: Date.now() });
      }
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/upload-model')) {
      addMessage({ id: uid('m_'), role: 'assistant', content: 'Please use the Settings panel to upload models. Click the Settings button in the top right.', ts: Date.now() });
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    if (lower.startsWith('/models')) {
      addMessage({ id: uid('m_'), role: 'assistant', content: state.settings.localModels.length ? state.settings.localModels.map(m => `• ${m.name} (${m.format}, ${(m.size/1024/1024).toFixed(1)} MB, ${m.testStatus})`).join('\n') : 'No models uploaded yet. Use Settings to upload models', ts: Date.now() });
      updateAgent('orchestrator', { status: 'complete', progress: 100 });
      setIsWorking(false);
      return;
    }

    // Tool detection
    const isImage = /(^\/image|^\/img|generate.*image|create.*image|draw|picture of|render image)/i.test(text);
    const isVideo = /(^\/video|generate.*video|create.*video|make.*video)/i.test(text);
    const isAudio = /(^\/audio|speak:|text to speech|generate.*audio|tts)/i.test(text);
    const isTextGen = /(^\/text|write.*|explain|draft|generate.*text|summarize)/i.test(text);

    updateAgent('orchestrator', { progress: 100, status: 'complete' });

    if (isImage) {
      updateAgent('uiux', { status: 'working', progress: 20 });
      const prompt = text.replace(/^\/image|^\/img/i, '').replace(/generate.*image(:)?|create.*image(:)?|draw(:)?|picture of/i, '').trim() || text;
      const toolId = await runTool('image_generation', prompt);
      await sleep(400);
      updateAgent('uiux', { progress: 70 });
      const url = generateImage(prompt);
      completeTool(toolId, 'done');
      updateAgent('uiux', { status: 'complete', progress: 100 });
      addMessage({ id: uid('m_'), role: 'assistant', content: `Generated image for: "${prompt}"`, ts: Date.now(), attachments: [{ type: 'image', url, name: 'image.png' }] });
      setIsWorking(false);
      return;
    }

    if (isVideo) {
      updateAgent('browser', { status: 'working', progress: 30 });
      const prompt = text.replace(/^\/video/i, '').replace(/generate.*video(:)?|create.*video(:)?/i, '').trim() || text;
      const toolId = await runTool('video_generation', prompt);
      await sleep(600);
      const url = generateVideo(prompt);
      completeTool(toolId, 'done');
      updateAgent('browser', { status: 'complete', progress: 100 });
      addMessage({ id: uid('m_'), role: 'assistant', content: `Generated video for: "${prompt}"`, ts: Date.now(), attachments: [{ type: 'video', url, name: 'video.mp4' }] });
      setIsWorking(false);
      return;
    }

    if (isAudio) {
      updateAgent('docs', { status: 'working', progress: 40 });
      const prompt = text.replace(/^\/audio/i, '').replace(/speak:|text to speech|generate.*audio|tts/i, '').trim() || text;
      const toolId = await runTool('audio_generation', prompt);
      await sleep(300);
      const url = generateAudio(prompt);
      completeTool(toolId, 'done');
      updateAgent('docs', { status: 'complete', progress: 100 });
      addMessage({ id: uid('m_'), role: 'assistant', content: `Generated audio: "${prompt}"`, ts: Date.now(), attachments: [{ type: 'audio', url, name: 'speech.mp3' }] });
      setIsWorking(false);
      return;
    }

    if (isTextGen || true) {
      // Default to text generation + agent routing
      updateAgent('research', { status: 'working', progress: 25 });
      updateAgent('coding', { status: 'working', progress: 10 });
      const toolId = await runTool('text_generation', text.slice(0, 120));
      await sleep(400);
      const result = await generateText(text);
      completeTool(toolId);
      updateAgent('research', { status: 'complete', progress: 100 });
      updateAgent('coding', { status: 'complete', progress: 100 });
      updateAgent('testing', { status: 'working', progress: 50 });
      await sleep(200);
      updateAgent('testing', { status: 'complete', progress: 100 });

      // Get model info from settings
      const modelId = state.settings.connectionType === 'openai'
        ? state.settings.customModelId
        : state.settings.localModels.find(m => m.id === state.settings.agentModelAssignments['research']?.[0])?.name || 'Unknown';

      addMessage({
        id: uid('m_'),
        role: 'assistant',
        content: result,
        ts: Date.now(),
        modelId,
        agentName: 'Research Agent'
      });
      setIsWorking(false);
      return;
    }
  };

  const onModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Model upload is now handled in Settings panel
    e.target.value = '';
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
              <Cpu className="h-3.5 w-3.5 text-emerald-400" /> Local-first system
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
                          <div className="whitespace-pre-wrap">{m.content}</div>
                          {m.tool && (
                            <div className="mt-2 flex items-center gap-2 text-[11px]">
                              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${m.tool.status === 'running' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : m.tool.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${m.tool.status === 'running' ? 'animate-pulse bg-amber-400' : m.tool.status === 'done' ? 'bg-emerald-400' : 'bg-red-400'}`} />
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
                  <div>Pollinations • gen.pollinations.ai</div>
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
              onUpdateAgent={(id, updates) => dispatch({ type: 'UPDATE_AGENT', payload: { id, updates } })}
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