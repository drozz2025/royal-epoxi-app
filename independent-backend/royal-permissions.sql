GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user(),public.is_admin(),public.can_write(public.app_role[]),public.has_role(uuid,public.app_role),public.next_doc_number(text,boolean,integer),public.recalc_invoice_estado(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_profile_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND(NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.email IS DISTINCT FROM OLD.email OR NEW.ativo IS DISTINCT FROM OLD.ativo OR NEW.motivo_rejeicao IS DISTINCT FROM OLD.motivo_rejeicao OR NEW.rejeitado_em IS DISTINCT FROM OLD.rejeitado_em) THEN RAISE EXCEPTION 'Profile authorization fields require administrator' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER royal_protect_profile_identity BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();
DROP POLICY profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK((user_id=auth.uid() AND ativo=false) OR public.is_admin());
CREATE OR REPLACE FUNCTION independent_auth.create_employee_profile(_user uuid,_name text,_email text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(user_id,nome,email,ativo) VALUES(_user,_name,_email,false) ON CONFLICT(user_id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,role) VALUES(_user,'FUNCIONARIO') ON CONFLICT DO NOTHING;
 INSERT INTO public.notifications(titulo,mensagem,tipo,link) VALUES('Novo utilizador aguarda aprovação',_name||' ('||_email||') registou-se e aguarda aprovação.','info','/funcionarios');
END $$;
REVOKE ALL ON FUNCTION independent_auth.create_employee_profile(uuid,text,text) FROM PUBLIC,authenticated;
REVOKE ALL ON SCHEMA independent_auth FROM PUBLIC,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA independent_auth FROM PUBLIC,authenticated;
DO $$ BEGIN
 IF(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity)<>32 THEN RAISE EXCEPTION 'Royal schema must have exactly 32 RLS-protected public tables'; END IF;
END $$;
