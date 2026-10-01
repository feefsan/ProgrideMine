import { STORAGE_KEYS } from './data.js';
import { getSupabase, isEnabled, getUser } from './supabase.js';
function readLocal(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}}
function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
export function loadLocal(){return{progress:readLocal(STORAGE_KEYS.progress)||{},custom:readLocal(STORAGE_KEYS.custom)||{},order:readLocal(STORAGE_KEYS.order)||{},overrides:readLocal(STORAGE_KEYS.overrides)||{}}}
export function persistLocal(state){writeLocal(STORAGE_KEYS.progress,state.progress);writeLocal(STORAGE_KEYS.custom,state.custom);writeLocal(STORAGE_KEYS.order,state.order);writeLocal(STORAGE_KEYS.overrides,state.overrides)}
const normalize=d=>d?{progress:d.progress||{},custom:d.custom||{},order:d.item_order||{},overrides:d.overrides||{},isPublic:Boolean(d.is_public)}:null;
export async function loadRemote(){if(!isEnabled())return null;const client=await getSupabase();const user=await getUser();if(!client||!user)return null;const {data,error}=await client.from('user_state').select('progress,custom,item_order,overrides,is_public').eq('user_id',user.id).maybeSingle();if(error)throw error;return normalize(data)}
export async function loadPublic(){if(!isEnabled())return null;const client=await getSupabase();const {data,error}=await client.from('user_state').select('progress,custom,item_order,overrides,is_public,updated_at').eq('is_public',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return normalize(data)}
let saveTimer=null,statusListener=null,readOnly=true;
export function setReadOnly(value){readOnly=Boolean(value)}
export function onSyncStatusChange(fn){statusListener=fn}
function setStatus(s){statusListener?.(s)}
export function persist(state){if(readOnly)return;persistLocal(state);if(!isEnabled()){setStatus('local');return}setStatus('saving');clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveRemote(state),800)}
async function saveRemote(state){const client=await getSupabase(),user=await getUser();if(!client||!user){setStatus('error');return}const {error}=await client.from('user_state').upsert({user_id:user.id,progress:state.progress,custom:state.custom,item_order:state.order,overrides:state.overrides,updated_at:new Date().toISOString()},{onConflict:'user_id'});setStatus(error?'error':'synced');if(error)console.warn('[storage] saveRemote failed:',error.message)}
export function hasAnyData(s){return Boolean(s&&(Object.keys(s.progress||{}).length||Object.keys(s.custom||{}).length||Object.keys(s.order||{}).length||Object.keys(s.overrides||{}).length))}
