'use client';
import { useEffect, useState } from 'react';
import { listVisits, createVisit, listClients } from '@/lib/db';
import Layout from '@/components/Layout';

type Visit = { id: string; date: string; status: string; notes?: string; clients?: { name: string } };
type Client = { id: string; name: string; company?: string };

const statusBadge: Record<string, string> = { AGENDADA: 'badge-blue', CONCLUIDA: 'badge-green', CANCELADA: 'badge-gray' };
const statusLabel: Record<string, string> = { AGENDADA: 'Agendada', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };

export default function Visitas() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const [v, c] = await Promise.all([listVisits(), listClients()]); if (v.error) throw v.error; if (c.error) throw c.error; setVisits((v.data || []) as Visit[]); setClients((c.data || []) as Client[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!clientId || !visitDate) { setError('Preencher campos obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      const r = await createVisit({ client_id: clientId, date: visitDate, notes: notes || undefined });
      if (r.error) throw r.error;
      setOpen(false); setClientId(''); setVisitDate(''); setNotes(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  return (
    <Layout title="Visitas" subtitle="Agendamento e histórico de visitas a clientes."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Nova visita</button>}>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Nova visita</h3>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Cliente *</label>
                  <select required className="form-input" value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data *</label>
                  <input required type="date" className="form-input" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações da visita..." style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : visits.length === 0 ? (
        <div className="empty-state"><div className="emoji">📅</div><h3>Nenhuma visita registada</h3><p>Clique em &quot;+ Nova visita&quot; para agendar.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Data</th><th>Cliente</th><th>Notas</th><th>Estado</th></tr></thead>
            <tbody>
              {visits.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{new Date(v.date).toLocaleDateString('pt-PT')}</td>
                  <td>{v.clients?.name || '—'}</td>
                  <td style={{ color: '#6b7280', maxWidth: 280 }}>{v.notes || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td><span className={`badge ${statusBadge[v.status] || 'badge-gray'}`}>{statusLabel[v.status] || v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
