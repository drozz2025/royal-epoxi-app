import {supabase} from './supabase';

export async function listClients(){
  if(!supabase) throw new Error('Supabase não configurado');
  return supabase.from('clients').select('*').order('created_at',{ascending:false});
}
export async function createClient(data:{name:string;company?:string;nif?:string;phone?:string;email?:string;address?:string;notes?:string}){
  if(!supabase) throw new Error('Supabase não configurado');
  return supabase.from('clients').insert(data).select().single();
}
export async function listMaterials(){
  if(!supabase) throw new Error('Supabase não configurado');
  return supabase.from('materials').select('*').eq('active',true).order('name');
}
export async function createMaterial(data:{name:string;unit:string;cost:number;yield_per_unit?:number;waste_pct?:number;stock?:number;min_stock?:number}){
  if(!supabase) throw new Error('Supabase não configurado');
  return supabase.from('materials').insert(data).select().single();
}
export async function listProjects(){
  if(!supabase) throw new Error('Supabase não configurado');
  return supabase.from('projects').select('*, clients(name)').order('created_at',{ascending:false});
}
