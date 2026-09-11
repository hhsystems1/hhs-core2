import { createClient } from '@/lib/supabase/server';

interface RunRequestBody {
  orgId?: string;
  mapId?: string;
  instructions?: string;
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: RunRequestBody;

  try {
    body = (await request.json()) as RunRequestBody;
  } catch {
    return badRequest('Invalid run request.');
  }

  const orgId = body.orgId?.trim();
  const mapId = body.mapId?.trim();

  if (!orgId || !mapId) return badRequest('A workspace and mission map are required.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: map, error: mapError } = await supabase
    .from('mission_maps')
    .select('id, org_id, name')
    .eq('org_id', orgId)
    .eq('id', mapId)
    .single();

  if (mapError || !map) {
    return Response.json({ error: 'Mission map not found.' }, { status: 404 });
  }

  const { data: run, error: runError } = await supabase
    .from('mission_runs')
    .insert({
      org_id: orgId,
      map_id: mapId,
      status: 'queued',
      trigger: 'manual',
      input: { instructions: body.instructions?.trim() ?? '' },
      requested_by: user.id,
    })
    .select('*')
    .single();

  if (runError || !run) {
    return Response.json({ error: runError?.message ?? 'Unable to queue mission run.' }, { status: 500 });
  }

  const { data: runnerNodes } = await supabase
    .from('mission_nodes')
    .select('id, label, type, data')
    .eq('org_id', orgId)
    .eq('map_id', mapId)
    .in('type', ['agent', 'automation']);

  if (runnerNodes && runnerNodes.length > 0) {
    const { error: nodeRunError } = await supabase.from('mission_node_runs').insert(
      runnerNodes.map((node) => ({
        run_id: run.id,
        org_id: orgId,
        map_id: mapId,
        node_id: node.id,
        status: 'queued',
        input: {
          label: node.label,
          type: node.type,
          config: node.data ?? {},
          instructions: body.instructions?.trim() ?? '',
        },
      }))
    );

    if (nodeRunError) {
      await supabase.from('mission_runs').update({ status: 'failed', error: nodeRunError.message }).eq('id', run.id);
      return Response.json({ error: nodeRunError.message }, { status: 500 });
    }
  }

  return Response.json({
    run: {
      id: run.id,
      mapId: run.map_id,
      status: run.status,
      trigger: run.trigger,
      createdAt: run.created_at,
      error: run.error,
    },
    queuedNodes: runnerNodes?.length ?? 0,
  });
}
