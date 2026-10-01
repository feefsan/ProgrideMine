-- Execute this entire file in the Supabase SQL Editor to replace the stored RPC.
-- It is safe to run more than once and does not delete existing journeys.

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

  insert into public.journey_members (journey_id, user_id, role)
  values (new_journey_id, auth.uid(), 'owner');

  insert into public.journey_phases (journey_id, label, title, description, color, icon, position)
  values
    (new_journey_id, 'Fase 1', 'Fundação', 'Estabeleça os pilares da jornada e o primeiro progresso.', '#5ec26a', 'i-house', 1),
    (new_journey_id, 'Fase 2', 'Execução', 'Conduza as tarefas principais com foco e ritmo.', '#e08c4a', 'i-cube', 2),
    (new_journey_id, 'Fase 3', 'Entregável', 'Finalize o que foi planejado e valide o resultado.', '#d1452f', 'i-flame', 3);

  return new_journey_id;
end;
$$;

grant execute on function public.create_journey(text, text) to authenticated;
