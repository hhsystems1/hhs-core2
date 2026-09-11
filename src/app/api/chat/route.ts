type ChatProvider = 'openai' | 'openrouter' | 'ollama-local' | 'ollama-cloud';
type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  provider?: ChatProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  messages?: ChatMessage[];
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
  'ollama-local': {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
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

function isChatProvider(value: unknown): value is ChatProvider {
  return value === 'openai' || value === 'openrouter' || value === 'ollama-local' || value === 'ollama-cloud';
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

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: 'Invalid chat request.' }, { status: 400 });
  }

  if (!isChatProvider(body.provider)) {
    return Response.json({ error: 'Choose a valid chat provider.' }, { status: 400 });
  }

  const defaults = PROVIDER_DEFAULTS[body.provider];
  const model = body.model?.trim() || defaults.model;
  const baseUrl = cleanBaseUrl(body.baseUrl?.trim() || defaults.baseUrl);
  const messages = normalizeMessages(body.messages, body.systemPrompt);

  if (messages.length === 0) {
    return Response.json({ error: 'Send a message before calling the model.' }, { status: 400 });
  }

  if (
    (body.provider === 'openai' || body.provider === 'openrouter' || body.provider === 'ollama-cloud') &&
    !body.apiKey?.trim()
  ) {
    return Response.json({ error: 'Add an API key for the selected provider.' }, { status: 400 });
  }

  if (body.provider === 'ollama-local' || body.provider === 'ollama-cloud') {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (body.provider === 'ollama-cloud') {
      headers.Authorization = `Bearer ${body.apiKey?.trim()}`;
    }

    const response = await fetch(ollamaChatUrl(baseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      return Response.json({ error: await readProviderError(response) }, { status: response.status });
    }

    const data = (await response.json()) as { message?: { content?: string }; response?: string };
    return Response.json({ content: data.message?.content ?? data.response ?? '' });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${body.apiKey?.trim()}`,
  };

  if (body.provider === 'openrouter') {
    headers['HTTP-Referer'] = request.headers.get('origin') ?? 'http://localhost:3000';
    headers['X-Title'] = 'HHS Core 2';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return Response.json({ error: await readProviderError(response) }, { status: response.status });
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return Response.json({ content: data.choices?.[0]?.message?.content ?? '' });
}
