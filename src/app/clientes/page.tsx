'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Layout from '@/components/Layout';
import { createClient, listClients } from '@/lib/db';

type ClientRow = {
  id: string;
  name: string;
  company?: string | null;
  nif?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', company: '', nif: '', phone: '', email: '', address: '', notes: '' });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const result = await listClients();
      if (result.error) throw result.error;
      setClients((result.data || []) as ClientRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes.');
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
      const result = await createClient({
        name: form.name,
        company: form.company || undefined,
        nif: form.nif || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      if (result.error) throw result.error;
      setForm({ name: '', company: '', nif: '', phone: '', email: '', address: '', notes: '' });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Clientes" subtitle="Base de clientes e contactos comerciais.">
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
          <h2 style={{ marginTop: 0 }}>Novo cliente</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Empresa<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>NIF<input value={form.nif} onChange={(event) => setForm({ ...form, nif: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            </div>
            <label style={{ display: 'grid', gap: 6 }}>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Morada<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Notas<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }} /></label>
            <button type="submit" disabled={saving} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#101418', color: '#fff', cursor: 'pointer' }}>{saving ? 'A guardar...' : 'Criar cliente'}</button>
          </div>
        </form>

        <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h2 style={{ margin: 0 }}>Clientes registados</h2></div>
          {loading ? <div style={{ padding: 20 }}>A carregar...</div> : clients.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum cliente registado.</div> : clients.map((client, index) => <div key={client.id} style={{ padding: 18, borderTop: index ? '1px solid #f1f5f9' : 'none' }}><div style={{ fontWeight: 700 }}>{client.name}</div>{client.company ? <div style={{ color: '#374151', marginTop: 4 }}>{client.company}</div> : null}<div style={{ color: '#6b7280', fontSize: 14, marginTop: 6 }}>{[client.nif, client.phone, client.email].filter(Boolean).join(' · ') || 'Sem contactos adicionais'}</div>{client.address ? <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{client.address}</div> : null}{client.notes ? <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>{client.notes}</div> : null}</div>)}
        </section>
      </div>
    </Layout>
  );
}
