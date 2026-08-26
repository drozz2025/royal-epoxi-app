'use client';
import { useEffect, useState } from 'react';
import { listMaterials, createMaterial } from '@/lib/db';
import Layout from '@/components/Layout';

type Material = { id: string; name: string; unit: string; cost: number; yield_per_unit?: number; stock?: number; min_stock?: number };

export default function Materiais() {
  const [items, setItems] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [fUnit, setFUnit] = useState('kg');
  const [fCost, setFCost] = useState<number | ''>('');
  const [fYield, setFYield] = useState<number | ''>('');
  const [fMinStock, setFMinStock] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const r = await listMaterials(); if (r.error) throw r.error; setItems((r.data || []) as Material[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (fCost === '') { setError('Custo é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const r = await createMaterial({ name: fName, unit: fUnit, cost: Number(fCost), yield_per_unit: fYield !== '' ? Number(fYield) : undefined, min_stock: fMinStock !== '' ? Number(fMinStock) : undefined });
      if (r.error) throw r.error;
      setOpen(false); setFName(''); setFUnit('kg'); setFCost(''); setFYield(''); setFMinStock(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  return (
    <Layout title="Materiais" subtitle="Catálogo de materiais, custos e rendimentos."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Novo material</button>}>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Novo material</h3>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nome *</label>
                  <input required className="form-input" value={fName} onChange={e => setFName(e.target.value)} placeholder="Ex: Resina Epóxi Base" />
                </div>
                <div className="form-group"><label className="form-label">Unidade</label>
                  <select className="form-input" value={fUnit} onChange={e => setFUnit(e.target.value)}>
                    {['kg', 'L', 'un', 'm²', 'm', 'cx'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Custo/unidade (€) *</label><input required type="number" step="0.01" min="0" className="form-input" value={fCost} onChange={e => setFCost(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group"><label className="form-label">Rendimento (m²/unid.)</label><input type="number" step="0.1" min="0" className="form-input" value={fYield} onChange={e => setFYield(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group"><label className="form-label">Stock mínimo</label><input type="number" step="1" min="0" className="form-input" value={fMinStock} onChange={e => setFMinStock(e.target.value ? Number(e.target.value) : '')} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : items.length === 0 ? (
        <div className="empty-state"><div className="emoji">🧴</div><h3>Nenhum material registado</h3><p>Clique em &quot;+ Novo material&quot; para adicionar.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Nome</th><th>Unid.</th><th>Custo</th><th>Rend. m²</th><th>Stock</th><th>Mín.</th><th>Alerta</th></tr></thead>
            <tbody>
              {items.map(m => {
                const low = m.min_stock !== undefined && (m.stock ?? 0) <= m.min_stock;
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.unit}</td>
                    <td style={{ fontWeight: 600 }}>€{Number(m.cost).toFixed(2)}</td>
                    <td>{m.yield_per_unit ? `${m.yield_per_unit} m²` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{m.stock ?? 0}</td>
                    <td>{m.min_stock ?? '—'}</td>
                    <td>{low ? <span className="badge badge-red">Stock baixo</span> : <span className="badge badge-green">OK</span>}</td>
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
