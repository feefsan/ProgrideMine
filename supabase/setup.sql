create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
create or replace function public.limit_app_users() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from public.app_users) >= 2 then raise exception 'Limite de dois usuarios autorizados atingido'; end if;
  return new;
end;$$;
drop trigger if exists enforce_two_app_users on public.app_users;
create trigger enforce_two_app_users before insert on public.app_users for each row execute function public.limit_app_users();

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  custom jsonb not null default '{}'::jsonb,
  item_order jsonb not null default '{}'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists user_state_public_updated_idx on public.user_state(is_public,updated_at desc) where is_public=true;

create or replace function public.is_allowed_user() returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and exists(select 1 from public.app_users where user_id=auth.uid());
$$;
grant execute on function public.is_allowed_user() to anon, authenticated;

alter table public.app_users enable row level security;
alter table public.user_state enable row level security;
drop policy if exists app_users_self_read on public.app_users;
create policy app_users_self_read on public.app_users for select to authenticated using(user_id=auth.uid());
drop policy if exists guest_read_public_state on public.user_state;
create policy guest_read_public_state on public.user_state for select to anon using(is_public=true);
drop policy if exists authenticated_read_state on public.user_state;
create policy authenticated_read_state on public.user_state for select to authenticated using(is_public=true or (user_id=auth.uid() and public.is_allowed_user()));
drop policy if exists owner_insert_state on public.user_state;
create policy owner_insert_state on public.user_state for insert to authenticated with check(user_id=auth.uid() and public.is_allowed_user());
drop policy if exists owner_update_state on public.user_state;
create policy owner_update_state on public.user_state for update to authenticated using(user_id=auth.uid() and public.is_allowed_user()) with check(user_id=auth.uid() and public.is_allowed_user());
drop policy if exists owner_delete_state on public.user_state;
create policy owner_delete_state on public.user_state for delete to authenticated using(user_id=auth.uid() and public.is_allowed_user());
revoke all on public.app_users from anon,authenticated;
grant select on public.app_users to authenticated;
grant select on public.user_state to anon,authenticated;
grant insert,update,delete on public.user_state to authenticated;
