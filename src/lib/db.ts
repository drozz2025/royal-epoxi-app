import { supabase } from './supabase';

function db() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Clients
export async function listClients() {
  return db().from('clients').select('*').order('created_at', { ascending: false });
}

export async function getClient(id: string) {
  return db().from('clients').select('*').eq('id', id).single();
}

export async function createClient(data: {
  name: string;
  company?: string;
  nif?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  return db().from('clients').insert(data).select().single();
}

export async function updateClient(
  id: string,
  data: Partial<{ name: string; company: string; nif: string; phone: string; email: string; address: string; notes: string }>,
) {
  return db().from('clients').update(data).eq('id', id).select().single();
}

// Visits
export async function listVisits() {
  return db().from('visits').select('*, clients(name)').order('date', { ascending: false });
}

export async function createVisit(data: {
  client_id?: string;
  date: string;
  address?: string;
  area_m2?: number;
  notes?: string;
  status?: string;
}) {
  return db().from('visits').insert(data).select().single();
}

// Materials
export async function listMaterials() {
  return db().from('materials').select('*').eq('active', true).order('name');
}

export async function createMaterial(data: {
  name: string;
  unit: string;
  cost: number;
  yield_per_unit?: number;
  waste_pct?: number;
  stock?: number;
  min_stock?: number;
}) {
  return db().from('materials').insert({ ...data, active: true }).select().single();
}

export async function updateMaterial(
  id: string,
  data: Partial<{ name: string; unit: string; cost: number; yield_per_unit: number; waste_pct: number; stock: number; min_stock: number }>,
) {
  return db().from('materials').update(data).eq('id', id).select().single();
}

// Quotes
export async function listQuotes() {
  return db().from('quotes').select('*, clients(name)').order('created_at', { ascending: false });
}

export async function createQuote(data: {
  client_id?: string;
  area_m2?: number;
  material_cost?: number;
  labour_cost?: number;
  other_cost?: number;
  sale_price: number;
  margin_pct?: number;
  notes?: string;
  valid_until?: string;
  status?: string;
}) {
  // Generate a quote number like Q-2026-001
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const number = `Q-${year}-${rand}`;
  const direct_cost = (data.material_cost || 0) + (data.labour_cost || 0) + (data.other_cost || 0);
  return db()
    .from('quotes')
    .insert({
      number,
      client_id: data.client_id,
      status: data.status || 'RASCUNHO',
      direct_cost,
      sale_price: data.sale_price,
      margin_pct: data.margin_pct || 0,
      valid_until: data.valid_until || null,
    })
    .select()
    .single();
}

export async function updateQuoteStatus(id: string, status: string) {
  return db().from('quotes').update({ status }).eq('id', id).select().single();
}

// Projects
export async function listProjects() {
  return db().from('projects').select('*, clients(name)').order('created_at', { ascending: false });
}

export async function getProject(id: string) {
  return db().from('projects').select('*, clients(name)').eq('id', id).single();
}

export async function createProject(data: {
  client_id?: string;
  quote_id?: string;
  area_m2?: number;
  sale_price?: number;
  planned_cost?: number;
  status?: string;
  start_date?: string;
  notes?: string;
}) {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const number = `RE-${year}-${rand}`;
  return db()
    .from('projects')
    .insert({
      number,
      client_id: data.client_id,
      quote_id: data.quote_id || null,
      area_m2: data.area_m2 || 0,
      sale_price: data.sale_price || 0,
      planned_cost: data.planned_cost || 0,
      actual_cost: 0,
      status: data.status || 'PLANEAMENTO',
      start_date: data.start_date || null,
    })
    .select()
    .single();
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  return db().from('projects').update(data).eq('id', id).select().single();
}

// Cash
export async function listCashMovements() {
  return db().from('cash_movements').select('*').order('date', { ascending: false });
}

export async function createCashMovement(data: {
  date: string;
  type: 'IN' | 'OUT';
  category: string;
  amount: number;
  description: string;
  project_id?: string;
}) {
  return db().from('cash_movements').insert(data).select().single();
}

// Material movements
export async function listMaterialMovements() {
  return db().from('material_movements').select('*, materials(name)').order('created_at', { ascending: false });
}

export async function createMaterialMovement(data: {
  material_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason?: string;
  project_id?: string;
}) {
  const client = db();
  const material = await client.from('materials').select('stock').eq('id', data.material_id).single();
  if (material.error) {
    return { data: null, error: material.error };
  }

  const delta = data.type === 'IN' ? toNumber(data.quantity) : -toNumber(data.quantity);
  const nextStock = toNumber(material.data?.stock) + delta;

  if (nextStock < 0) {
    return { data: null, error: new Error('Stock insuficiente para registar a saída.') };
  }

  const movement = await client.from('material_movements').insert(data).select().single();
  if (movement.error) {
    return movement;
  }

  const stockUpdate = await client.from('materials').update({ stock: nextStock }).eq('id', data.material_id).select().single();
  if (stockUpdate.error) {
    return { data: movement.data, error: stockUpdate.error };
  }

  return movement;
}

// Payments
export async function listPayments() {
  return db().from('payments').select('*, clients(name)').order('payment_date', { ascending: false });
}

export async function createPayment(data: {
  client_id?: string;
  project_id?: string;
  amount: number;
  payment_date: string;
  method?: string;
  notes?: string;
}) {
  return db().from('payments').insert(data).select().single();
}

// Dashboard
export async function getDashboardStats() {
  const client = db();
  const [projects, cash, quotes] = await Promise.all([
    client.from('projects').select('sale_price, planned_cost, actual_cost, status'),
    client.from('cash_movements').select('type, amount'),
    client.from('quotes').select('sale_price, status'),
  ]);

  const projectRows = projects.data || [];
  const cashRows = cash.data || [];
  const quoteRows = quotes.data || [];

  const activeProjects = projectRows.filter((p) => ['EM_OBRA', 'PLANEAMENTO', 'AGENDADA'].includes(String(p.status))).length;
  const completedProjects = projectRows.filter((p) => String(p.status) === 'CONCLUIDA');
  const totalInvoiced = completedProjects.reduce((s, p) => s + toNumber(p.sale_price), 0);
  const totalCost = completedProjects.reduce((s, p) => s + toNumber(p.actual_cost || p.planned_cost), 0);
  const pendingAmount = quoteRows
    .filter((q) => ['ENVIADO', 'PENDENTE', 'ACEITE'].includes(String(q.status)))
    .reduce((s, q) => s + toNumber(q.sale_price), 0);
  const cashBalance = cashRows.reduce((s, m) => s + (String(m.type) === 'IN' ? toNumber(m.amount) : -toNumber(m.amount)), 0);

  return {
    activeProjects,
    totalInvoiced,
    totalProfit: totalInvoiced - totalCost,
    pendingAmount,
    cashBalance,
    error: projects.error || cash.error || quotes.error,
  };
}

export async function listProfiles() {
  const client = db();
  return client.from('profiles').select('*').order('created_at', { ascending: false });
}
