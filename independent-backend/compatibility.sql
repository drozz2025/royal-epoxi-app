DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE plpgsql STABLE AS $$
DECLARE identity text;
BEGIN
 identity:=nullif(current_setting('request.jwt.claim.sub',true),'');
 IF identity IS NULL THEN identity:=nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'; END IF;
 IF identity IS NULL AND to_regprocedure('auth.user_id()') IS NOT NULL THEN EXECUTE 'SELECT auth.user_id()::text' INTO identity; END IF;
 RETURN identity::uuid;
END $$;
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
GRANT USAGE ON SCHEMA auth TO authenticated;
REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
