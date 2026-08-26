'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Layout from '@/components/Layout';
import { calcQuote } from '@/lib/calculations';
import { createQuote, listClients, listQuotes } from '@/lib/db';

type Client = { id: string; name: string; company?: string | null };
type QuoteRow = {
  id: string;
  number?: string | null;
  area_m2?: number | null;
  sale_price?: number | null;
  status?: string | null;
  valid_until?: string | null;
  clients?: { name?: string | null } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

const statusColors: Record<string, string> = {
  RASCUNHO: '#6b7280',
  ENVIADO: '#0369a1',
  PENDENTE: '#b45309',
  ACEITE: '#15803d',
  RECUSADO: '#b91c1c',
  CANCELADO: '#4b5563',
  EXPIRADO: '#7c3aed',
};

export default function OrcamentosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    client_id: '',
    areaM2: '100',
    materialCostPerM2: '12',
    wastePct: '5',
    workers: '2',
    hours: '16',
    hourRate: '18',
    transport: '0',
    equipment: '0',
    other: '0',
    marginPct: '35',
    discountPct: '0',
    vatPct: '23',
    notes: '',
    valid_until: '',
  });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [quotesResult, clientsResult] = await Promise.all([listQuotes(), listClients()]);
      if (quotesResult.error) throw quotesResult.error;
      if (clientsResult.error) throw clientsResult.error;
      setQuotes((quotesResult.data || []) as QuoteRow[]);
      setClients((clientsResult.data || []) as Client[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar orçamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const result = useMemo(
    () => calcQuote({
      areaM2: Number(form.areaM2 || 0),
      materialCostPerM2: Number(form.materialCostPerM2 || 0),
      wastePct: Number(form.wastePct || 0),
      workers: Number(form.workers || 0),
      hours: Number(form.hours || 0),
      hourRate: Number(form.hourRate || 0),
      transport: Number(form.transport || 0),
      equipment: Number(form.equipment || 0),
      other: Number(form.other || 0),
      marginPct: Number(form.marginPct || 0),
      discountPct: Number(form.discountPct || 0),
      vatPct: Number(form.vatPct || 0),
    }),
    [form],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const quoteResult = await createQuote({
        client_id: form.client_id,
        area_m2: Number(form.areaM2 || 0),
        material_cost: result.material,
        labour_cost: result.labour,
        other_cost: Number(form.transport || 0) + Number(form.equipment || 0) + Number(form.other || 0),
        sale_price: result.net,
        margin_pct: result.margin,
        notes: form.notes || undefined,
        valid_until: form.valid_until || undefined,
        status: 'RASCUNHO',
      });
      if (quoteResult.error) throw quoteResult.error;
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar orçamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Orçamentos" subtitle="Calculadora comercial com gravação no Supabase.">
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
          <h2 style={{ marginTop: 0 }}>Novo orçamento</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>Cliente<select required value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}><option value="">Selecionar...</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` · ${client.company}` : ''}</option>)}</select></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>Área m²<input type="number" min="0" step="0.01" value={form.areaM2} onChange={(event) => setForm({ ...form, areaM2: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Material €/m²<input type="number" min="0" step="0.01" value={form.materialCostPerM2} onChange={(event) => setForm({ ...form, materialCostPerM2: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>Trab.<input type="number" min="0" value={form.workers} onChange={(event) => setForm({ ...form, workers: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Horas<input type="number" min="0" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>€/hora<input type="number" min="0" step="0.01" value={form.hourRate} onChange={(event) => setForm({ ...form, hourRate: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>Transporte<input type="number" min="0" step="0.01" value={form.transport} onChange={(event) => setForm({ ...form, transport: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Equipamento<input type="number" min="0" step="0.01" value={form.equipment} onChange={(event) => setForm({ ...form, equipment: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Outros<input type="number" min="0" step="0.01" value={form.other} onChange={(event) => setForm({ ...form, other: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>Desperdício %<input type="number" min="0" step="0.01" value={form.wastePct} onChange={(event) => setForm({ ...form, wastePct: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Margem %<input type="number" min="0" step="0.01" value={form.marginPct} onChange={(event) => setForm({ ...form, marginPct: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Desc. %<input type="number" min="0" step="0.01" value={form.discountPct} onChange={(event) => setForm({ ...form, discountPct: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>IVA %<input type="number" min="0" step="0.01" value={form.vatPct} onChange={(event) => setForm({ ...form, vatPct: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <label style={{ display: 'grid', gap: 6 }}>Válido até<input type="date" value={form.valid_until} onChange={(event) => setForm({ ...form, valid_until: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Notas<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }} /></label>
            <button type="submit" disabled={saving || !clients.length} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#101418', color: '#fff', cursor: 'pointer' }}>{saving ? 'A guardar...' : 'Guardar orçamento'}</button>
          </div>
        </form>

        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
            <h2 style={{ marginTop: 0 }}>Resumo calculado</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                ['Materiais', result.material],
                ['Mão de obra', result.labour],
                ['Custo total', result.cost],
                ['Preço líquido', result.net],
                ['Lucro', result.profit],
                ['Total c/ IVA', result.total],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{label}</div>
                  <div style={{ marginTop: 8, fontWeight: 700 }}>{formatCurrency(Number(value))}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h2 style={{ margin: 0 }}>Orçamentos guardados</h2></div>
            {loading ? <div style={{ padding: 20 }}>A carregar...</div> : quotes.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum orçamento registado.</div> : quotes.map((quote, index) => <div key={quote.id} style={{ padding: 18, borderTop: index ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}><div><div style={{ fontWeight: 700 }}>{quote.number || quote.id.slice(0, 8)} · {quote.clients?.name || 'Cliente'}</div><div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{quote.area_m2 ? `${quote.area_m2} m²` : '—'}{quote.valid_until ? ` · válido até ${quote.valid_until}` : ''}</div></div><div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{quote.sale_price ? formatCurrency(Number(quote.sale_price)) : '—'}</div><div style={{ color: statusColors[quote.status || 'RASCUNHO'] || '#6b7280', fontSize: 12, fontWeight: 700 }}>{quote.status || 'RASCUNHO'}</div></div></div>)}
          </section>
        </div>
      </div>
    </Layout>
  );
}
