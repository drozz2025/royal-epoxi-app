'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listProjects, createProject, listClients } from '@/lib/db';
import Layout from '@/components/Layout';

type Project = { id: string; number?: string; status: string; area_m2: number; sale_price: number; planned_cost: number; actual_cost: number; clients?: { name: string } };
type Client = { id: string; name: string; company?: string };

const statusBadge: Record<string, string> = { PLANEAMENTO: 'badge-blue', AGENDADA: 'badge-yellow', EM_OBRA: 'badge-green', PAUSADA: 'badge-red', CONCLUIDA: 'badge-gray', CANCELADA: 'badge-gray' };
const statusLabel: Record<string, string> = { PLANEAMENTO: 'Planeamento', AGENDADA: 'Agendada', EM_OBRA: 'Em obra', PAUSADA: 'Pausada', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };

export default function Obras() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [area, setArea] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [plannedCost, setPlannedCost] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const [p, c] = await Promise.all([listProjects(), listClients()]); if (p.error) throw p.error; if (c.error) throw c.error; setProjects((p.data || []) as Project[]); setClients((c.data || []) as Client[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!clientId) { setError('Selecionar cliente'); return; }
    setSaving(true); setError('');
    try {
      const r = await createProject({ client_id: clientId, area_m2: area !== '' ? Number(area) : undefined, sale_price: salePrice !== '' ? Number(salePrice) : undefined, planned_cost: plannedCost !== '' ? Number(plannedCost) : undefined, notes: notes || undefined });
      if (r.error) throw r.error;
      setOpen(false); setClientId(''); setArea(''); setSalePrice(''); setPlannedCost(''); setNotes(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  const fmt = (n: number) => `€${Number(n).toLocaleString('pt-PT')}`;

  return (
    <Layout title="Obras" subtitle="Controlo de obras, custos e rentabilidade."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Nova obra</button>}>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Nova obra</h3>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Cliente *</label>
                  <select required className="form-input" value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Área (m²)</label><input type="number" step="0.1" min="0" className="form-input" value={area} onChange={e => setArea(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group"><label className="form-label">Preço de venda (€)</label><input type="number" step="0.01" min="0" className="form-input" value={salePrice} onChange={e => setSalePrice(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group"><label className="form-label">Custo previsto (€)</label><input type="number" step="0.01" min="0" className="form-input" value={plannedCost} onChange={e => setPlannedCost(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Notas</label><input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : projects.length === 0 ? (
        <div className="empty-state"><div className="emoji">🏗️</div><h3>Nenhuma obra registada</h3><p>Clique em &quot;+ Nova obra&quot; para começar.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Referência</th><th>Cliente</th><th>Área</th><th>Venda</th><th>Custo prev.</th><th>Margem</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {projects.map(p => {
                const m = p.sale_price && p.planned_cost ? (p.sale_price - p.planned_cost) / p.sale_price * 100 : null;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{p.number || p.id.slice(0, 8)}</td>
                    <td style={{ fontWeight: 600 }}>{p.clients?.name || '—'}</td>
                    <td>{p.area_m2 ? `${p.area_m2} m²` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{p.sale_price ? fmt(p.sale_price) : '—'}</td>
                    <td>{p.planned_cost ? fmt(p.planned_cost) : '—'}</td>
                    <td>{m !== null ? <span style={{ fontWeight: 700, color: m >= 30 ? '#166534' : m >= 15 ? '#854d0e' : '#991b1b' }}>{m.toFixed(1)}%</span> : '—'}</td>
                    <td><span className={`badge ${statusBadge[p.status] || 'badge-gray'}`}>{statusLabel[p.status] || p.status}</span></td>
                    <td><Link href={`/obras/${p.id}`} style={{ color: '#2563eb', fontSize: 13, fontWeight: 600 }}>Ver →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
