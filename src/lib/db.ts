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
  return db().from('clients').select('*').eq('deleted', false).order('created_at', { ascending: false });
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
  client_id: string;
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
  client_id: string;
  number?: string;
  area_m2: number;
  material_cost: number;
  labour_cost: number;
  other_cost: number;
  sale_price: number;
  margin_pct: number;
  notes?: string;
  valid_until?: string;
  status?: string;
}) {
  return db().from('quotes').insert({ ...data, status: data.status || 'RASCUNHO' }).select().single();
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
  client_id: string;
  quote_id?: string;
  number?: string;
  area_m2: number;
  sale_price: number;
  planned_cost: number;
  status?: string;
  start_date?: string;
}) {
  return db().from('projects').insert({ ...data, status: data.status || 'PLANEAMENTO' }).select().single();
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
  return db().from('payments').select('*, quotes(number), clients(name)').order('due_date', { ascending: true });
}

export async function createPayment(data: {
  client_id: string;
  quote_id?: string;
  project_id?: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status?: string;
  notes?: string;
}) {
  return db().from('payments').insert({ ...data, status: data.status || 'PENDENTE' }).select().single();
}

// Dashboard
export async function getDashboardStats() {
  const client = db();
  const [projects, cash, quotes, payments] = await Promise.all([
    client.from('projects').select('sale_price, planned_cost, actual_cost, status'),
    client.from('cash_movements').select('type, amount'),
    client.from('quotes').select('sale_price, status'),
    client.from('payments').select('amount, status'),
  ]);

  const projectRows = projects.data || [];
  const cashRows = cash.data || [];
  const quoteRows = quotes.data || [];
  const paymentRows = payments.data || [];

  const activeProjects = projectRows.filter((project) => ['EM_OBRA', 'PLANEAMENTO', 'AGENDADA'].includes(String(project.status))).length;
  const completedProjects = projectRows.filter((project) => String(project.status) === 'CONCLUIDA');
  const totalInvoiced = completedProjects.reduce((sum, project) => sum + toNumber(project.sale_price), 0);
  const totalCost = completedProjects.reduce((sum, project) => sum + toNumber(project.actual_cost || project.planned_cost), 0);
  const pendingQuotes = quoteRows
    .filter((quote) => ['ENVIADO', 'PENDENTE', 'ACEITE'].includes(String(quote.status)))
    .reduce((sum, quote) => sum + toNumber(quote.sale_price), 0);
  const pendingPayments = paymentRows
    .filter((payment) => !['PAGO', 'RECEBIDO', 'LIQUIDADO'].includes(String(payment.status)))
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const cashBalance = cashRows.reduce((sum, movement) => sum + (String(movement.type) === 'IN' ? toNumber(movement.amount) : -toNumber(movement.amount)), 0);

  return {
    activeProjects,
    totalInvoiced,
    totalProfit: totalInvoiced - totalCost,
    pendingAmount: pendingPayments || pendingQuotes,
    cashBalance,
    error: projects.error || cash.error || quotes.error || payments.error,
  };
}
