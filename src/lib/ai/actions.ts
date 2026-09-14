import { z } from 'zod';
import type { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);

const actionSchemas = {
  create_lead: z.object({
    name: nonEmptyText(160),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().max(40).optional(),
    company: z.string().trim().max(160).optional(),
    stage: z.enum(['discovery', 'proposal', 'negotiation', 'closed']).default('discovery'),
  }),
  create_contact: z.object({
    name: nonEmptyText(160),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().max(40).optional(),
    company: z.string().trim().max(160).optional(),
    status: z.enum(['lead', 'client', 'partner']).default('lead'),
    stage: z.enum(['discovery', 'proposal', 'negotiation', 'closed']).default('discovery'),
  }),
  create_task: z.object({
    title: nonEmptyText(200),
    description: z.string().trim().max(4000).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    due_date: z.string().date().optional(),
    assignee: z.string().trim().max(160).optional(),
  }),
  create_project: z.object({
    name: nonEmptyText(160),
    status: z.enum(['active', 'on_hold', 'completed']).default('active'),
    progress: z.number().int().min(0).max(100).default(0),
  }),
} as const;

export type AiActionName = keyof typeof actionSchemas;

export const AI_ACTION_TOOLS = Object.entries(actionSchemas).map(([name]) => ({
  type: 'function' as const,
  function: {
    name,
    description:
      name === 'create_lead'
        ? 'Create a new lead in the current workspace CRM.'
        : name === 'create_contact'
          ? 'Create a new CRM contact in the current workspace.'
          : name === 'create_task'
            ? 'Create a task in the current workspace.'
            : 'Create a project in the current workspace.',
    parameters: schemaToJsonSchema(name),
  },
}));

function schemaToJsonSchema(name: string) {
  if (name === 'create_lead') {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Person or company contact name' },
        email: { type: 'string' },
        phone: { type: 'string' },
        company: { type: 'string' },
        stage: { type: 'string', enum: ['discovery', 'proposal', 'negotiation', 'closed'] },
      },
    };
  }
  if (name === 'create_contact') {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        company: { type: 'string' },
        status: { type: 'string', enum: ['lead', 'client', 'partner'] },
        stage: { type: 'string', enum: ['discovery', 'proposal', 'negotiation', 'closed'] },
      },
    };
  }
  if (name === 'create_task') {
    return {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        due_date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        assignee: { type: 'string' },
      },
    };
  }
  return {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string' },
      status: { type: 'string', enum: ['active', 'on_hold', 'completed'] },
      progress: { type: 'integer', minimum: 0, maximum: 100 },
    },
  };
}

export async function executeAiAction({
  supabase,
  userId,
  orgId,
  name,
  args,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  orgId: string;
  name: string;
  args: unknown;
}) {
  const schema = actionSchemas[name as AiActionName];
  if (!schema) throw new Error('Unsupported AI action.');

  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipError || !membership) throw new Error('You do not have access to this workspace.');

  const parsed = schema.parse(args);

  if (name === 'create_lead' || name === 'create_contact') {
    const input = parsed as z.infer<typeof actionSchemas.create_contact>;
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        org_id: orgId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        company: input.company || null,
        status: name === 'create_lead' ? 'lead' : input.status,
        stage: input.stage,
        last_contacted: null,
      })
      .select('id, name, email, phone, company, status, stage, last_contacted, created_at')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Unable to create CRM record.');
    return { action: name, record: data };
  }

  if (name === 'create_task') {
    const input = parsed as z.infer<typeof actionSchemas.create_task>;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        org_id: orgId,
        title: input.title,
        description: input.description || null,
        priority: input.priority,
        status: 'pending',
        due_date: input.due_date || null,
        assignee: input.assignee || null,
      })
      .select('id, title, description, priority, status, due_date, assignee, created_at')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Unable to create task.');
    return { action: name, record: data };
  }

  const input = parsed as z.infer<typeof actionSchemas.create_project>;
  const { data, error } = await supabase
    .from('projects')
    .insert({ org_id: orgId, name: input.name, status: input.status, progress: input.progress })
    .select('id, name, status, progress, created_at')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Unable to create project.');
  return { action: name, record: data };
}
