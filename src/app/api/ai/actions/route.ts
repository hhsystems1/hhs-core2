import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { executeAiAction } from '@/lib/ai/actions';

export async function POST(request: Request) {
  if (!isSupabaseConfigured) return Response.json({ error: 'Supabase is not configured.' }, { status: 503 });

  let body: { orgId?: string; action?: string; args?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid action request.' }, { status: 400 });
  }

  const orgId = body.orgId?.trim();
  if (!orgId || !body.action) return Response.json({ error: 'A workspace and action are required.' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const result = await executeAiAction({
      supabase,
      userId: user.id,
      orgId,
      name: body.action,
      args: body.args ?? {},
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return Response.json({ error: 'The action arguments are invalid.' }, { status: 400 });
    }
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to execute action.' }, { status: 400 });
  }
}
