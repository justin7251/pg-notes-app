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
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL  -- Store hashed passwords here
);

-- Securely hash a password
CREATE OR REPLACE FUNCTION hash_password(pwd TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN crypt(pwd, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify password
CREATE OR REPLACE FUNCTION verify_password(input TEXT, stored TEXT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(input, stored) = stored;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


CREATE OR REPLACE FUNCTION login(email TEXT, password TEXT) RETURNS TEXT AS $$
DECLARE
  user_row RECORD;
  token TEXT;
BEGIN
  SELECT * INTO user_row FROM users WHERE users.email = login.email;

  IF user_row IS NULL OR NOT verify_password(password, user_row.password) THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Create JWT with user_id inside
  token := encode(
    sign(
      convert_to(
        '{"user_id": "' || user_row.id || '"}', 
        'utf8'
      ),
      current_setting('app.jwt_secret')::text
    ),
    'base64'
  );

  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security on notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Define RLS policies for notes table
CREATE POLICY user_select_notes ON notes
  FOR SELECT USING (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  );

CREATE POLICY user_insert_notes ON notes
  FOR INSERT WITH CHECK (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  );

CREATE POLICY user_update_notes ON notes
  FOR UPDATE USING (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  ) WITH CHECK (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  );

CREATE POLICY user_delete_notes ON notes
  FOR DELETE USING (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  );

-- Create roles for PostgREST
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'mysecretpassword';
  END IF;
END $$;

GRANT web_anon TO authenticator;

-- Grant select/insert/update/delete on notes to web_anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO web_anon;

-- Grant select on users (if needed)
GRANT SELECT ON users TO web_anon;

-- Set JWT secret for your database (replace with a strong secret)
ALTER DATABASE current_database() SET app.jwt_secret = 'your-very-secret-jwt-key';
