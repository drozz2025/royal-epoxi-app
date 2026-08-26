create or replace function public.has_role(required_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id=auth.uid() and active=true and (role='ADMIN' or role=required_role));
$$;

-- Replace broad policies with role-aware write permissions.
drop policy if exists "authenticated users can create clients" on clients;
drop policy if exists "authenticated users can update clients" on clients;
drop policy if exists "authenticated users can create materials" on materials;
drop policy if exists "authenticated users can update materials" on materials;
drop policy if exists "authenticated users can create quotes" on quotes;
drop policy if exists "authenticated users can update quotes" on quotes;
drop policy if exists "authenticated users can create projects" on projects;
drop policy if exists "authenticated users can update projects" on projects;
create policy "authorized create clients" on clients for insert to authenticated with check (has_role('ORCAMENTISTA'));
create policy "authorized update clients" on clients for update to authenticated using (has_role('ORCAMENTISTA')) with check (has_role('ORCAMENTISTA'));
create policy "authorized create materials" on materials for insert to authenticated with check (has_role('ORCAMENTISTA'));
create policy "authorized update materials" on materials for update to authenticated using (has_role('ORCAMENTISTA')) with check (has_role('ORCAMENTISTA'));
create policy "authorized create quotes" on quotes for insert to authenticated with check (has_role('ORCAMENTISTA'));
create policy "authorized update quotes" on quotes for update to authenticated using (has_role('ORCAMENTISTA')) with check (has_role('ORCAMENTISTA'));
create policy "authorized create projects" on projects for insert to authenticated with check (has_role('ORCAMENTISTA') or has_role('OBRA'));
create policy "authorized update projects" on projects for update to authenticated using (has_role('ORCAMENTISTA') or has_role('OBRA')) with check (has_role('ORCAMENTISTA') or has_role('OBRA'));
