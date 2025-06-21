-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Declare expected JWT claim setting to avoid errors in policies
ALTER DATABASE notes SET request.jwt.claim.user_id TO '00000000-0000-0000-0000-000000000000';

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the anonymous web role
CREATE ROLE web_anon NOLOGIN;

-- Grant minimal access
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT ON users, notes TO web_anon;
GRANT INSERT, UPDATE, DELETE ON notes TO web_anon;

-- Enable row-level security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Allow users to only access their own notes
CREATE POLICY user_select_notes ON notes
  FOR SELECT USING (user_id::text = current_setting('request.jwt.claim.user_id', true));

CREATE POLICY user_modify_notes ON notes
  FOR ALL USING (user_id::text = current_setting('request.jwt.claim.user_id', true))
  WITH CHECK (user_id::text = current_setting('request.jwt.claim.user_id', true));
