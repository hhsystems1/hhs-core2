import { create } from 'zustand';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { OrgRow, ProfileRow } from '@/lib/supabase/types';

interface OrgBrief {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
}

interface OrgState {
  userId: string | null;
  profile: ProfileRow | null;
  orgs: OrgBrief[];
  activeOrgId: string | null;
  loading: boolean;
  booted: boolean;
  boot: () => Promise<void>;
  setActiveOrg: (orgId: string) => void;
  signOut: () => Promise<void>;
  refreshOrgs: () => Promise<void>;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  userId: null,
  profile: null,
  orgs: [],
  activeOrgId: null,
  loading: true,
  booted: false,

  boot: async () => {
    if (get().booted) return;
    set({ loading: true });

    if (!isSupabaseConfigured) {
      set({ loading: false, booted: true });
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      set({ loading: false, booted: true });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: memberships, error } = await supabase
      .from('org_members')
      .select('role, orgs(id, name)')
      .eq('user_id', user.id);

    let orgs: OrgBrief[] = [];
    if (!error && memberships) {
      orgs = memberships
        .filter((m) => m.orgs)
        .map((m) => ({
          id: (m.orgs as unknown as OrgRow).id,
          name: (m.orgs as unknown as OrgRow).name,
          role: m.role,
        }));
    }

    // Fallback: no org yet (e.g. sign-up before trigger ran) — self-onboard one.
    if (orgs.length === 0) {
      const { data: created, error: createError } = await supabase
        .from('orgs')
        .insert({ name: 'My Workspace', slug: `ws-${user.id.slice(0, 8)}`, created_by: user.id })
        .select('id, name')
        .single();

      if (!createError && created) {
        await supabase
          .from('org_members')
          .insert({ org_id: created.id, user_id: user.id, role: 'owner' });

        const { data: refreshed } = await supabase
          .from('org_members')
          .select('role, orgs(id, name)')
          .eq('user_id', user.id);

        if (refreshed) {
          orgs = refreshed
            .filter((m) => m.orgs)
            .map((m) => ({
              id: (m.orgs as unknown as OrgRow).id,
              name: (m.orgs as unknown as OrgRow).name,
              role: m.role,
            }));
        }
      }
    }

    const savedOrg = typeof window !== 'undefined' ? window.localStorage.getItem('hhs-active-org') : null;
    const activeOrgId =
      orgs.find((o) => o.id === savedOrg)?.id ?? orgs[0]?.id ?? null;

    set({
      userId: user.id,
      profile: profile ?? null,
      orgs,
      activeOrgId,
      loading: false,
      booted: true,
    });
  },

  setActiveOrg: (orgId) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('hhs-active-org', orgId);
    set({ activeOrgId: orgId });
  },

  refreshOrgs: async () => {
    const { userId } = get();
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('org_members')
      .select('role, orgs(id, name)')
      .eq('user_id', userId);
    if (!data) return;
    const orgs = data
      .filter((m) => m.orgs)
      .map((m) => ({
        id: (m.orgs as unknown as OrgRow).id,
        name: (m.orgs as unknown as OrgRow).name,
        role: m.role,
      }));
    set({ orgs });
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await createClient().auth.signOut();
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('hhs-active-org');
      window.localStorage.removeItem('hhs-demo-mode');
    }
    set({ userId: null, profile: null, orgs: [], activeOrgId: null, booted: true });
  },
}));
