/**
 * OpenAI-Compatible API Client
 * Supports chat/completions, images/generations, and audio/speech endpoints
 * with streaming support, configurable base URL, and optional auth token.
 */

import { OpenAICompatibleApiError } from './orchestrator';

const DEFAULT_OPENAI_COMPAT_BASE_URL = 'https://api.openai.com/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  apiKey?: string;
  baseURL?: string;
  onToken?: (token: string, fullText: string) => void;
}

export interface ImageGenerationOptions {
  model?: string;
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
  apiKey?: string;
  baseURL?: string;
}

export interface ImageGenerationResult {
  url?: string;
  b64Json?: string;
  revisedPrompt?: string;
}

export interface TTSOptions {
  model?: string;
  input: string;
  voice?: string;
  speed?: number;
  apiKey?: string;
  baseURL?: string;
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

export interface TTSResult {
  audioUrl?: string;
  audioData?: Uint8Array;
  duration?: number;
}

function normalizeBaseUrl(baseURL?: string): string {
  const trimmed = (baseURL || DEFAULT_OPENAI_COMPAT_BASE_URL).trim();
  if (!trimmed) return DEFAULT_OPENAI_COMPAT_BASE_URL;
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new OpenAICompatibleApiError(
      'Invalid API base URL. Include http:// or https://',
      { isBaseUrlError: true }
    );
  }
  try {
    new URL(trimmed);
  } catch {
    throw new OpenAICompatibleApiError(
      `Invalid API base URL: ${trimmed}`,
      { isBaseUrlError: true }
    );
  }
  return trimmed.replace(/\/+$/, '');
}

function buildHeaders(apiKey?: string, stream?: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (stream) {
    headers['Accept'] = 'text/event-stream, application/json';
  }
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

function parseMaybeJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

async function toApiError(response: Response, endpoint: string, baseURL: string): Promise<OpenAICompatibleApiError> {
  const rawText = await response.text();
  const payload = parseMaybeJson(rawText);
  const apiMessage = typeof payload === 'object' && payload !== null
    ? ((payload as Record<string, unknown>).error instanceof Object && typeof ((payload as Record<string, unknown>).error as Record<string, unknown>).message === 'string'
        ? ((payload as Record<string, unknown>).error as Record<string, unknown>).message
        : typeof (payload as Record<string, unknown>).message === 'string'
        ? (payload as Record<string, unknown>).message
        : '')
    : '';

  const details = apiMessage || rawText || `HTTP ${response.status}`;

  if (response.status === 401 || response.status === 403) {
    return new OpenAICompatibleApiError(
      `Authentication failed (${response.status}). Verify your API key. ${details}`,
      { status: response.status, endpoint, isAuthError: true }
    );
  }

  if (response.status === 404) {
    return new OpenAICompatibleApiError(
      `Endpoint not found at ${endpoint}. Verify your base URL.`,
      { status: response.status, endpoint, isEndpointUnsupported: true }
    );
  }

  if (response.status === 429) {
    return new OpenAICompatibleApiError(
      `Rate limit reached (429). ${details}`,
      { status: response.status, endpoint }
    );
  }

  if (response.status >= 500) {
    return new OpenAICompatibleApiError(
      `Provider server error (${response.status}). ${details}`,
      { status: response.status, endpoint }
    );
  }

  return new OpenAICompatibleApiError(
    `Request failed (${response.status}) at ${endpoint}. ${details}`,
    { status: response.status, endpoint }
  );
}

/**
 * Chat Completions - OpenAI Compatible
 * Always uses stream: true for real-time token streaming
 */
export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<{ content: string; usage?: Record<string, number> }> {
  const { model, messages, temperature = 0.7, maxTokens = 2048, stream = true, apiKey, baseURL, onToken } = options;
  
  const normalizedBaseURL = normalizeBaseUrl(baseURL);
  const endpoint = normalizedBaseURL.endsWith('/chat/completions')
    ? normalizedBaseURL
    : `${normalizedBaseURL}/chat/completions`;
  
  const headers = buildHeaders(apiKey, stream);
  
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    throw new OpenAICompatibleApiError(
      `Unable to reach ${endpoint}. ${message}`,
      { endpoint, isBaseUrlError: true }
    );
  }

  if (!response.ok) {
    throw await toApiError(response, endpoint, normalizedBaseURL);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';

  if (stream && response.body && !contentType.includes('application/json')) {
    return await readStreamResponse(response, onToken);
  }

  const raw = await response.text();
  const payload = parseMaybeJson(raw);
  
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    // Extract content from various response formats
    if (Array.isArray(p.choices) && p.choices.length > 0) {
      const firstChoice = p.choices[0] as Record<string, unknown>;
      if (typeof firstChoice.message === 'object' && firstChoice.message !== null) {
        const msg = firstChoice.message as Record<string, unknown>;
        if (typeof msg.content === 'string') {
          return { content: msg.content, usage: p.usage as Record<string, number> };
        }
      }
      if (typeof firstChoice.text === 'string') {
        return { content: firstChoice.text, usage: p.usage as Record<string, number> };
      }
    }
    if (typeof p.output_text === 'string') {
      return { content: p.output_text, usage: p.usage as Record<string, number> };
    }
  }
  
  return { content: raw.trim() };
}

async function readStreamResponse(
  response: Response,
  onToken?: (token: string, fullText: string) => void
): Promise<{ content: string; usage?: Record<string, number> }> {
  const reader = response.body?.getReader();
  if (!reader) return { content: '' };

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]' || trimmed === '[DONE]') continue;
      if (!trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      if (!data) continue;

      const payload = parseMaybeJson(data);
      if (!payload || typeof payload !== 'object') continue;

      const p = payload as Record<string, unknown>;
      let delta = '';

      if (Array.isArray(p.choices) && p.choices.length > 0) {
        const choice = p.choices[0] as Record<string, unknown>;
        if (typeof choice.delta === 'object' && choice.delta !== null) {
          const deltaObj = choice.delta as Record<string, unknown>;
          if (typeof deltaObj.content === 'string') {
            delta = deltaObj.content;
          }
        }
      } else if (typeof p.delta === 'string') {
        delta = p.delta;
      } else if (p.type === 'response.output_text.delta' && typeof p.delta === 'string') {
        delta = p.delta;
      }

      if (delta) {
        content += delta;
        onToken?.(delta, content);
      }
    }
  }

  return { content };
}

/**
 * Image Generation - OpenAI Compatible
 * Supports DALL-E style image generation endpoints
 */
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const {
    model = 'dall-e-3',
    prompt,
    size = '1024x1024',
    quality = 'standard',
    style,
    n = 1,
    apiKey,
    baseURL,
  } = options;

  const normalizedBaseURL = normalizeBaseUrl(baseURL);
  const endpoint = `${normalizedBaseURL}/images/generations`;
  
  const headers = buildHeaders(apiKey, false);
  
  const body: Record<string, unknown> = {
    model,
    prompt,
    n,
    size,
    quality,
  };

  if (style) {
    body.style = style;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    throw new OpenAICompatibleApiError(
      `Unable to reach ${endpoint}. ${message}`,
      { endpoint, isBaseUrlError: true }
    );
  }

  if (!response.ok) {
    throw await toApiError(response, endpoint, normalizedBaseURL);
  }

  const payload = parseMaybeJson(await response.text());
  if (!payload || typeof payload !== 'object') {
    throw new OpenAICompatibleApiError(
      `Invalid response from ${endpoint}`,
      { endpoint }
    );
  }

  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.data) && p.data.length > 0) {
    const first = p.data[0] as Record<string, unknown>;
    return {
      url: typeof first.url === 'string' ? first.url : undefined,
      b64Json: typeof first.b64_json === 'string' ? first.b64_json : undefined,
      revisedPrompt: typeof first.revised_prompt === 'string' ? first.revised_prompt : undefined,
    };
  }

  throw new OpenAICompatibleApiError(
    `No image data in response from ${endpoint}`,
    { endpoint }
  );
}

/**
 * Text-to-Speech - OpenAI Compatible
 * Generates speech audio from text input
 */
export async function textToSpeech(options: TTSOptions): Promise<TTSResult> {
  const {
    model = 'tts-1',
    input,
    voice = 'alloy',
    speed = 1.0,
    apiKey,
    baseURL,
    responseFormat = 'mp3',
  } = options;

  const normalizedBaseURL = normalizeBaseUrl(baseURL);
  const endpoint = `${normalizedBaseURL}/audio/speech`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  
  const body = {
    model,
    input,
    voice,
    speed,
    response_format: responseFormat,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    throw new OpenAICompatibleApiError(
      `Unable to reach ${endpoint}. ${message}`,
      { endpoint, isBaseUrlError: true }
    );
  }

  if (!response.ok) {
    throw await toApiError(response, endpoint, normalizedBaseURL);
  }

  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    const payload = parseMaybeJson(await response.text());
    if (payload && typeof payload === 'object') {
      const p = payload as Record<string, unknown>;
      if (typeof (p).url === 'string') {
        return { audioUrl: (p).url as string };
      }
    }
    throw new OpenAICompatibleApiError(
      `Invalid audio response from ${endpoint}`,
      { endpoint }
    );
  }

  const audioData = new Uint8Array(await response.arrayBuffer());
  const audioBlob = new Blob([audioData], { type: contentType || 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(audioBlob);

  return { audioUrl, audioData };
}

/**
 * Get available models from OpenAI-compatible endpoint
 */
export async function listModels(apiKey?: string, baseURL?: string): Promise<string[]> {
  const normalizedBaseURL = normalizeBaseUrl(baseURL);
  const endpoint = `${normalizedBaseURL}/models`;
  
  const headers: Record<string, string> = {};
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'GET', headers });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const payload = parseMaybeJson(await response.text());
  if (!payload || typeof payload !== 'object') return [];

  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.data)) {
    return (p.data as Array<{ id?: string }>).map(m => m.id || '').filter(Boolean);
  }

  return [];
}

/**
 * Create blob URL from audio data for playback
 */
export function createAudioUrl(audioData: Uint8Array, mimeType = 'audio/mpeg'): string {
  const blob = new Blob([audioData], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Revoke object URL to free memory
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}
