import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { AI_ACTION_TOOLS, executeAiAction } from '@/lib/ai/actions';

type ChatProvider = 'openai' | 'openrouter' | 'ollama-cloud';
type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  orgId?: string;
  provider?: ChatProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  messages?: ChatMessage[];
}

interface ToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ProviderResponse {
  content: string;
  toolCalls: ToolCall[];
  assistantMessage: Record<string, unknown>;
}

const PROVIDER_DEFAULTS: Record<ChatProvider, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
  },
  'ollama-cloud': {
    baseUrl: 'https://ollama.com/api',
    model: 'gpt-oss:120b-cloud',
  },
};

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function ollamaChatUrl(baseUrl: string) {
  return baseUrl.endsWith('/api') ? `${baseUrl}/chat` : `${baseUrl}/api/chat`;
}

function isAllowedBaseUrl(provider: ChatProvider, value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;

    if (provider === 'openai') return url.hostname === 'api.openai.com';
    if (provider === 'openrouter') return url.hostname === 'openrouter.ai' || url.hostname.endsWith('.openrouter.ai');
    if (provider === 'ollama-cloud') return url.hostname === 'ollama.com' || url.hostname.endsWith('.ollama.com');
    return false;
  } catch {
    return false;
  }
}

function isChatProvider(value: unknown): value is ChatProvider {
  return value === 'openai' || value === 'openrouter' || value === 'ollama-cloud';
}

function normalizeMessages(messages: ChatMessage[] | undefined, systemPrompt: string | undefined) {
  const safeMessages = (messages ?? [])
    .filter((message) => ['system', 'user', 'assistant'].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content ?? '').trim(),
    }))
    .filter((message) => message.content.length > 0);

  const prompt = systemPrompt?.trim();
  if (!prompt) return safeMessages;

  return [{ role: 'system' as const, content: prompt }, ...safeMessages.filter((message) => message.role !== 'system')];
}

async function readProviderError(response: Response) {
  try {
    const data = (await response.json()) as { error?: { message?: string }; message?: string };
    return data.error?.message ?? data.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function callProvider({
  provider,
  baseUrl,
  model,
  apiKey,
  messages,
  includeTools,
  origin,
}: {
  provider: ChatProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  messages: unknown[];
  includeTools: boolean;
  origin: string | null;
}): Promise<ProviderResponse> {
  if (provider === 'ollama-cloud') {
    const response = await fetch(ollamaChatUrl(baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream: false, ...(includeTools ? { tools: AI_ACTION_TOOLS } : {}) }),
    });
    if (!response.ok) throw new Error(await readProviderError(response));
    const data = (await response.json()) as { message?: { content?: string; tool_calls?: ToolCall[] } };
    const message = data.message ?? {};
    return {
      content: message.content ?? '',
      toolCalls: message.tool_calls ?? [],
      assistantMessage: { role: 'assistant', ...message },
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = origin ?? 'http://localhost:3000';
    headers['X-Title'] = 'HHS Core 2';
  }
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.7, ...(includeTools ? { tools: AI_ACTION_TOOLS, tool_choice: 'auto' } : {}) }),
  });
  if (!response.ok) throw new Error(await readProviderError(response));
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string; tool_calls?: ToolCall[] } }> };
  const message = data.choices?.[0]?.message ?? {};
  return {
    content: message.content ?? '',
    toolCalls: message.tool_calls ?? [],
    assistantMessage: { role: 'assistant', ...message },
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) return Response.json({ error: 'Supabase is not configured.' }, { status: 503 });

  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: 'Invalid chat request.' }, { status: 400 });
  }

  if (!isChatProvider(body.provider)) {
    return Response.json({ error: 'Choose a valid chat provider.' }, { status: 400 });
  }

  const orgId = body.orgId?.trim();
  if (!orgId) return Response.json({ error: 'A workspace is required for chat actions.' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const defaults = PROVIDER_DEFAULTS[body.provider];
  const model = body.model?.trim() || defaults.model;
  const baseUrl = cleanBaseUrl(body.baseUrl?.trim() || defaults.baseUrl);
  const messages = normalizeMessages(body.messages, body.systemPrompt);

  if (!isAllowedBaseUrl(body.provider, baseUrl)) {
    return Response.json({ error: 'The selected provider URL is not allowed.' }, { status: 400 });
  }

  if (model.length > 160 || messages.some((message) => message.content.length > 12000) || messages.length > 50) {
    return Response.json({ error: 'Chat request is too large.' }, { status: 413 });
  }

  if (messages.length === 0) {
    return Response.json({ error: 'Send a message before calling the model.' }, { status: 400 });
  }

  if (
    (body.provider === 'openai' || body.provider === 'openrouter' || body.provider === 'ollama-cloud') &&
    !body.apiKey?.trim()
  ) {
    return Response.json({ error: 'Add an API key for the selected provider.' }, { status: 400 });
  }

  try {
    const firstResponse = await callProvider({
      provider: body.provider,
      baseUrl,
      model,
      apiKey: body.apiKey!.trim(),
      messages,
      includeTools: true,
      origin: request.headers.get('origin'),
    });

    if (firstResponse.toolCalls.length === 0) return Response.json({ content: firstResponse.content });

    const toolMessages = [firstResponse.assistantMessage];
    const actionResults = [];
    for (const toolCall of firstResponse.toolCalls.slice(0, 4)) {
      const actionName = toolCall.function?.name;
      let result: unknown;
      try {
        result = await executeAiAction({
          supabase,
          userId: user.id,
          orgId,
          name: actionName ?? '',
          args: JSON.parse(toolCall.function?.arguments ?? '{}'),
        });
      } catch (error) {
        result = { error: error instanceof Error ? error.message : 'Action failed.' };
      }
      actionResults.push(result);
      if (body.provider === 'ollama-cloud') {
        toolMessages.push({ role: 'tool', content: JSON.stringify(result) });
      } else {
        toolMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    }

    const finalResponse = await callProvider({
      provider: body.provider,
      baseUrl,
      model,
      apiKey: body.apiKey!.trim(),
      messages: [...messages, ...toolMessages],
      includeTools: false,
      origin: request.headers.get('origin'),
    });
    return Response.json({ content: finalResponse.content || 'Action completed.', actions: actionResults });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to complete chat request.' }, { status: 502 });
  }
}
