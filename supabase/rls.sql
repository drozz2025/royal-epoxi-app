alter table profiles enable row level security;
alter table clients enable row level security;
alter table visits enable row level security;
alter table materials enable row level security;
alter table material_movements enable row level security;
alter table quotes enable row level security;
alter table quote_lines enable row level security;
alter table projects enable row level security;
alter table work_logs enable row level security;
alter table expenses enable row level security;
alter table cash_movements enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;

-- clients
create policy "auth read clients" on clients for select to authenticated using (true);
create policy "auth insert clients" on clients for insert to authenticated with check (true);
create policy "auth update clients" on clients for update to authenticated using (true) with check (true);

-- visits
create policy "auth read visits" on visits for select to authenticated using (true);
create policy "auth insert visits" on visits for insert to authenticated with check (true);
create policy "auth update visits" on visits for update to authenticated using (true) with check (true);

-- materials
create policy "auth read materials" on materials for select to authenticated using (true);
create policy "auth insert materials" on materials for insert to authenticated with check (true);
create policy "auth update materials" on materials for update to authenticated using (true) with check (true);

-- material_movements
create policy "auth read material_movements" on material_movements for select to authenticated using (true);
create policy "auth insert material_movements" on material_movements for insert to authenticated with check (true);

-- quotes
create policy "auth read quotes" on quotes for select to authenticated using (true);
create policy "auth insert quotes" on quotes for insert to authenticated with check (true);
create policy "auth update quotes" on quotes for update to authenticated using (true) with check (true);

-- quote_lines
create policy "auth read quote_lines" on quote_lines for select to authenticated using (true);
create policy "auth insert quote_lines" on quote_lines for insert to authenticated with check (true);
create policy "auth update quote_lines" on quote_lines for update to authenticated using (true) with check (true);

-- projects
create policy "auth read projects" on projects for select to authenticated using (true);
create policy "auth insert projects" on projects for insert to authenticated with check (true);
create policy "auth update projects" on projects for update to authenticated using (true) with check (true);

-- work_logs
create policy "auth read work_logs" on work_logs for select to authenticated using (true);
create policy "auth insert work_logs" on work_logs for insert to authenticated with check (true);

-- expenses
create policy "auth read expenses" on expenses for select to authenticated using (true);
create policy "auth insert expenses" on expenses for insert to authenticated with check (true);

-- cash_movements
create policy "auth read cash_movements" on cash_movements for select to authenticated using (true);
create policy "auth insert cash_movements" on cash_movements for insert to authenticated with check (true);

-- payments
create policy "auth read payments" on payments for select to authenticated using (true);
create policy "auth insert payments" on payments for insert to authenticated with check (true);

-- audit_logs (read-only for users)
create policy "auth read audit_logs" on audit_logs for select to authenticated using (true);
