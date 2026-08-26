'use client';
import { useEffect, useState } from 'react';
import { listCashMovements, createCashMovement } from '@/lib/db';
import Layout from '@/components/Layout';

type Movement = { id: string; type: string; amount: number; description: string; category?: string; date: string };

export default function Caixa() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outros');
  const [movDate, setMovDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const r = await listCashMovements(); if (r.error) throw r.error; setMovements((r.data || []) as Movement[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (amount === '' || !description) { setError('Preencher todos os campos'); return; }
    setSaving(true); setError('');
    try {
      const r = await createCashMovement({ type, amount: Number(amount), description, category, date: movDate });
      if (r.error) throw r.error;
      setOpen(false); setAmount(''); setDescription(''); setCategory('Outros'); setMovDate(new Date().toISOString().split('T')[0]); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  const total = movements.reduce((s, m) => s + (m.type === 'IN' ? m.amount : -m.amount), 0);
  const entradas = movements.filter(m => m.type === 'IN').reduce((s, m) => s + m.amount, 0);
  const saidas = movements.filter(m => m.type === 'OUT').reduce((s, m) => s + m.amount, 0);
  const fmt = (n: number) => `€${Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

  return (
    <Layout title="Caixa" subtitle="Controlo de entradas e saídas financeiras."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Registar movimento</button>}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Entradas', value: fmt(entradas), color: '#166534', icon: '📥' },
          { label: 'Saídas', value: fmt(saidas), color: '#991b1b', icon: '📤' },
          { label: 'Saldo', value: fmt(total), color: total >= 0 ? '#166534' : '#991b1b', icon: '💰' },
        ].map(t => (
          <div key={t.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div className="stat-label">{t.label}</div><div className="stat-value" style={{ color: t.color }}>{t.value}</div></div>
              <div className="stat-icon" style={{ fontSize: 20 }}>{t.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Registar movimento</h3>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-input" value={type} onChange={e => setType(e.target.value as 'IN' | 'OUT')}>
                    <option value="IN">Entrada</option>
                    <option value="OUT">Saída</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Valor (€) *</label><input required type="number" step="0.01" min="0" className="form-input" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group"><label className="form-label">Data *</label><input required type="date" className="form-input" value={movDate} onChange={e => setMovDate(e.target.value)} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Descrição *</label><input required className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Pagamento cliente X, Compra material..." /></div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                    {['Materiais', 'Mão de obra', 'Equipamentos', 'Transportes', 'Administrativo', 'Vendas', 'Outros'].map(c => <option key={c}>{c}</option>)}
                  </select>
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

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : movements.length === 0 ? (
        <div className="empty-state"><div className="emoji">💰</div><h3>Nenhum movimento registado</h3><p>Clique em &quot;+ Registar movimento&quot; para começar.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString('pt-PT')}</td>
                  <td style={{ fontWeight: 600 }}>{m.description}</td>
                  <td>{m.category ? <span className="badge badge-gray" style={{ textTransform: 'none' }}>{m.category}</span> : '—'}</td>
                  <td><span className={`badge ${m.type === 'IN' ? 'badge-green' : 'badge-red'}`}>{m.type === 'IN' ? 'Entrada' : 'Saída'}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: m.type === 'IN' ? '#166534' : '#991b1b' }}>{m.type === 'OUT' ? '−' : '+'}{fmt(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
