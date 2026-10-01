-- Execute this entire file in the Supabase SQL Editor.
-- It replaces only the RPC used by "Gerenciar membros" and keeps existing data.

create or replace function public.add_journey_member(target_journey_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_journey_owner(target_journey_id) then
    raise exception 'Somente o proprietário pode adicionar membros à jornada';
  end if;

  if not exists (select 1 from public.app_users where user_id = target_user_id) then
    raise exception 'O usuário selecionado não está autorizado no aplicativo';
  end if;

  -- Do not use ON CONFLICT here: an existing deferrable unique constraint cannot
  -- be used as an ON CONFLICT arbiter in PostgreSQL.
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

grant execute on function public.add_journey_member(uuid, uuid) to authenticated;