'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Layout from '@/components/Layout';
import { createVisit, listClients, listVisits } from '@/lib/db';

type Client = { id: string; name: string; company?: string | null };
type VisitRow = {
  id: string;
  date: string;
  address?: string | null;
  area_m2?: number | null;
  notes?: string | null;
  status?: string | null;
  clients?: { name?: string | null } | null;
};

export default function VisitasPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [address, setAddress] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [extras, setExtras] = useState('');
  const [notes, setNotes] = useState('');

  const area = useMemo(() => {
    const l = Number(length) || 0;
    const w = Number(width) || 0;
    const extraArea = Number(extras) || 0;
    return l * w + extraArea;
  }, [extras, length, width]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [visitsResult, clientsResult] = await Promise.all([listVisits(), listClients()]);
      if (visitsResult.error) throw visitsResult.error;
      if (clientsResult.error) throw clientsResult.error;
      setVisits((visitsResult.data || []) as VisitRow[]);
      setClients((clientsResult.data || []) as Client[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar visitas.');
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
      const result = await createVisit({
        client_id: clientId,
        date,
        address: address || undefined,
        area_m2: area || undefined,
        notes: notes || undefined,
        status: 'AGENDADA',
      });
      if (result.error) throw result.error;
      setClientId('');
      setAddress('');
      setLength('');
      setWidth('');
      setExtras('');
      setNotes('');
      setDate(new Date().toISOString().slice(0, 10));
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar visita.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Visitas" subtitle="Levantamentos, medições e agendamentos.">
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
          <h2 style={{ marginTop: 0 }}>Nova visita</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
              Cliente
              <select value={clientId} onChange={(event) => setClientId(event.target.value)} required style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}>
                <option value="">Selecionar...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}{client.company ? ` · ${client.company}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
              Data
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
              Morada
              <input value={address} onChange={(event) => setAddress(event.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                Comprimento
                <input type="number" min="0" step="0.01" value={length} onChange={(event) => setLength(event.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                Largura
                <input type="number" min="0" step="0.01" value={width} onChange={(event) => setWidth(event.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                Extras m²
                <input type="number" min="0" step="0.01" value={extras} onChange={(event) => setExtras(event.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
              </label>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, fontWeight: 700 }}>Área calculada: {area ? `${area.toFixed(2)} m²` : '—'}</div>
            <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
              Notas
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }} />
            </label>
            <button type="submit" disabled={saving || !clients.length} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#101418', color: '#fff', cursor: 'pointer', opacity: saving || !clients.length ? 0.7 : 1 }}>
              {saving ? 'A guardar...' : 'Guardar visita'}
            </button>
            {!clients.length && !loading ? <div style={{ color: '#b45309', fontSize: 13 }}>Crie um cliente primeiro para associar a visita.</div> : null}
          </div>
        </form>

        <section style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,.08)', overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0 }}>Histórico</h2>
          </div>
          {loading ? (
            <div style={{ padding: 20 }}>A carregar...</div>
          ) : visits.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhuma visita registada.</div>
          ) : (
            visits.map((visit, index) => (
              <div key={visit.id} style={{ padding: 18, borderTop: index ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{visit.clients?.name || 'Cliente sem nome'}</div>
                    <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{visit.date}{visit.address ? ` · ${visit.address}` : ''}</div>
                    {visit.notes ? <div style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>{visit.notes}</div> : null}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{visit.area_m2 ? `${Number(visit.area_m2).toFixed(2)} m²` : '—'}</div>
                    <div style={{ color: '#0284c7', fontSize: 12, marginTop: 4 }}>{visit.status || 'AGENDADA'}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </Layout>
  );
}
