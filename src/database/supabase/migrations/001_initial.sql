-- Initial database schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
  subscription TEXT DEFAULT 'free' CHECK (subscription IN ('free', 'pro', 'enterprise', 'cancelled')),
  stripe_customer_id TEXT UNIQUE,
  metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT false,
  profile_image TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_subscription ON users(role, subscription);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  duration INTEGER,
  status_code INTEGER,
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);

-- Create examples table (demonstration feature)
CREATE TABLE IF NOT EXISTS examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for examples
CREATE INDEX idx_examples_user_id ON examples(user_id);
CREATE INDEX idx_examples_status ON examples(status);
CREATE INDEX idx_examples_is_public ON examples(is_public);
CREATE INDEX idx_examples_tags ON examples USING GIN(tags);
CREATE INDEX idx_examples_created_at ON examples(created_at DESC);
CREATE INDEX idx_examples_published_at ON examples(published_at DESC);
CREATE INDEX idx_examples_deleted_at ON examples(deleted_at);

-- Create full text search index for examples
CREATE INDEX idx_examples_search ON examples 
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_examples_updated_at 
  BEFORE UPDATE ON examples 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to soft delete records
CREATE OR REPLACE FUNCTION soft_delete(table_name TEXT, record_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', table_name)
  USING record_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to restore soft deleted records
CREATE OR REPLACE FUNCTION restore_deleted(table_name TEXT, record_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL', table_name)
  USING record_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create view for active users (excluding soft deleted)
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- Create view for public examples
CREATE VIEW public_examples AS
SELECT * FROM examples 
WHERE deleted_at IS NULL 
  AND is_public = true 
  AND status = 'published';

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data (unless admin)
CREATE POLICY users_read_policy ON users
  FOR SELECT
  USING (auth.uid()::TEXT = clerk_id OR EXISTS (
    SELECT 1 FROM users u WHERE u.clerk_id = auth.uid()::TEXT AND u.role = 'admin'
  ));

-- Users can only update their own data
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (auth.uid()::TEXT = clerk_id);

-- Examples read policy: public examples visible to all, private to owner only
CREATE POLICY examples_read_policy ON examples
  FOR SELECT
  USING (
    is_public = true 
    OR user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::TEXT)
    OR EXISTS (SELECT 1 FROM users WHERE clerk_id = auth.uid()::TEXT AND role = 'admin')
  );

-- Examples write policy: users can only modify their own examples
CREATE POLICY examples_write_policy ON examples
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::TEXT));

-- Audit logs: users can read their own logs, admins can read all
CREATE POLICY audit_logs_read_policy ON audit_logs
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::TEXT)
    OR EXISTS (SELECT 1 FROM users WHERE clerk_id = auth.uid()::TEXT AND role = 'admin')
  );

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
