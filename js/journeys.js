import { getSupabase, getUser } from './supabase.js';

export async function createSharedJourney({ title, slug }) {
  const client = await getSupabase();
  const user = await getUser();

  if (!client || !user) {
    throw new Error('É necessário estar autenticado para criar uma jornada compartilhada.');
  }

  const normalizedTitle = String(title || '').trim();
  const baseSlug = String(slug || '').trim();
  const finalSlug = baseSlug || `${normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'journey'}-${Date.now().toString().slice(-6)}`;

  const { data, error } = await client.rpc('create_journey', {
    journey_title: normalizedTitle,
    journey_slug: finalSlug,
  });

  if (error) throw error;
  return data;
}

export async function createJourneyPhase({ journeyId, label, title, description, color, icon, position }) {
  const client = await getSupabase();
  const user = await getUser();

  if (!client || !user || !journeyId) {
    throw new Error('É necessário estar autenticado para criar uma fase.');
  }

  const payload = {
    journey_id: journeyId,
    label: String(label || '').trim() || `Fase ${Number(position || 1)}`,
    title: String(title || '').trim() || 'Nova fase',
    description: String(description || ''),
    color: String(color || '#5ec26a'),
    icon: String(icon || 'i-house'),
    position: Number(position ?? 0),
  };

  const { data, error } = await client
    .from('journey_phases')
    .insert(payload)
    .select('id, label, title, description, color, icon, position')
    .single();

  if (error) throw error;
  return data;
}

export async function updateJourneyPhase({ journeyId, phaseId, label, title, description, color, icon }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId || !phaseId) {
    throw new Error('Não foi possível editar esta fase.');
  }

  const { data, error } = await client
    .from('journey_phases')
    .update({
      label: String(label || '').trim(),
      title: String(title || '').trim(),
      description: String(description || '').trim(),
      color: String(color || '#5ec26a'),
      icon: String(icon || 'i-house'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', phaseId)
    .eq('journey_id', journeyId)
    .select('id, label, title, description, color, icon, position')
    .single();

  if (error) throw error;
  return data;
}

export async function listUserJourneys() {
  const client = await getSupabase();
  const user = await getUser();

  if (!client || !user) return [];

  const { data: rpcData, error: rpcError } = await client.rpc('get_my_journeys');
  if (!rpcError && rpcData?.length) {
    return rpcData.map((journey) => ({
      ...journey,
      journeyId: journey.id,
    }));
  }

  const { data: fallbackData, error: fallbackError } = await client
    .from('journey_members')
    .select('role, journey_id, journeys(id, title, slug, is_public, updated_at)')
    .eq('user_id', user.id);

  if (fallbackError) {
    const message = fallbackError.message || rpcError?.message || 'Não foi possível consultar as jornadas associadas à sua conta.';
    throw new Error(message);
  }

  const fallbackJourneys = (fallbackData || []).map((row) => ({
    ...row.journeys,
    role: row.role,
    is_default: false,
    journeyId: row.journey_id,
  })).filter((journey) => journey.id);

  if (fallbackJourneys.length || rpcError) return fallbackJourneys;

  return (rpcData || []).map((journey) => ({
    ...journey,
    journeyId: journey.id,
  }));
}

export async function setDefaultJourney(journeyId) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId) {
    throw new Error('Selecione uma jornada para definir como inicial.');
  }

  const { error } = await client.rpc('set_my_default_journey', {
    target_journey_id: journeyId,
  });
  if (error) throw error;
}

export async function listPublicJourneys() {
  const client = await getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('journeys')
    .select('id, title, slug, updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function loadSharedJourney(journeyId) {
  const client = await getSupabase();
  if (!client || !journeyId) return null;

  const { data, error } = await client
    .from('journeys')
    .select(`
      id,
      title,
      slug,
      is_public,
      updated_at,
      journey_phases:journey_phases(id, label, title, description, color, icon, position),
      journey_objectives:journey_objectives(id, phase_id, title, description, subtopics, position),
      journey_progress:journey_progress(objective_id, completed, updated_by, updated_at)
    `)
    .eq('id', journeyId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function loadPublicSharedJourney() {
  const client = await getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('journeys')
    .select(`
      id,
      title,
      slug,
      is_public,
      updated_at,
      journey_phases:journey_phases(id, label, title, description, color, icon, position),
      journey_objectives:journey_objectives(id, phase_id, title, description, subtopics, position),
      journey_progress:journey_progress(objective_id, completed, updated_by, updated_at)
    `)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function setSharedJourneyPublicState({ journeyId, isPublic }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId) {
    throw new Error('É necessário estar autenticado para alterar a visibilidade da jornada.');
  }

  const { data, error } = await client
    .from('journeys')
    .update({ is_public: Boolean(isPublic), updated_at: new Date().toISOString() })
    .eq('id', journeyId)
    .select('is_public')
    .single();

  if (error) throw error;
  return Boolean(data?.is_public);
}

export async function getJourneyMembers(journeyId) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId) return [];

  const { data, error } = await client.rpc('get_journey_members', {
    target_journey_id: journeyId,
  });

  if (error) throw error;
  return data || [];
}

export async function getAvailableJourneyMembers(journeyId) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId) return [];

  const { data, error } = await client.rpc('get_available_journey_members', {
    target_journey_id: journeyId,
  });

  if (error) throw error;
  return data || [];
}

export async function addJourneyMember({ journeyId, userId }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId || !userId) {
    throw new Error('Selecione um usuário para adicionar à jornada.');
  }

  const { error } = await client.rpc('add_journey_member', {
    target_journey_id: journeyId,
    target_user_id: userId,
  });

  if (error) throw error;
}

export async function removeJourneyMember({ journeyId, userId }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId || !userId) {
    throw new Error('Não foi possível remover o membro da jornada.');
  }

  const { error } = await client.rpc('remove_journey_member', {
    target_journey_id: journeyId,
    target_user_id: userId,
  });

  if (error) throw error;
}

export async function subscribeToJourney(journeyId, onChange) {
  const client = await getSupabase();
  if (!client || !journeyId) return null;

  const channel = client.channel(`journey:${journeyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'journey_phases', filter: `journey_id=eq.${journeyId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'journey_objectives', filter: `journey_id=eq.${journeyId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'journey_progress', filter: `journey_id=eq.${journeyId}` },
      onChange
    );

  await channel.subscribe();
  return channel;
}

export async function saveJourneyProgress({ journeyId, objectiveId, completed }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId || !objectiveId) return null;

  const { error } = await client.from('journey_progress').upsert({
    journey_id: journeyId,
    objective_id: objectiveId,
    completed: Boolean(completed),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'journey_id,objective_id' });

  if (error) throw error;
  return true;
}

export async function saveJourneyObjective({ journeyId, phaseId, objectiveId, title, description, subtopics, position }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId || !phaseId) return null;

  const payload = {
    journey_id: journeyId,
    phase_id: phaseId,
    title: String(title || '').trim(),
    description: String(description || ''),
    subtopics: Array.isArray(subtopics) ? subtopics : [],
    position: Number(position ?? 0),
    updated_at: new Date().toISOString(),
  };

  if (objectiveId) {
    const { error } = await client.from('journey_objectives').update(payload).eq('id', objectiveId).eq('journey_id', journeyId);
    if (error) throw error;
    return objectiveId;
  }

  const { data, error } = await client.from('journey_objectives').insert(payload).select('id').single();
  if (error) throw error;
  return data?.id || null;
}

export async function deleteJourneyObjective({ journeyId, objectiveId }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId || !objectiveId) return false;

  const { error } = await client.from('journey_objectives').delete().eq('id', objectiveId).eq('journey_id', journeyId);
  if (error) throw error;
  return true;
}

export async function reorderJourneyObjectives({ journeyId, phaseId, orderedIds }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId || !phaseId || !Array.isArray(orderedIds) || !orderedIds.length) return false;

  for (let index = 0; index < orderedIds.length; index += 1) {
    const objectiveId = orderedIds[index];
    const { error } = await client.from('journey_objectives').update({ position: index, updated_at: new Date().toISOString() })
      .eq('id', objectiveId)
      .eq('journey_id', journeyId)
      .eq('phase_id', phaseId);
    if (error) throw error;
  }

  return true;
}

export async function resetJourneyProgress({ journeyId }) {
  const client = await getSupabase();
  const user = await getUser();
  if (!client || !user || !journeyId) return false;

  const { error } = await client.from('journey_progress').delete().eq('journey_id', journeyId);
  if (error) throw error;
  return true;
}
