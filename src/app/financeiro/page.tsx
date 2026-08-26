'use client';
import { useEffect, useState } from 'react';
import { listPayments, createPayment, listProjects } from '@/lib/db';
import Layout from '@/components/Layout';

type Payment = { id: string; amount: number; payment_method?: string; payment_date: string; notes?: string; projects?: { number?: string; clients?: { name: string } } };
type Project = { id: string; number?: string; clients?: { name: string } };

export default function Financeiro() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const [p, pr] = await Promise.all([listPayments(), listProjects()]); if (p.error) throw p.error; if (pr.error) throw pr.error; setPayments((p.data || []) as Payment[]); setProjects((pr.data || []) as Project[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!projectId || amount === '') { setError('Preencher campos obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      const r = await createPayment({ project_id: projectId, amount: Number(amount), method: method || undefined, payment_date: payDate, notes: notes || undefined });
      if (r.error) throw r.error;
      setOpen(false); setProjectId(''); setAmount(''); setMethod(''); setPayDate(new Date().toISOString().split('T')[0]); setNotes(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const fmt = (n: number) => `€${Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

  return (
    <Layout title="Financeiro" subtitle="Registo de pagamentos recebidos por obra."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Registar pagamento</button>}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total recebido</div><div className="stat-value" style={{ color: '#166534' }}>{fmt(total)}</div><div className="stat-sub">{payments.length} pagamentos registados</div></div>
        <div className="stat-card"><div className="stat-label">Obras com pagamento</div><div className="stat-value">{new Set(payments.map(p => p.projects?.number || p.id)).size}</div><div className="stat-sub">obras distintas</div></div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Registar pagamento</h3>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Obra *</label>
                  <select required className="form-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.number || p.id.slice(0, 8)} — {p.clients?.name || 'N/A'}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Valor (€) *</label><input required type="number" step="0.01" min="0" className="form-input" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group"><label className="form-label">Data *</label><input required type="date" className="form-input" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
                <div className="form-group">
                  <label className="form-label">Método</label>
                  <select className="form-input" value={method} onChange={e => setMethod(e.target.value)}>
                    <option value="">— Selecionar —</option>
                    {['Transferência', 'Multibanco', 'Numerário', 'MB Way', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
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

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : payments.length === 0 ? (
        <div className="empty-state"><div className="emoji">💳</div><h3>Nenhum pagamento registado</h3><p>Clique em &quot;+ Registar pagamento&quot; para começar.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Data</th><th>Obra</th><th>Cliente</th><th>Método</th><th style={{ textAlign: 'right' }}>Valor</th><th>Notas</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleDateString('pt-PT')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{p.projects?.number || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{p.projects?.clients?.name || '—'}</td>
                  <td>{p.payment_method ? <span className="badge badge-blue" style={{ textTransform: 'none' }}>{p.payment_method}</span> : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(p.amount)}</td>
                  <td style={{ color: '#6b7280' }}>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
