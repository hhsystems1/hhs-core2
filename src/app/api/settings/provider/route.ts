import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

const providerSchema = z.enum(['openai', 'openrouter', 'ollama-cloud']);
const requestSchema = z.object({
  orgId: z.string().uuid(),
  configId: z.string().uuid().nullable().optional(),
  provider: providerSchema,
  name: z.string().trim().min(1).max(120),
  baseUrl: z.string().url(),
  model: z.string().trim().min(1).max(160),
  systemPrompt: z.string().trim().min(1).max(4000),
  apiKey: z.string().trim().max(500).optional(),
});

const allowedHosts = {
  openai: 'api.openai.com',
  openrouter: 'openrouter.ai',
  'ollama-cloud': 'ollama.com',
} as const;

function validProviderUrl(provider: keyof typeof allowedHosts, value: string) {
  const url = new URL(value);
  return url.protocol === 'https:' && (url.hostname === allowedHosts[provider] || url.hostname.endsWith(`.${allowedHosts[provider]}`));
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) return Response.json({ error: 'Supabase is not configured.' }, { status: 503 });

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: 'Invalid provider settings.' }, { status: 400 });
  }

  if (!validProviderUrl(body.provider, body.baseUrl)) {
    return Response.json({ error: 'The provider URL is not allowed.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', body.orgId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return Response.json({ error: 'Only workspace owners and admins can manage provider settings.' }, { status: 403 });
  }

  if (!body.configId && !body.apiKey) {
    return Response.json({ error: 'A provider API key is required for a new configuration.' }, { status: 400 });
  }

  if (body.configId) {
    const { data: existingConfig } = await supabase
      .from('agent_provider_configs')
      .select('provider')
      .eq('id', body.configId)
      .eq('org_id', body.orgId)
      .maybeSingle();
    if (!existingConfig) return Response.json({ error: 'Provider configuration not found.' }, { status: 404 });
    if (existingConfig.provider !== body.provider && !body.apiKey) {
      return Response.json({ error: 'Enter a new API key when switching providers.' }, { status: 400 });
    }
  }

  const configPayload = {
    org_id: body.orgId,
    name: body.name,
    provider: body.provider,
    base_url: body.baseUrl.replace(/\/+$/, ''),
    model: body.model,
    system_prompt: body.systemPrompt,
    is_default: true,
  };

  const query = body.configId
    ? supabase.from('agent_provider_configs').update(configPayload).eq('id', body.configId).eq('org_id', body.orgId)
    : supabase.from('agent_provider_configs').insert(configPayload);
  const { data: config, error: configError } = await query
    .select('id, org_id, name, provider, base_url, model, system_prompt, is_default, created_at, updated_at')
    .single();

  if (configError || !config) {
    return Response.json({ error: configError?.message ?? 'Unable to save provider settings.' }, { status: 400 });
  }

  if (body.apiKey) {
    const { error: secretError } = await supabase.rpc('set_agent_provider_secret', {
      target_config_id: config.id,
      target_org_id: body.orgId,
      target_api_key: body.apiKey,
    });
    if (secretError) return Response.json({ error: secretError.message }, { status: 400 });
  }

  return Response.json({ config: { ...config, api_key: null } });
}
