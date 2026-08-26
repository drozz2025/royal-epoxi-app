'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Layout from '@/components/Layout';
import { createMaterialMovement, listMaterialMovements, listMaterials } from '@/lib/db';

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  stock?: number | null;
  min_stock?: number | null;
};

type MovementRow = {
  id: string;
  type?: string | null;
  quantity?: number | null;
  reason?: string | null;
  created_at?: string | null;
  materials?: { name?: string | null } | null;
};

export default function StockPage() {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ material_id: '', type: 'OUT' as 'IN' | 'OUT', quantity: '', reason: '' });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [materialsResult, movementsResult] = await Promise.all([listMaterials(), listMaterialMovements()]);
      if (materialsResult.error) throw materialsResult.error;
      if (movementsResult.error) throw movementsResult.error;
      setMaterials((materialsResult.data || []) as MaterialRow[]);
      setMovements((movementsResult.data || []) as MovementRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar stock.');
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
      const result = await createMaterialMovement({
        material_id: form.material_id,
        type: form.type,
        quantity: Number(form.quantity || 0),
        reason: form.reason || undefined,
      });
      if (result.error) throw result.error;
      setForm({ material_id: '', type: 'OUT', quantity: '', reason: '' });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar movimento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Stock" subtitle="Níveis de stock e movimentos de materiais.">
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
          <h2 style={{ marginTop: 0 }}>Registar movimento</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>Material<select required value={form.material_id} onChange={(event) => setForm({ ...form, material_id: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}><option value="">Selecionar...</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label>
            <label style={{ display: 'grid', gap: 6 }}>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as 'IN' | 'OUT' })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}><option value="IN">Entrada</option><option value="OUT">Saída</option></select></label>
            <label style={{ display: 'grid', gap: 6 }}>Quantidade<input required type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Motivo<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <button type="submit" disabled={saving || !materials.length} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#101418', color: '#fff', cursor: 'pointer' }}>{saving ? 'A guardar...' : 'Guardar movimento'}</button>
          </div>
        </form>

        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h2 style={{ margin: 0 }}>Níveis de stock</h2></div>
            {loading ? <div style={{ padding: 20 }}>A carregar...</div> : materials.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Sem materiais registados.</div> : materials.map((material, index) => { const stock = Number(material.stock || 0); const minStock = Number(material.min_stock || 0); const low = stock <= minStock; return <div key={material.id} style={{ padding: 18, borderTop: index ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><div style={{ fontWeight: 700 }}>{material.name}</div><div style={{ color: '#6b7280', fontSize: 14 }}>{material.unit}</div></div><div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: low ? '#b91c1c' : undefined }}>{stock} {material.unit}</div><div style={{ color: low ? '#b91c1c' : '#6b7280', fontSize: 12 }}>{low ? `Abaixo do mínimo (${minStock})` : `Mínimo ${minStock}`}</div></div></div>; })}
          </section>

          <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h2 style={{ margin: 0 }}>Movimentos recentes</h2></div>
            {loading ? <div style={{ padding: 20 }}>A carregar...</div> : movements.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Sem movimentos registados.</div> : movements.map((movement, index) => <div key={movement.id} style={{ padding: 18, borderTop: index ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><div style={{ fontWeight: 700 }}>{movement.materials?.name || 'Material'}</div><div style={{ color: '#6b7280', fontSize: 14 }}>{movement.reason || 'Sem motivo'}</div></div><div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{movement.type} · {movement.quantity || 0}</div><div style={{ color: '#6b7280', fontSize: 12 }}>{movement.created_at ? new Date(movement.created_at).toLocaleDateString('pt-PT') : '—'}</div></div></div>)}
          </section>
        </div>
      </div>
    </Layout>
  );
}
