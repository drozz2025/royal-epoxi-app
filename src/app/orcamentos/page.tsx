'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listQuotes, createQuote, listClients } from '@/lib/db';
import Layout from '@/components/Layout';

type Quote = { id: string; number?: string; status: string; area_m2?: number; sale_price?: number; direct_cost?: number; clients?: { name: string } };
type Client = { id: string; name: string; company?: string };

const statusBadge: Record<string, string> = { RASCUNHO: 'badge-gray', ENVIADO: 'badge-blue', APROVADO: 'badge-green', REJEITADO: 'badge-red', CANCELADO: 'badge-gray' };
const statusLabel: Record<string, string> = { RASCUNHO: 'Rascunho', ENVIADO: 'Enviado', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado', CANCELADO: 'Cancelado' };

export default function Orcamentos() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [area, setArea] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [directCost, setDirectCost] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const [q, c] = await Promise.all([listQuotes(), listClients()]); if (q.error) throw q.error; if (c.error) throw c.error; setQuotes((q.data || []) as Quote[]); setClients((c.data || []) as Client[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!clientId) { setError('Selecionar cliente'); return; }
    setSaving(true); setError('');
    try {
      const r = await createQuote({ client_id: clientId, area_m2: area !== '' ? Number(area) : undefined, sale_price: salePrice !== '' ? Number(salePrice) : 0, material_cost: directCost !== '' ? Number(directCost) : undefined, notes: notes || undefined });
      if (r.error) throw r.error;
      setOpen(false); setClientId(''); setArea(''); setSalePrice(''); setDirectCost(''); setNotes(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  const fmt = (n: number) => `€${Number(n).toLocaleString('pt-PT')}`;

  return (
    <Layout title="Orçamentos" subtitle="Criação e gestão de orçamentos profissionais."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Novo orçamento</button>}>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Novo orçamento</h3>
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
                <div className="form-group"><label className="form-label">Custo direto (€)</label><input type="number" step="0.01" min="0" className="form-input" value={directCost} onChange={e => setDirectCost(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Notas</label><input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
              </div>
              {salePrice !== '' && directCost !== '' && Number(salePrice) > 0 && (
                <div className="alert alert-success" style={{ marginTop: 12 }}>
                  💹 Margem estimada: <strong>{((Number(salePrice) - Number(directCost)) / Number(salePrice) * 100).toFixed(1)}%</strong> — Lucro: <strong>{fmt(Number(salePrice) - Number(directCost))}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : quotes.length === 0 ? (
        <div className="empty-state"><div className="emoji">📄</div><h3>Nenhum orçamento criado</h3><p>Clique em &quot;+ Novo orçamento&quot; para começar.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Referência</th><th>Cliente</th><th>Área</th><th>Venda</th><th>Custo</th><th>Margem</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {quotes.map(q => {
                const m = q.sale_price && q.direct_cost ? (q.sale_price - q.direct_cost) / q.sale_price * 100 : null;
                return (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{q.number || q.id.slice(0, 8)}</td>
                    <td style={{ fontWeight: 600 }}>{q.clients?.name || '—'}</td>
                    <td>{q.area_m2 ? `${q.area_m2} m²` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{q.sale_price ? fmt(q.sale_price) : '—'}</td>
                    <td>{q.direct_cost ? fmt(q.direct_cost) : '—'}</td>
                    <td>{m !== null ? <span style={{ fontWeight: 700, color: m >= 30 ? '#166534' : m >= 15 ? '#854d0e' : '#991b1b' }}>{m.toFixed(1)}%</span> : '—'}</td>
                    <td><span className={`badge ${statusBadge[q.status] || 'badge-gray'}`}>{statusLabel[q.status] || q.status}</span></td>
                    <td><Link href={`/orcamentos/imprimir?id=${q.id}`} style={{ color: '#2563eb', fontSize: 13, fontWeight: 600 }}>PDF →</Link></td>
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
