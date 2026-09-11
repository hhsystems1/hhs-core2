const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pollMs = Number(process.env.MISSION_RUNNER_POLL_MS ?? 5000);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const restUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1`;
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function request(path, init = {}) {
  const response = await fetch(`${restUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function nextQueuedNodeRun() {
  const rows = await request(
    '/mission_node_runs?status=eq.queued&select=*,mission_nodes(label,type,data),mission_runs(input)&order=created_at.asc&limit=1'
  );
  return rows?.[0] ?? null;
}

function cleanBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function ollamaChatUrl(baseUrl) {
  return baseUrl.endsWith('/api') ? `${baseUrl}/chat` : `${baseUrl}/api/chat`;
}

async function defaultProviderConfig(orgId) {
  const rows = await request(
    `/agent_provider_configs?org_id=eq.${orgId}&is_default=eq.true&select=*&limit=1`
  );
  return rows?.[0] ?? null;
}

async function readProviderError(response) {
  try {
    const data = await response.json();
    return data?.error?.message ?? data?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function callAgentProvider(config, nodeRun) {
  const node = nodeRun.mission_nodes;
  const run = nodeRun.mission_runs;
  const nodeConfig = node?.data ?? {};
  const systemPrompt = nodeConfig.systemPrompt || config.system_prompt;
  const instructions = run?.input?.instructions || nodeRun.input?.instructions || '';
  const model = nodeConfig.model || config.model;
  const baseUrl = cleanBaseUrl(nodeConfig.baseUrl || config.base_url);
  const apiKey = nodeConfig.apiKey || config.api_key;
  const messages = [
    { role: 'system', content: String(systemPrompt) },
    {
      role: 'user',
      content: [
        `Workflow instructions: ${instructions}`,
        `Node label: ${node?.label ?? 'Unnamed node'}`,
        `Node type: ${node?.type ?? 'unknown'}`,
        `Node config JSON: ${JSON.stringify(nodeConfig)}`,
      ].join('\n'),
    },
  ];

  if (config.provider === 'ollama-local' || config.provider === 'ollama-cloud') {
    const headers = { 'Content-Type': 'application/json' };
    if (config.provider === 'ollama-cloud') headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetch(ollamaChatUrl(baseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, stream: false }),
    });
    if (!response.ok) throw new Error(await readProviderError(response));
    const data = await response.json();
    return data?.message?.content ?? data?.response ?? '';
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'HHS Core 2 Mission Runner';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });
  if (!response.ok) throw new Error(await readProviderError(response));
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function patchNodeRun(id, patch) {
  const rows = await request(`/mission_node_runs?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return rows?.[0] ?? null;
}

async function refreshParentRun(runId) {
  const children = await request(`/mission_node_runs?run_id=eq.${runId}&select=status`);
  const statuses = children.map((child) => child.status);
  const complete = statuses.length > 0 && statuses.every((status) => status === 'completed' || status === 'skipped');
  const failed = statuses.some((status) => status === 'failed');

  if (failed) {
    await request(`/mission_runs?id=eq.${runId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'failed', completed_at: new Date().toISOString() }),
    });
  } else if (complete) {
    await request(`/mission_runs?id=eq.${runId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
    });
  } else {
    await request(`/mission_runs?id=eq.${runId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'running', started_at: new Date().toISOString() }),
    });
  }
}

async function processNodeRun(nodeRun) {
  await patchNodeRun(nodeRun.id, { status: 'running', started_at: new Date().toISOString() });
  await request(`/mission_runs?id=eq.${nodeRun.run_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'running', started_at: new Date().toISOString() }),
  });

  const node = nodeRun.mission_nodes;
  const run = nodeRun.mission_runs;
  const config = await defaultProviderConfig(nodeRun.org_id);

  if (!config) {
    throw new Error('No default agent provider is configured for this workspace.');
  }

  const content = await callAgentProvider(config, nodeRun);
  const output = {
    message: content || `Provider returned an empty response for ${node?.label ?? 'node'}.`,
    provider: config.provider,
    model: config.model,
    instructions: run?.input?.instructions ?? '',
    nodeConfig: node?.data ?? {},
  };

  await patchNodeRun(nodeRun.id, {
    status: 'completed',
    output,
    completed_at: new Date().toISOString(),
  });
  await refreshParentRun(nodeRun.run_id);
}

async function tick() {
  const nodeRun = await nextQueuedNodeRun();
  if (!nodeRun) return;

  try {
    await processNodeRun(nodeRun);
    console.log(`Completed node run ${nodeRun.id}`);
  } catch (error) {
    console.error(`Failed node run ${nodeRun.id}`, error);
    await patchNodeRun(nodeRun.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown runner error',
      completed_at: new Date().toISOString(),
    });
    await refreshParentRun(nodeRun.run_id);
  }
}

console.log(`Mission runner polling every ${pollMs}ms`);
setInterval(() => {
  tick().catch((error) => console.error('Mission runner tick failed', error));
}, pollMs);
tick().catch((error) => console.error('Mission runner startup tick failed', error));
