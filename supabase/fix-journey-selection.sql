-- Execute this complete file in the Supabase SQL Editor.
-- It adds each user's preferred initial journey and the required RPCs.

alter table public.journey_members
  add column if not exists is_default boolean not null default false;

create unique index if not exists journey_members_one_default_per_user_idx
  on public.journey_members(user_id)
  where is_default;

-- The function return type gains is_default, so PostgreSQL requires recreation.
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

grant execute on function public.get_my_journeys() to authenticated;
grant execute on function public.set_my_default_journey(uuid) to authenticated;
grant execute on function public.create_journey(text, text) to authenticated;
