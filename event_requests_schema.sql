create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  event_date date,
  event_type text not null,
  guest_count integer,
  comments text,
  estimated_total numeric(12, 2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint event_requests_status_check
    check (status in ('pending', 'contacted', 'quoted', 'confirmed', 'cancelled')),
  constraint event_requests_event_type_check
    check (event_type in ('cumpleaños', 'casamiento', 'empresarial', 'bautismo', 'mesa dulce', 'otro'))
);

alter table public.event_requests enable row level security;

drop policy if exists "Allow public event request inserts" on public.event_requests;
create policy "Allow public event request inserts"
on public.event_requests
for insert
to anon
with check (true);

drop policy if exists "Allow authenticated event request reads" on public.event_requests;
create policy "Allow authenticated event request reads"
on public.event_requests
for select
to authenticated
using (true);

create index if not exists event_requests_created_at_idx
on public.event_requests (created_at desc);
