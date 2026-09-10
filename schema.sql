-- ==========================================
-- HHS-CORE2 DATABASE SCHEMA
-- ==========================================

-- 1. CRM CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    status TEXT CHECK (status IN ('lead', 'client', 'partner')),
    stage TEXT CHECK (stage IN ('discovery', 'proposal', 'negotiation', 'closed')),
    last_contacted DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MISSION NODES (For the Interactive Graph)
CREATE TABLE IF NOT EXISTS mission_nodes (
    id TEXT PRIMARY KEY, -- using TEXT because IDs are often semantic (e.g., 'hhs-core')
    type TEXT NOT NULL, -- 'company', 'contact', 'lead', 'project', etc.
    label TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'pending', 'completed', 'alert')),
    data JSONB DEFAULT '{}'::jsonb,
    position_x FLOAT NOT NULL DEFAULT 0,
    position_y FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MISSION EDGES (Relationships)
CREATE TABLE IF NOT EXISTS mission_edges (
    id TEXT PRIMARY KEY,
    source TEXT REFERENCES mission_nodes(id) ON DELETE CASCADE,
    target TEXT REFERENCES mission_nodes(id) ON DELETE CASCADE,
    label TEXT,
    relationship TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'on_hold', 'completed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date DATE,
    assignee TEXT NOT NULL, -- 'Admin' or 'Steph'
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- AUTOMATION: UPDATE updated_at TIMESTAMP
-- ==========================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_modtime BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_nodes_modtime BEFORE UPDATE ON mission_nodes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==========================================
-- INITIAL SEED DATA (From your Mock Stores)
-- ==========================================

-- Seed Contacts
INSERT INTO contacts (name, email, phone, company, status, stage, last_contacted)
VALUES 
('John Doe', 'john@acme.com', '555-0101', 'Acme Corp', 'client', 'closed', '2026-09-01'),
('Jane Smith', 'jane@globex.com', '555-0102', 'Globex', 'lead', 'discovery', '2026-08-28');

-- Seed Mission Nodes
INSERT INTO mission_nodes (id, type, label, status, position_x, position_y)
VALUES 
('hhs-core', 'system', 'HHS Core', 'active', 0, 0),
('agent-1', 'agent', 'Orchestrator', 'active', 200, -100),
('proj-1', 'project', 'Storefront Build', 'active', 200, 100),
('comp-1', 'company', 'Acme Corp', 'active', 400, 100);

-- Seed Mission Edges
INSERT INTO mission_edges (id, source, target, relationship)
VALUES 
('e1', 'hhs-core', 'agent-1', 'manages'),
('e2', 'hhs-core', 'proj-1', 'tracks'),
('e3', 'proj-1', 'comp-1', 'client');

-- Seed Projects
INSERT INTO projects (name, status, progress)
VALUES 
('Storefront Launch', 'active', 65);
