'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import Layout from '@/components/Layout';
import { createProject, listClients, listProjects } from '@/lib/db';

type Client = { id: string; name: string; company?: string | null };
type ProjectRow = {
  id: string;
  number?: string | null;
  status?: string | null;
  area_m2?: number | null;
  sale_price?: number | null;
  planned_cost?: number | null;
  actual_cost?: number | null;
  clients?: { name?: string | null } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export default function ObrasPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ client_id: '', area_m2: '', sale_price: '', planned_cost: '', start_date: '' });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [projectsResult, clientsResult] = await Promise.all([listProjects(), listClients()]);
      if (projectsResult.error) throw projectsResult.error;
      if (clientsResult.error) throw clientsResult.error;
      setProjects((projectsResult.data || []) as ProjectRow[]);
      setClients((clientsResult.data || []) as Client[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar obras.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await createProject({
        client_id: form.client_id,
        area_m2: Number(form.area_m2 || 0),
        sale_price: Number(form.sale_price || 0),
        planned_cost: Number(form.planned_cost || 0),
        start_date: form.start_date || undefined,
        status: 'PLANEAMENTO',
      });
      if (result.error) throw result.error;
      setForm({ client_id: '', area_m2: '', sale_price: '', planned_cost: '', start_date: '' });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar obra.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Obras" subtitle="Acompanhamento operacional e financeiro das obras.">
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
          <h2 style={{ marginTop: 0 }}>Nova obra</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>Cliente<select required value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}><option value="">Selecionar...</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` · ${client.company}` : ''}</option>)}</select></label>
            <label style={{ display: 'grid', gap: 6 }}>Área m²<input required type="number" min="0" step="0.01" value={form.area_m2} onChange={(event) => setForm({ ...form, area_m2: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Preço de venda<input required type="number" min="0" step="0.01" value={form.sale_price} onChange={(event) => setForm({ ...form, sale_price: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Custo previsto<input required type="number" min="0" step="0.01" value={form.planned_cost} onChange={(event) => setForm({ ...form, planned_cost: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Data prevista de início<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <button type="submit" disabled={saving || !clients.length} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#101418', color: '#fff', cursor: 'pointer' }}>{saving ? 'A guardar...' : 'Criar obra'}</button>
          </div>
        </form>

        <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h2 style={{ margin: 0 }}>Obras registadas</h2></div>
          {loading ? (
            <div style={{ padding: 20 }}>A carregar...</div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhuma obra registada.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}><tr>{['Obra', 'Cliente', 'Área', 'Venda', 'Margem', 'Estado', ''].map((label) => <th key={label} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#6b7280' }}>{label}</th>)}</tr></thead>
                <tbody>
                  {projects.map((project) => {
                    const sale = Number(project.sale_price || 0);
                    const planned = Number(project.planned_cost || 0);
                    const margin = sale ? ((sale - planned) / sale) * 100 : 0;
                    return (
                      <tr key={project.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700 }}>{project.number || project.id.slice(0, 8)}</td>
                        <td style={{ padding: '14px 16px' }}>{project.clients?.name || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>{project.area_m2 ? `${project.area_m2} m²` : '—'}</td>
                        <td style={{ padding: '14px 16px' }}>{sale ? formatCurrency(sale) : '—'}</td>
                        <td style={{ padding: '14px 16px' }}>{sale ? `${margin.toFixed(1)}%` : '—'}</td>
                        <td style={{ padding: '14px 16px' }}>{project.status || 'PLANEAMENTO'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <Link href={`/obras/default?id=${project.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
