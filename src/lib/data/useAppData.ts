'use client';

import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useOrgStore } from '@/lib/store/orgStore';
import { useCrmStore } from '@/lib/store/crmStore';
import { useTaskStore } from '@/lib/store/taskStore';
import { useMissionStore } from '@/lib/store/missionStore';
import { useKnowledgeStore } from '@/lib/store/knowledgeStore';

export function useAppData() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  // Track the Supabase auth session (client-side mirror of the proxy guard).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthUserId(data.session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Boot org/profile state whenever the signed-in user changes.
  useEffect(() => {
    useOrgStore.setState({ booted: false });
    useOrgStore.getState().boot();
  }, [authUserId]);

  // Load and subscribe to all datasets for the active workspace.
  useEffect(() => {
    if (!activeOrgId) return;

    useCrmStore.getState().load(activeOrgId);
    useTaskStore.getState().load(activeOrgId);
    useMissionStore.getState().load(activeOrgId);
    useKnowledgeStore.getState().load(activeOrgId);

    const unsubCrm = useCrmStore.getState().subscribe(activeOrgId);
    const unsubTasks = useTaskStore.getState().subscribe(activeOrgId);
    const unsubMission = useMissionStore.getState().subscribe(activeOrgId);
    const unsubKnowledge = useKnowledgeStore.getState().subscribe(activeOrgId);

    return () => {
      unsubCrm();
      unsubTasks();
      unsubMission();
      unsubKnowledge();
    };
  }, [activeOrgId]);

  return { authUserId, activeOrgId };
}
