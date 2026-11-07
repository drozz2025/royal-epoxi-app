-- Isolated restored snapshot only; never source production. No source sessions are imported.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM auth.users WHERE email IS NULL OR encrypted_password IS NULL OR encrypted_password !~ '^\$2[aby]\$') THEN RAISE EXCEPTION 'An identity requires a separately reviewed password migration'; END IF;
 IF EXISTS(SELECT lower(email) FROM auth.users GROUP BY lower(email) HAVING count(*)>1) THEN RAISE EXCEPTION 'Colliding source email identities'; END IF;
 IF to_regclass('auth.mfa_factors') IS NOT NULL AND EXISTS(SELECT 1 FROM auth.mfa_factors WHERE status='verified') THEN RAISE EXCEPTION 'Verified source MFA needs a separate import'; END IF;
END $$;
INSERT INTO independent_auth."user"(id,name,email,"emailVerified","createdAt","updatedAt",role,banned,"banExpires")
SELECT source.id,coalesce(profile.nome,source.raw_user_meta_data->>'nome',source.raw_user_meta_data->>'full_name',source.email),lower(source.email),source.email_confirmed_at IS NOT NULL,source.created_at,coalesce(source.updated_at,source.created_at),'user',coalesce(source.banned_until>now(),false),source.banned_until FROM auth.users source LEFT JOIN public.profiles profile ON profile.user_id=source.id ON CONFLICT(id) DO NOTHING;
INSERT INTO independent_auth.account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") SELECT id,id::text,'credential',id,encrypted_password,created_at,coalesce(updated_at,created_at) FROM auth.users ON CONFLICT(id) DO NOTHING;
COMMIT;
-- Copy public.user_roles exactly; uppercase ADMIN is never inferred from signup metadata.
