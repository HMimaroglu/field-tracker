-- Field Tracker Database Initialization Script
-- This script will be run when the PostgreSQL container starts

-- Create the main database user if not exists
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'field_tracker') THEN
      CREATE USER field_tracker WITH ENCRYPTED PASSWORD 'secure_password_123';
   END IF;
END
$$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE field_tracker TO field_tracker;

-- Connect to the field_tracker database
\c field_tracker;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO field_tracker;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO field_tracker;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO field_tracker;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO field_tracker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO field_tracker;