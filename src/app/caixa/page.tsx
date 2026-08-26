'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Layout from '@/components/Layout';
import { createCashMovement, listCashMovements } from '@/lib/db';

type CashMovement = {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  category?: string | null;
  amount?: number | null;
  description?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function CaixaPage() {
  const [rows, setRows] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'IN' as 'IN' | 'OUT', category: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const result = await listCashMovements();
      if (result.error) throw result.error;
      setRows((result.data || []) as CashMovement[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar caixa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const entradas = rows.filter((row) => row.type === 'IN').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const saidas = rows.filter((row) => row.type === 'OUT').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await createCashMovement({
        type: form.type,
        category: form.category,
        amount: Number(form.amount || 0),
        description: form.description,
        date: form.date,
      });
      if (result.error) throw result.error;
      setForm({ type: 'IN', category: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar movimento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Caixa" subtitle="Registo rápido de entradas e saídas.">
      <div style={{ marginBottom: 18, fontSize: 14 }}>
        <Link href="/financeiro" style={{ color: '#2563eb', textDecoration: 'none' }}>Abrir visão financeira completa →</Link>
      </div>
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        {[
          ['Entradas', totals.entradas],
          ['Saídas', totals.saidas],
          ['Saldo', totals.saldo],
        ].map(([label, value]) => <div key={label} style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}><div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div><div style={{ marginTop: 8, fontSize: 26, fontWeight: 700 }}>{formatCurrency(Number(value))}</div></div>)}
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
          <h2 style={{ marginTop: 0 }}>Novo movimento</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as 'IN' | 'OUT' })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}><option value="IN">IN</option><option value="OUT">OUT</option></select></label>
            <label style={{ display: 'grid', gap: 6 }}>Categoria<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Montante<input required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Descrição<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Data<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <button type="submit" disabled={saving} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#101418', color: '#fff', cursor: 'pointer' }}>{saving ? 'A guardar...' : 'Guardar movimento'}</button>
          </div>
        </form>

        <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h2 style={{ margin: 0 }}>Movimentos</h2></div>
          {loading ? <div style={{ padding: 20 }}>A carregar...</div> : rows.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Sem movimentos registados.</div> : rows.map((row, index) => <div key={row.id} style={{ padding: 18, borderTop: index ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><div style={{ fontWeight: 700 }}>{row.description}</div><div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{row.date} · {row.category || 'Sem categoria'}</div></div><div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: row.type === 'IN' ? '#15803d' : '#b91c1c' }}>{row.type === 'IN' ? '+' : '-'}{formatCurrency(Number(row.amount || 0))}</div><div style={{ color: '#6b7280', fontSize: 12 }}>{row.type}</div></div></div>)}
        </section>
      </div>
    </Layout>
  );
}
