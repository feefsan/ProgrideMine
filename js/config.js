// ============================================================
// Configuração do Supabase
// ------------------------------------------------------------
// Deixe ambos os valores vazios para rodar em modo local
// (a página funciona 100% com localStorage).
// Para ativar a sincronização, cole os valores do painel do
// Supabase em Settings → API.
//
// A publishable key é segura para o frontend DESDE QUE as
// políticas de RLS estejam configuradas corretamente.
// NUNCA coloque a service_role key aqui.
// ============================================================

export const SUPABASE_URL = 'https://vxeudlclahoaxugmjljo.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_K3P_yp3l68OY_QwlFQIWVA_vI59kFcY';

export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);