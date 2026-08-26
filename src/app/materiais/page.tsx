'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Layout from '@/components/Layout';
import { createMaterial, listMaterials, updateMaterial } from '@/lib/db';

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  cost: number;
  yield_per_unit?: number | null;
  waste_pct?: number | null;
  stock?: number | null;
  min_stock?: number | null;
};

function numberValue(value: string) {
  return value === '' ? undefined : Number(value);
}

export default function MateriaisPage() {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', cost: '', yield_per_unit: '', waste_pct: '5', stock: '', min_stock: '' });
  const [editForm, setEditForm] = useState({ name: '', unit: 'kg', cost: '', yield_per_unit: '', waste_pct: '0', stock: '', min_stock: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const result = await listMaterials();
      if (result.error) throw result.error;
      setMaterials((result.data || []) as MaterialRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar materiais.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await createMaterial({
        name: form.name,
        unit: form.unit,
        cost: Number(form.cost || 0),
        yield_per_unit: numberValue(form.yield_per_unit),
        waste_pct: numberValue(form.waste_pct),
        stock: numberValue(form.stock),
        min_stock: numberValue(form.min_stock),
      });
      if (result.error) throw result.error;
      setForm({ name: '', unit: 'kg', cost: '', yield_per_unit: '', waste_pct: '5', stock: '', min_stock: '' });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar material.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(material: MaterialRow) {
    setEditingId(material.id);
    setEditForm({
      name: material.name,
      unit: material.unit,
      cost: String(material.cost ?? ''),
      yield_per_unit: material.yield_per_unit == null ? '' : String(material.yield_per_unit),
      waste_pct: material.waste_pct == null ? '' : String(material.waste_pct),
      stock: material.stock == null ? '' : String(material.stock),
      min_stock: material.min_stock == null ? '' : String(material.min_stock),
    });
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError('');
    try {
      const result = await updateMaterial(editingId, {
        name: editForm.name,
        unit: editForm.unit,
        cost: Number(editForm.cost || 0),
        yield_per_unit: numberValue(editForm.yield_per_unit),
        waste_pct: numberValue(editForm.waste_pct),
        stock: numberValue(editForm.stock),
        min_stock: numberValue(editForm.min_stock),
      });
      if (result.error) throw result.error;
      setEditingId(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar material.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Materiais" subtitle="Custos, rendimentos e níveis de stock.">
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={editingId ? handleUpdate : handleCreate} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
          <h2 style={{ marginTop: 0 }}>{editingId ? 'Editar material' : 'Novo material'}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>Nome<input required value={editingId ? editForm.name : form.name} onChange={(event) => editingId ? setEditForm({ ...editForm, name: event.target.value }) : setForm({ ...form, name: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>Unidade<select value={editingId ? editForm.unit : form.unit} onChange={(event) => editingId ? setEditForm({ ...editForm, unit: event.target.value }) : setForm({ ...form, unit: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}><option value="kg">kg</option><option value="L">L</option><option value="m²">m²</option><option value="m">m</option><option value="un">un</option></select></label>
              <label style={{ display: 'grid', gap: 6 }}>Custo<input required type="number" min="0" step="0.01" value={editingId ? editForm.cost : form.cost} onChange={(event) => editingId ? setEditForm({ ...editForm, cost: event.target.value }) : setForm({ ...form, cost: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>Rendimento<input type="number" min="0" step="0.01" value={editingId ? editForm.yield_per_unit : form.yield_per_unit} onChange={(event) => editingId ? setEditForm({ ...editForm, yield_per_unit: event.target.value }) : setForm({ ...form, yield_per_unit: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Desperdício %<input type="number" min="0" step="0.01" value={editingId ? editForm.waste_pct : form.waste_pct} onChange={(event) => editingId ? setEditForm({ ...editForm, waste_pct: event.target.value }) : setForm({ ...form, waste_pct: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>Stock<input type="number" min="0" step="0.01" value={editingId ? editForm.stock : form.stock} onChange={(event) => editingId ? setEditForm({ ...editForm, stock: event.target.value }) : setForm({ ...form, stock: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Stock mínimo<input type="number" min="0" step="0.01" value={editingId ? editForm.min_stock : form.min_stock} onChange={(event) => editingId ? setEditForm({ ...editForm, min_stock: event.target.value }) : setForm({ ...form, min_stock: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#101418', color: '#fff', cursor: 'pointer' }}>{saving ? 'A guardar...' : editingId ? 'Atualizar' : 'Criar material'}</button>
              {editingId ? <button type="button" onClick={() => setEditingId(null)} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' }}>Cancelar</button> : null}
            </div>
          </div>
        </form>

        <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h2 style={{ margin: 0 }}>Materiais registados</h2></div>
          {loading ? (
            <div style={{ padding: 20 }}>A carregar...</div>
          ) : materials.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum material registado.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Material', 'Un.', 'Custo', 'Rendimento', 'Stock', 'Mínimo', ''].map((label) => (
                      <th key={label} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#6b7280' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => {
                    const stock = Number(material.stock || 0);
                    const minStock = Number(material.min_stock || 0);
                    const low = stock <= minStock;
                    return (
                      <tr key={material.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700 }}>{material.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>Desperdício: {material.waste_pct ?? 0}%</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>{material.unit}</td>
                        <td style={{ padding: '14px 16px' }}>€{Number(material.cost || 0).toFixed(2)}</td>
                        <td style={{ padding: '14px 16px' }}>{material.yield_per_unit ? `${material.yield_per_unit} m²/${material.unit}` : '—'}</td>
                        <td style={{ padding: '14px 16px', color: low ? '#b91c1c' : undefined, fontWeight: low ? 700 : 400 }}>{stock} {material.unit}{low ? ' · Baixo' : ''}</td>
                        <td style={{ padding: '14px 16px' }}>{minStock} {material.unit}</td>
                        <td style={{ padding: '14px 16px' }}><button type="button" onClick={() => startEdit(material)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Editar</button></td>
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
