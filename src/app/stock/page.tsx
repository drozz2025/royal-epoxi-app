'use client';
import { useEffect, useState } from 'react';
import { listMaterialMovements, createMaterialMovement, listMaterials } from '@/lib/db';
import Layout from '@/components/Layout';

type Mov = { id: string; type: string; quantity: number; unit_cost?: number; notes?: string; reason?: string; created_at: string; materials?: { name: string; unit: string } };
type Material = { id: string; name: string; unit: string; stock?: number; min_stock?: number };

export default function Stock() {
  const [movements, setMovements] = useState<Mov[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [materialId, setMaterialId] = useState('');
  const [movType, setMovType] = useState('IN');
  const [qty, setQty] = useState<number | ''>('');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const [mv, mt] = await Promise.all([listMaterialMovements(), listMaterials()]); if (mv.error) throw mv.error; if (mt.error) throw mt.error; setMovements((mv.data || []) as Mov[]); setMaterials((mt.data || []) as Material[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!materialId || qty === '') { setError('Preencher campos obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      const r = await createMaterialMovement({ material_id: materialId, type: movType as 'IN' | 'OUT', quantity: Number(qty), reason: notes || undefined });
      if (r.error) throw r.error;
      setOpen(false); setMaterialId(''); setQty(''); setUnitCost(''); setNotes(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  const lowStock = materials.filter(m => m.min_stock !== undefined && (m.stock ?? 0) <= m.min_stock);

  return (
    <Layout title="Stock" subtitle="Controlo de movimentos e inventário de materiais."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Registar movimento</button>}>

      {lowStock.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          ⚠️ <strong>{lowStock.length} material(is) com stock baixo:</strong> {lowStock.map(m => m.name).join(', ')}
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Novo movimento de stock</h3>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Material *</label>
                  <select required className="form-input" value={materialId} onChange={e => setMaterialId(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} (stock: {m.stock ?? 0} {m.unit})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-input" value={movType} onChange={e => setMovType(e.target.value)}>
                    <option value="IN">Entrada</option>
                    <option value="OUT">Saída</option>
                    
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Quantidade *</label><input required type="number" step="0.1" min="0" className="form-input" value={qty} onChange={e => setQty(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="form-group"><label className="form-label">Custo unitário (€)</label><input type="number" step="0.01" min="0" className="form-input" value={unitCost} onChange={e => setUnitCost(e.target.value ? Number(e.target.value) : '')} /></div>
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

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : movements.length === 0 ? (
        <div className="empty-state"><div className="emoji">📦</div><h3>Nenhum movimento registado</h3><p>Clique em &quot;+ Registar movimento&quot; para começar.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Data</th><th>Material</th><th>Tipo</th><th>Qtd</th><th>Custo unit.</th><th>Notas</th></tr></thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleDateString('pt-PT')}</td>
                  <td style={{ fontWeight: 600 }}>{m.materials?.name || '—'}</td>
                  <td><span className={`badge ${m.type === 'IN' ? 'badge-green' : 'badge-red'}`}>{m.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{m.quantity} {m.materials?.unit || ''}</td>
                  <td>{m.unit_cost ? `€${Number(m.unit_cost).toFixed(2)}` : '—'}</td>
                  <td style={{ color: '#6b7280', maxWidth: 200 }}>{m.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
