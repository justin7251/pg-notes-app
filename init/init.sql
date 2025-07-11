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

-- Add columns to notes table for shipping information
ALTER TABLE notes
  ADD COLUMN is_shippable BOOLEAN DEFAULT FALSE,
  ADD COLUMN recipient_name TEXT,
  ADD COLUMN recipient_address_line1 TEXT,
  ADD COLUMN recipient_address_line2 TEXT,
  ADD COLUMN recipient_city TEXT,
  ADD COLUMN recipient_postal_code TEXT,
  ADD COLUMN recipient_country TEXT;

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

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Sender of the note
  carrier TEXT NOT NULL, -- e.g., 'ups', 'royal_mail'
  carrier_shipment_id TEXT, -- ID from the carrier's system
  tracking_number TEXT,
  label_image_url TEXT, -- URL to a printable label image
  label_data TEXT,      -- Base64 encoded label data (e.g., ZPL, PDF)
  status TEXT NOT NULL DEFAULT 'pending_creation', -- e.g., 'pending_creation', 'created', 'in_transit', 'delivered', 'error', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on shipments table
CREATE TRIGGER set_shipments_updated_at
BEFORE UPDATE ON shipments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security on shipments
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Define RLS policies for shipments table
-- Users can see their own shipments
CREATE POLICY user_select_shipments ON shipments
  FOR SELECT USING (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  );

-- Users can create shipments for their own notes
-- (Further checks might be needed in the microservice, e.g., ensuring the note is shippable)
CREATE POLICY user_insert_shipments ON shipments
  FOR INSERT WITH CHECK (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid AND
    EXISTS (SELECT 1 FROM notes n WHERE n.id = note_id AND n.user_id = current_setting('request.jwt.claim.user_id', true)::uuid)
  );

-- Users can update their own shipments (e.g., microservice might update status)
CREATE POLICY user_update_shipments ON shipments
  FOR UPDATE USING (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  ) WITH CHECK (
    user_id = current_setting('request.jwt.claim.user_id', true)::uuid
  );

-- Users cannot delete shipments directly through PostgREST for now (can be handled by microservice if needed, e.g. cancellation)
CREATE POLICY user_delete_shipments ON shipments
  FOR DELETE USING (false);


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

-- Grant permissions to web_anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO web_anon;
GRANT SELECT, INSERT, UPDATE ON shipments TO web_anon; -- No delete for now
GRANT SELECT ON users TO web_anon;

-- Set JWT secret for your database (replace with a strong secret)
ALTER DATABASE current_database() SET app.jwt_secret = 'your-very-secret-jwt-key';
