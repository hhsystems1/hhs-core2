export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
}

export interface OrgMemberRow {
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface ContactRow {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: 'lead' | 'client' | 'partner';
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed';
  last_contacted: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  status: 'active' | 'on_hold' | 'completed';
  progress: number;
  created_at: string;
}

export interface TaskRow {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  assignee: string | null;
  created_at: string;
}

export interface MissionNodeRow {
  id: string;
  org_id: string;
  type: string;
  label: string;
  status: 'active' | 'pending' | 'completed' | 'alert';
  data: Json;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface MissionEdgeRow {
  id: string;
  org_id: string;
  source: string;
  target: string;
  relationship: string | null;
  created_at: string;
}

export interface KnowledgeDocRow {
  id: string;
  org_id: string;
  title: string;
  category: 'Standard Operating Procedures' | 'Training & Onboarding' | 'Client Wisdom' | 'Internal Wiki';
  summary: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> };
      orgs: { Row: OrgRow; Insert: Partial<OrgRow>; Update: Partial<OrgRow> };
      org_members: { Row: OrgMemberRow; Insert: Partial<OrgMemberRow>; Update: Partial<OrgMemberRow> };
      contacts: { Row: ContactRow; Insert: Partial<ContactRow>; Update: Partial<ContactRow> };
      projects: { Row: ProjectRow; Insert: Partial<ProjectRow>; Update: Partial<ProjectRow> };
      tasks: { Row: TaskRow; Insert: Partial<TaskRow>; Update: Partial<TaskRow> };
      mission_nodes: { Row: MissionNodeRow; Insert: Partial<MissionNodeRow>; Update: Partial<MissionNodeRow> };
      mission_edges: { Row: MissionEdgeRow; Insert: Partial<MissionEdgeRow>; Update: Partial<MissionEdgeRow> };
      knowledge_docs: { Row: KnowledgeDocRow; Insert: Partial<KnowledgeDocRow>; Update: Partial<KnowledgeDocRow> };
    };
  };
}
