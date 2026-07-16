-- Run this once in Supabase > SQL Editor.
-- The table cannot be read directly. Data is accessed only through the two RPC functions below.

create table if not exists public.quote_workspaces (
  workspace_id text primary key,
  secret_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quote_workspaces enable row level security;
revoke all on table public.quote_workspaces from anon, authenticated;

create or replace function public.load_quote_workspace(
  p_workspace_id text,
  p_secret_hash text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select payload
  from public.quote_workspaces
  where workspace_id = p_workspace_id
    and secret_hash = p_secret_hash
  limit 1;
$$;

create or replace function public.save_quote_workspace(
  p_workspace_id text,
  p_secret_hash text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.quote_workspaces (workspace_id, secret_hash, payload, updated_at)
  values (p_workspace_id, p_secret_hash, coalesce(p_payload, '{}'::jsonb), now())
  on conflict (workspace_id) do update
    set payload = excluded.payload,
        updated_at = now()
  where public.quote_workspaces.secret_hash = excluded.secret_hash;

  if not found then
    raise exception 'Invalid sync code';
  end if;

  return true;
end;
$$;

grant execute on function public.load_quote_workspace(text, text) to anon, authenticated;
grant execute on function public.save_quote_workspace(text, text, jsonb) to anon, authenticated;
