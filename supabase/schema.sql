create extension if not exists pgcrypto;

create type public.app_role as enum ('ADMIN','ORCAMENTISTA','OBRA','FINANCEIRO','FUNCIONARIO');
create type public.quote_status as enum ('RASCUNHO','ENVIADO','PENDENTE','ACEITE','RECUSADO','CANCELADO','EXPIRADO');
create type public.project_status as enum ('PLANEAMENTO','AGENDADA','EM_OBRA','PAUSADA','CONCLUIDA','CANCELADA');

create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,name text not null,role public.app_role not null default 'FUNCIONARIO',phone text,active boolean not null default true,created_at timestamptz not null default now());

create table public.clients(id uuid primary key default gen_random_uuid(),name text not null,company text,nif text,phone text,email text,address text,notes text,created_at timestamptz not null default now());

create table public.visits(id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id),date date not null default current_date,address text,area_m2 numeric(12,2),notes text,status text not null default 'AGENDADA',created_at timestamptz not null default now());

create table public.materials(id uuid primary key default gen_random_uuid(),name text not null,unit text not null,cost numeric(12,2) not null default 0,yield_per_unit numeric(12,4),waste_pct numeric(5,2) not null default 0,stock numeric(12,3) not null default 0,min_stock numeric(12,3) not null default 0,active boolean not null default true,created_at timestamptz not null default now());

create table public.material_movements(id uuid primary key default gen_random_uuid(),material_id uuid not null references public.materials(id),type text not null check(type in ('IN','OUT')),quantity numeric(12,3) not null default 0,reason text,project_id uuid,created_at timestamptz not null default now());

create table public.quotes(id uuid primary key default gen_random_uuid(),number text unique not null,client_id uuid not null references public.clients(id),status public.quote_status not null default 'RASCUNHO',direct_cost numeric(12,2) not null default 0,sale_price numeric(12,2) not null default 0,margin_pct numeric(6,2) not null default 0,valid_until date,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),accepted_at timestamptz);

create table public.quote_lines(id uuid primary key default gen_random_uuid(),quote_id uuid not null references public.quotes(id) on delete cascade,description text not null,quantity numeric(12,3) not null default 0,unit text not null,unit_price numeric(12,2) not null default 0,cost numeric(12,2) not null default 0);

create table public.projects(id uuid primary key default gen_random_uuid(),number text unique not null,quote_id uuid references public.quotes(id),client_id uuid not null references public.clients(id),status public.project_status not null default 'PLANEAMENTO',area_m2 numeric(12,2) not null default 0,planned_cost numeric(12,2) not null default 0,actual_cost numeric(12,2) not null default 0,sale_price numeric(12,2) not null default 0,start_date date,end_date date,notes text,created_at timestamptz not null default now());

create table public.measurements(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,description text,length_m numeric(12,3) not null default 0,width_m numeric(12,3) not null default 0,area_m2 numeric(12,3) generated always as (length_m*width_m) stored,notes text,created_by uuid references public.profiles(id),created_at timestamptz not null default now());

create table public.work_logs(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,work_date date not null,employee_id uuid references public.profiles(id),hours numeric(8,2) not null default 0,hourly_cost numeric(10,2) not null default 0,material_cost numeric(12,2) not null default 0,description text,created_at timestamptz not null default now());

create table public.expenses(id uuid primary key default gen_random_uuid(),project_id uuid references public.projects(id),category text not null,description text not null,amount numeric(12,2) not null default 0,expense_date date not null default current_date,created_by uuid references public.profiles(id));

create table public.cash_movements(id uuid primary key default gen_random_uuid(),date date not null default current_date,type text not null check(type in ('IN','OUT')),category text not null,amount numeric(12,2) not null default 0,description text,project_id uuid references public.projects(id),created_at timestamptz not null default now());

create table public.payments(id uuid primary key default gen_random_uuid(),client_id uuid references public.clients(id),project_id uuid references public.projects(id),amount numeric(12,2) not null default 0,payment_date date not null default current_date,method text,notes text,created_at timestamptz not null default now());

create table public.audit_logs(id bigint generated always as identity primary key,user_id uuid references public.profiles(id),action text not null,entity text not null,entity_id uuid,details jsonb,created_at timestamptz not null default now());

create index clients_name_idx on public.clients(name);
create index visits_client_idx on public.visits(client_id);
create index visits_date_idx on public.visits(date);
create index quotes_client_idx on public.quotes(client_id);
create index projects_client_idx on public.projects(client_id);
create index work_logs_project_idx on public.work_logs(project_id);
create index expenses_project_idx on public.expenses(project_id);
create index payments_project_idx on public.payments(project_id);
create index cash_movements_date_idx on public.cash_movements(date);
create index material_movements_material_idx on public.material_movements(material_id);
