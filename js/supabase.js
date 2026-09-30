import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_ENABLED } from './config.js';
let clientPromise = null;
let cachedUser = null;
async function getClient(){
  if(!SUPABASE_ENABLED) return null;
  if(!clientPromise){
    clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
  }
  return clientPromise;
}
export async function getSession(){const c=await getClient();if(!c)return null;const {data}=await c.auth.getSession();cachedUser=data.session?.user||null;return data.session||null}
export async function signIn(email,password){const c=await getClient();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;cachedUser=data.user;const {data:allowed,error:allowedError}=await c.rpc('is_allowed_user');if(allowedError||!allowed){await c.auth.signOut();cachedUser=null;throw new Error('Esta conta não está autorizada nesta instalação.')}return data.user}
export async function signOut(){const c=await getClient();if(c)await c.auth.signOut();cachedUser=null}
export async function getUser(){if(cachedUser)return cachedUser;const s=await getSession();return s?.user||null}
export async function getSupabase(){return getClient()}
export function isEnabled(){return SUPABASE_ENABLED}
