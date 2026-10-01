create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

-- ============================================================
-- Jornada compartilhada
-- ============================================================

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  slug text not null unique,
  is_public boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_members (
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (journey_id, user_id)
);

alter table public.journey_members
  add column if not exists is_default boolean not null default false;
create unique index if not exists journey_members_one_default_per_user_idx
  on public.journey_members(user_id)
  where is_default;

create table if not exists public.journey_phases (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  label text not null,
  title text not null,
  description text not null default '',
  color text,
  icon text,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, journey_id),
  unique (journey_id, position)
);

create table if not exists public.journey_objectives (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  phase_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '',
  subtopics jsonb not null default '[]'::jsonb,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, journey_id),
  foreign key (phase_id, journey_id)
    references public.journey_phases(id, journey_id)
    on delete cascade,
  unique (phase_id, position)
);

create table if not exists public.journey_progress (
  journey_id uuid not null references public.journeys(id) on delete cascade,
  objective_id uuid not null,
  completed boolean not null default false,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (journey_id, objective_id),
  foreign key (objective_id, journey_id)
    references public.journey_objectives(id, journey_id)
    on delete cascade
);

create or replace function public.can_view_journey(target_journey_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1
    from public.journeys j
    where j.id = target_journey_id
      and j.is_public = true
  ) or exists (
    select 1
    from public.journey_members m
    where m.journey_id = target_journey_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_journey(target_journey_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.journey_members m
      where m.journey_id = target_journey_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    );
$$;

create or replace function public.is_journey_owner(target_journey_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.journey_members m
      where m.journey_id = target_journey_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    );
$$;

drop function if exists public.get_my_journeys();
create function public.get_my_journeys()
returns table(id uuid, title text, slug text, is_public boolean, updated_at timestamptz, role text, is_default boolean)
language sql stable security definer set search_path=public as $$
  select j.id, j.title, j.slug, j.is_public, j.updated_at, m.role, m.is_default
  from public.journey_members m
  join public.journeys j on j.id = m.journey_id
  where m.user_id = auth.uid()
  order by m.is_default desc, j.updated_at desc;
$$;

create or replace function public.set_my_default_journey(target_journey_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (
    select 1 from public.journey_members
    where journey_id = target_journey_id
      and user_id = auth.uid()
  ) then
    raise exception 'Você não tem acesso a esta jornada';
  end if;

  update public.journey_members
  set is_default = false
  where user_id = auth.uid()
    and is_default;

  update public.journey_members
  set is_default = true
  where journey_id = target_journey_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.get_journey_members(target_journey_id uuid)
returns table(user_id uuid, display_name text, role text)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_journey_owner(target_journey_id) then
    raise exception 'Somente o proprietário pode gerenciar membros da jornada';
  end if;

  return query
  select m.user_id, u.display_name, m.role
  from public.journey_members m
  join public.app_users u on u.user_id = m.user_id
  where m.journey_id = target_journey_id
  order by case when m.role = 'owner' then 0 else 1 end, u.display_name;
end;
$$;

create or replace function public.get_available_journey_members(target_journey_id uuid)
returns table(user_id uuid, display_name text)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_journey_owner(target_journey_id) then
    raise exception 'Somente o proprietário pode gerenciar membros da jornada';
  end if;

  return query
  select u.user_id, u.display_name
  from public.app_users u
  where not exists (
    select 1
    from public.journey_members m
    where m.journey_id = target_journey_id
      and m.user_id = u.user_id
  )
  order by u.display_name;
end;
$$;

create or replace function public.add_journey_member(target_journey_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_journey_owner(target_journey_id) then
    raise exception 'Somente o proprietário pode adicionar membros à jornada';
  end if;

  if not exists (select 1 from public.app_users where user_id = target_user_id) then
    raise exception 'O usuário selecionado não está autorizado no aplicativo';
  end if;

  update public.journey_members
  set role = 'editor'
  where journey_id = target_journey_id
    and user_id = target_user_id;

  if not found then
    insert into public.journey_members (journey_id, user_id, role)
    values (target_journey_id, target_user_id, 'editor');
  end if;
end;
$$;

create or replace function public.remove_journey_member(target_journey_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_journey_owner(target_journey_id) then
    raise exception 'Somente o proprietário pode remover membros da jornada';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'O proprietário não pode remover a própria associação';
  end if;

  delete from public.journey_members
  where journey_id = target_journey_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.create_journey(journey_title text, journey_slug text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  new_journey_id uuid;
  base_slug text;
  final_slug text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  base_slug := trim(journey_slug);
  if base_slug = '' then
    base_slug := lower(regexp_replace(trim(journey_title), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
  end if;

  if base_slug = '' then
    base_slug := 'journey';
  end if;

  final_slug := base_slug;
  while exists (select 1 from public.journeys where slug = final_slug) loop
    final_slug := base_slug || '-' || substr(md5(random()::text), 1, 8);
  end loop;

  insert into public.journeys (title, slug, created_by)
  values (trim(journey_title), final_slug, auth.uid())
  returning id into new_journey_id;

  update public.journey_members
  set is_default = false
  where user_id = auth.uid()
    and is_default;

  insert into public.journey_members (journey_id, user_id, role, is_default)
  values (new_journey_id, auth.uid(), 'owner', true);

  insert into public.journey_phases (journey_id, label, title, description, color, icon, position)
  values
    (new_journey_id, 'Fase 1', 'Fundação', 'Estabeleça os pilares da jornada e o primeiro progresso.', '#5ec26a', 'i-house', 1),
    (new_journey_id, 'Fase 2', 'Execução', 'Conduza as tarefas principais com foco e ritmo.', '#e08c4a', 'i-cube', 2),
    (new_journey_id, 'Fase 3', 'Entregável', 'Finalize o que foi planejado e valide o resultado.', '#d1452f', 'i-flame', 3);

  return new_journey_id;
end;
$$;

grant execute on function public.create_journey(text, text) to authenticated;
grant execute on function public.can_view_journey(uuid) to anon, authenticated;
grant execute on function public.can_edit_journey(uuid) to authenticated;
grant execute on function public.is_journey_owner(uuid) to authenticated;
grant execute on function public.get_my_journeys() to authenticated;
grant execute on function public.set_my_default_journey(uuid) to authenticated;
grant execute on function public.get_journey_members(uuid) to authenticated;
grant execute on function public.get_available_journey_members(uuid) to authenticated;
grant execute on function public.add_journey_member(uuid, uuid) to authenticated;
grant execute on function public.remove_journey_member(uuid, uuid) to authenticated;

alter table public.journeys enable row level security;
alter table public.journey_members enable row level security;
alter table public.journey_phases enable row level security;
alter table public.journey_objectives enable row level security;
alter table public.journey_progress enable row level security;

drop policy if exists journeys_read on public.journeys;
create policy journeys_read on public.journeys for select to anon, authenticated using (public.can_view_journey(id));

drop policy if exists journeys_write on public.journeys;
create policy journeys_write on public.journeys for update to authenticated using (public.is_journey_owner(id)) with check (public.is_journey_owner(id));

drop policy if exists journeys_insert on public.journeys;
create policy journeys_insert on public.journeys for insert to authenticated with check (created_by = auth.uid());

drop policy if exists journey_members_read on public.journey_members;
create policy journey_members_read on public.journey_members for select to authenticated using (user_id = auth.uid());

drop policy if exists journey_members_write on public.journey_members;
create policy journey_members_write on public.journey_members for all to authenticated using (public.is_journey_owner(journey_id)) with check (public.is_journey_owner(journey_id));

drop policy if exists journey_phases_read on public.journey_phases;
create policy journey_phases_read on public.journey_phases for select to anon, authenticated using (public.can_view_journey(journey_id));

drop policy if exists journey_phases_write on public.journey_phases;
create policy journey_phases_write on public.journey_phases for all to authenticated using (public.can_edit_journey(journey_id)) with check (public.can_edit_journey(journey_id));

drop policy if exists journey_objectives_read on public.journey_objectives;
create policy journey_objectives_read on public.journey_objectives for select to anon, authenticated using (public.can_view_journey(journey_id));

drop policy if exists journey_objectives_write on public.journey_objectives;
create policy journey_objectives_write on public.journey_objectives for all to authenticated using (public.can_edit_journey(journey_id)) with check (public.can_edit_journey(journey_id));

drop policy if exists journey_progress_read on public.journey_progress;
create policy journey_progress_read on public.journey_progress for select to anon, authenticated using (public.can_view_journey(journey_id));

drop policy if exists journey_progress_write on public.journey_progress;
create policy journey_progress_write on public.journey_progress for all to authenticated using (public.can_edit_journey(journey_id)) with check (public.can_edit_journey(journey_id) and updated_by = auth.uid());

grant select on public.journeys to anon,authenticated;
grant select on public.journey_members to authenticated;
grant select on public.journey_phases to anon,authenticated;
grant select on public.journey_objectives to anon,authenticated;
grant select on public.journey_progress to anon,authenticated;
grant insert,update,delete on public.journeys to authenticated;
grant insert,update,delete on public.journey_members to authenticated;
grant insert,update,delete on public.journey_phases to authenticated;
grant insert,update,delete on public.journey_objectives to authenticated;
grant insert,update,delete on public.journey_progress to authenticated;

create or replace trigger set_updated_at_journeys before update on public.journeys for each row execute procedure set_updated_at();
create or replace trigger set_updated_at_journey_phases before update on public.journey_phases for each row execute procedure set_updated_at();
create or replace trigger set_updated_at_journey_objectives before update on public.journey_objectives for each row execute procedure set_updated_at();
create or replace trigger set_updated_at_journey_progress before update on public.journey_progress for each row execute procedure set_updated_at();
