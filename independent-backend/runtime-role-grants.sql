-- Provision royal_auth_runtime and royal_data_runtime privately as separate LOGIN roles.
-- Both require NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS.
GRANT CONNECT ON DATABASE royal_epoxis TO royal_auth_runtime,royal_data_runtime;
GRANT USAGE ON SCHEMA independent_auth TO royal_auth_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA independent_auth TO royal_auth_runtime;
GRANT EXECUTE ON FUNCTION independent_auth.create_employee_profile(uuid,text,text) TO royal_auth_runtime;
GRANT authenticated TO royal_data_runtime WITH INHERIT FALSE,SET TRUE;
